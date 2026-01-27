/**
 * Module pour fusionner les positions EPUB avec le contenu/styles IDML
 * 
 * Architecture :
 * - EPUB : fournit uniquement les positions (x, y, width, height) des zones de texte
 * - IDML : fournit le contenu textuel, les polices et TOUS les styles
 * 
 * ⚠️ IMPORTANT : Les polices doivent OBLIGATOIREMENT être dans l'IDML.
 * Le CSS de l'EPUB n'est JAMAIS utilisé comme fallback pour les polices.
 * 
 * Ce module associe chaque position EPUB avec le texte et les styles correspondants de l'IDML.
 */

/**
 * Résout un ID de style en gérant les préfixes "CharacterStyle/" et "ParagraphStyle/"
 * Les TextFrames peuvent référencer les styles avec ou sans préfixe, alors que les dictionnaires
 * sont indexés par @_Self (souvent sans préfixe).
 */
function resolveStyleId(
  map: Record<string, any>,
  styleId: string | undefined,
  prefix: "CharacterStyle/" | "ParagraphStyle/"
): string | undefined {
  if (!styleId) return undefined;
  // Essai direct
  if (map[styleId]) return styleId;
  // Essai en retirant le préfixe
  if (styleId.startsWith(prefix)) {
    const noPrefix = styleId.replace(prefix, "");
    if (map[noPrefix]) return noPrefix;
  } else {
    // Essai en ajoutant le préfixe
    const withPrefix = `${prefix}${styleId}`;
    if (map[withPrefix]) return withPrefix;
  }
  return undefined;
}

/**
 * Résout le style complet d'un segment conditionnel
 * Combine CharacterStyle, inline properties, et fallback sur ParagraphStyle
 * 
 * IMPORTANT : Un CharacterStyle peut ne PAS avoir toutes les propriétés définies.
 * Dans ce cas, il doit hériter du ParagraphStyle (selon la doc IDML officielle).
 */
function resolveSegmentStyle(
  segment: any,
  characterStyles: Record<string, any>,
  paragraphStyles: Record<string, any>,
  colors: Record<string, string>,
  globalParagraphStyleId?: string
): any {
  // #region agent log
  fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlMerger.ts:resolveSegmentStyle:ENTRY',message:'Function entry',data:{segmentText:segment.text?.substring(0,20),appliedCharStyle:segment.appliedCharacterStyle,hasInlineProps:!!segment.inlineCharProperties,inlineFillColor:segment.inlineCharProperties?.fillColor},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H4'})}).catch(()=>{});
  // #endregion
  
  // 1. Résoudre le CharacterStyle du segment
  const resolvedCharId = resolveStyleId(
    characterStyles,
    segment.appliedCharacterStyle,
    "CharacterStyle/"
  );
  
  let charStyle = resolvedCharId && characterStyles[resolvedCharId]
    ? { ...characterStyles[resolvedCharId] }
    : {};
  
  // #region agent log
  fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlMerger.ts:resolveSegmentStyle:AFTER_CHARSTYLE',message:'CharStyle resolved',data:{resolvedCharId,charStyleColor:charStyle.color,charStyleFontSize:charStyle.fontSize,charStyleFontFamily:charStyle.fontFamily},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
  // #endregion
  
  // 2. Résoudre le ParagraphStyle global pour l'héritage
  let paraStyle: any = {};
  if (globalParagraphStyleId) {
    const resolvedParaId = resolveStyleId(
      paragraphStyles,
      globalParagraphStyleId,
      "ParagraphStyle/"
    );
    
    paraStyle = resolvedParaId && paragraphStyles[resolvedParaId]
      ? paragraphStyles[resolvedParaId]
      : {};
  }
  
  // 3. Appliquer les propriétés inline du segment (priorité maximale)
  if (segment.inlineCharProperties) {
    const inline = segment.inlineCharProperties;
    
    if (inline.fontFamily) charStyle.fontFamily = inline.fontFamily;
    if (inline.fontSize) charStyle.fontSize = inline.fontSize;
    if (inline.fontWeight) charStyle.fontWeight = inline.fontWeight;
    if (inline.fontStyle) charStyle.fontStyle = inline.fontStyle;
    if (inline.letterSpacing !== undefined) charStyle.letterSpacing = inline.letterSpacing;
    if (inline.horizontalScale !== undefined) charStyle.horizontalScale = inline.horizontalScale;
    if (inline.verticalScale !== undefined) charStyle.verticalScale = inline.verticalScale;
    if (inline.skew !== undefined) charStyle.skew = inline.skew;
    
    if (inline.fillColor) {
      const colorHex = colors[inline.fillColor];
      
      // #region agent log
      fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlMerger.ts:resolveSegmentStyle:INLINE_COLOR',message:'Inline color resolution',data:{fillColorRef:inline.fillColor,colorHex,isPaper:colorHex==='#77ff88',availableColorKeys:Object.keys(colors).filter(k=>k.includes('u14')).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4,H5'})}).catch(()=>{});
      // #endregion
      
      if (colorHex) charStyle.color = colorHex;
    }
  }
  
  // 4. Héritage depuis le ParagraphStyle pour les propriétés manquantes
  // CRITIQUE : C'est ICI que le bug se trouvait - les propriétés manquantes 
  // du CharacterStyle doivent être héritées du ParagraphStyle
  
  // #region agent log
  fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlMerger.ts:resolveSegmentStyle:BEFORE_INHERIT',message:'Before inheritance',data:{charStyleColor:charStyle.color,hasExplicitColor:resolvedCharId&&characterStyles[resolvedCharId]&&characterStyles[resolvedCharId].color,isNoCharStyle:segment.appliedCharacterStyle?.includes('[No character style]'),paraColor:paraStyle.paraColor},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3,H10'})}).catch(()=>{});
  // #endregion
  
  if (!charStyle.fontFamily && paraStyle.fontFamily) {
    charStyle.fontFamily = paraStyle.fontFamily;
  }
  
  // BUGFIX: fontSize=12 est la valeur par défaut du parser, pas une valeur intentionnelle
  // Si le CharacterStyle a fontSize=12 ET que le ParagraphStyle a un fontSize différent,
  // c'est que le CharacterStyle n'a PAS de fontSize défini → hériter du ParagraphStyle
  if ((!charStyle.fontSize || charStyle.fontSize === 12) && paraStyle.fontSize && paraStyle.fontSize !== 12) {
    charStyle.fontSize = paraStyle.fontSize;
  }
  
  if (!charStyle.fontWeight && paraStyle.fontWeight) {
    charStyle.fontWeight = paraStyle.fontWeight;
  }
  if (!charStyle.fontStyle && paraStyle.fontStyle) {
    charStyle.fontStyle = paraStyle.fontStyle;
  }
  
  // BUGFIX: Hériter textTransform du ParagraphStyle si non défini
  if (!charStyle.textTransform && paraStyle.paraTextTransform) {
    charStyle.textTransform = paraStyle.paraTextTransform;
  }
  
  // BUGFIX: Hériter horizontalScale du ParagraphStyle si non défini
  if (!charStyle.horizontalScale && paraStyle.paraHorizontalScale) {
    charStyle.horizontalScale = paraStyle.paraHorizontalScale;
  }
  
  // BUGFIX: Hériter strokeColor/strokeWeight du ParagraphStyle si non défini
  if (!charStyle.strokeColor && paraStyle.paraStrokeColor) {
    charStyle.strokeColor = paraStyle.paraStrokeColor;
  }
  if (!charStyle.strokeWeight && paraStyle.paraStrokeWeight) {
    charStyle.strokeWeight = paraStyle.paraStrokeWeight;
  }
  
  // BUGFIX CRITIQUE: Gestion de l'héritage de couleur
  // RÈGLE: On hérite du ParagraphStyle UNIQUEMENT si le CharacterStyle n'a PAS de couleur définie
  // 
  // CAS 1: [No character style] avec noir #000000 → c'est la couleur par défaut, hériter du ParagraphStyle
  // CAS 2: Style personnalisé avec Paper (#ffffff) EXPLICITE → GARDER le blanc (c'est intentionnel)
  // CAS 3: Pas de couleur définie → hériter du ParagraphStyle
  //
  // Comment différencier CAS 1 et CAS 2 ?
  // → Si le style est "[No character style]", le noir/blanc est par défaut → hériter
  // → Si le style est personnalisé ET a une fillColor définie dans l'IDML, GARDER cette couleur
  
  const isNoCharacterStyle = segment.appliedCharacterStyle?.includes('[No character style]');
  
  // Pour [No character style], toujours hériter du ParagraphStyle (noir par défaut n'est pas intentionnel)
  if (isNoCharacterStyle && paraStyle.paraColor) {
    charStyle.color = paraStyle.paraColor;
    
    // #region agent log
    fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlMerger.ts:resolveSegmentStyle:INHERIT_NO_CHAR_STYLE',message:'[No character style] inherits from ParagraphStyle',data:{wasColor:charStyle.color,newColor:paraStyle.paraColor},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H9,H10'})}).catch(()=>{});
    // #endregion
  }
  
  // Pour les styles personnalisés, GARDER la couleur (même si c'est Paper/blanc)
  // L'utilisateur a explicitement défini FillColor="Paper" dans InDesign
  if (!charStyle.textTransform && paraStyle.paraTextTransform) {
    charStyle.textTransform = paraStyle.paraTextTransform;
  }
  if (!charStyle.horizontalScale && paraStyle.paraHorizontalScale) {
    charStyle.horizontalScale = paraStyle.paraHorizontalScale;
  }
  if (!charStyle.strokeColor && paraStyle.paraStrokeColor) {
    charStyle.strokeColor = paraStyle.paraStrokeColor;
  }
  if (!charStyle.strokeWeight && paraStyle.paraStrokeWeight) {
    charStyle.strokeWeight = paraStyle.paraStrokeWeight;
  }
  
  // 5. Convertir en format CSS (comme buildCompleteStyle)
  const cssStyle: Record<string, any> = {
    fontFamily: charStyle.fontFamily || undefined,
    fontSize: charStyle.fontSize ? `${charStyle.fontSize}pt` : undefined,
    fontWeight: charStyle.fontWeight || 'normal',
    fontStyle: charStyle.fontStyle || 'normal',
    color: charStyle.color || '#000000',
    letterSpacing: charStyle.letterSpacing ? `${charStyle.letterSpacing}em` : 'normal',
    textDecoration: charStyle.textDecoration || 'none',
    textTransform: charStyle.textTransform || 'none',
    
    // Transformations
    horizontalScale: charStyle.horizontalScale,
    verticalScale: charStyle.verticalScale,
    skew: charStyle.skew,
    
    // Contours
    strokeColor: charStyle.strokeColor,
    strokeWeight: charStyle.strokeWeight
  };
  
  // #region agent log
  fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlMerger.ts:resolveSegmentStyle:EXIT',message:'Function exit',data:{finalColor:cssStyle.color,finalFontSize:cssStyle.fontSize,finalTextTransform:cssStyle.textTransform,finalHorizontalScale:cssStyle.horizontalScale},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
  // #endregion
  
  return cssStyle;
}

/**
 * Fusionne les positions de texte EPUB avec le contenu et les styles IDML
 * 
 * Sources de données :
 * - epubTextPositions : positions uniquement (x, y, width, height) depuis l'EPUB
 * - idmlData : TOUT le contenu textuel, polices et styles depuis l'IDML
 * 
 * ⚠️ Les polices viennent UNIQUEMENT de l'IDML.
 * 
 * Stratégie de mapping déterministe :
 * 1. Groupe les conteneurs EPUB par page, trie par containerId numérique (_idContainer000, 001, etc.)
 * 2. Groupe les frames IDML par page, trie par layoutOrder (ordre dans le Spread)
 * 3. Match par index : EPUB[0] -> IDML[0], EPUB[1] -> IDML[1], etc. sur chaque page
 */
export function mergeEpubWithIdml(
  epubTextPositions: Array<{
    containerId: string;
    pageIndex: number;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      scaleX: number;
      scaleY: number;
      layer: number;
    };
  }>,
  idmlData: {
    characterStyles: Record<string, any>;
    paragraphStyles: Record<string, any>;
    textFrames: Array<{
      id: string;
      name: string;
      content: string;
      variables: string[];
      conditions?: Array<{ name: string; visible: boolean }>;
      // NOUVEAU: Segments conditionnels pour le texte conditionnel InDesign
      conditionalSegments?: Array<{
        text: string;
        condition?: string;
        parsedCondition?: { tabId: string; variantId: string; optionId: string };
        variables?: string[];
        appliedCharacterStyle?: string;
      }>;
      availableConditions?: string[];
      appliedCharacterStyle?: string;
      appliedParagraphStyle?: string;
      localParaProperties?: any;
      inlineCharProperties?: any;
      position?: { x: number; y: number; width: number; height: number };
      pageIndex: number;
      layoutOrder?: number;
      parentStory?: string;
    }>;
  },
  bookId: string
): any[] {
  const mergedTexts: any[] = [];
  
  console.log(`[merge] ==================== MERGE EPUB + IDML ====================`);
  console.log(`[merge] EPUB positions: ${epubTextPositions.length}, IDML frames: ${idmlData.textFrames.length}`);
  console.log(`[merge] Character styles: ${Object.keys(idmlData.characterStyles).length}`);
  console.log(`[merge] Paragraph styles: ${Object.keys(idmlData.paragraphStyles).length}`);
  console.log(`[merge] Character styles IDs:`, Object.keys(idmlData.characterStyles).slice(0, 5));
  console.log(`[merge] Character styles details:`, Object.keys(idmlData.characterStyles).map(id => ({
    id,
    name: idmlData.characterStyles[id]?.fontFamily || 'NO FONT'
  })));
  
  // Group EPUB positions by page
  const epubByPage: Record<number, typeof epubTextPositions> = {};
  for (const pos of epubTextPositions) {
    if (!epubByPage[pos.pageIndex]) {
      epubByPage[pos.pageIndex] = [];
    }
    epubByPage[pos.pageIndex].push(pos);
  }
  
  // Sort each page's EPUB containers by containerId (extract numeric part from _idContainerXXX)
  for (const pageIndex in epubByPage) {
    epubByPage[pageIndex].sort((a, b) => {
      const aNum = extractContainerNumber(a.containerId);
      const bNum = extractContainerNumber(b.containerId);
      return aNum - bNum;
    });
  }
  
  // Group IDML frames by page
  const idmlByPage: Record<number, typeof idmlData.textFrames> = {};
  for (const frame of idmlData.textFrames) {
    if (!idmlByPage[frame.pageIndex]) {
      idmlByPage[frame.pageIndex] = [];
    }
    idmlByPage[frame.pageIndex].push(frame);
  }
  
  // Sort each page's IDML frames by layoutOrder (or fallback to order of appearance)
  for (const pageIndex in idmlByPage) {
    idmlByPage[pageIndex].sort((a, b) => {
      if (a.layoutOrder !== undefined && b.layoutOrder !== undefined) {
        return a.layoutOrder - b.layoutOrder;
      }
      return 0; // Keep original order if layoutOrder not available
    });
  }
  
  console.log('\n[merge] EPUB containers by page:');
  for (const pageIndex in epubByPage) {
    console.log(`  Page ${pageIndex}:`);
    epubByPage[pageIndex].forEach((pos, idx) => {
      console.log(`    [${idx}] ${pos.containerId}`);
    });
  }
  
  console.log('\n[merge] IDML text frames by page:');
  for (const pageIndex in idmlByPage) {
    console.log(`  Page ${pageIndex}:`);
    idmlByPage[pageIndex].forEach((frame, idx) => {
      const orderInfo = frame.layoutOrder !== undefined ? `order ${frame.layoutOrder}` : 'no order';
      console.log(`    [${idx}] ${frame.id} (${orderInfo}): "${frame.content.substring(0, 50)}..."`);
    });
  }
  
  // Match by index on each page
  const allPageIndexes = new Set([...Object.keys(epubByPage), ...Object.keys(idmlByPage)].map(Number));
  
  for (const pageIndex of Array.from(allPageIndexes).sort((a, b) => a - b)) {
    const epubPositions = epubByPage[pageIndex] || [];
    const idmlFrames = idmlByPage[pageIndex] || [];
    
    console.log(`\n[merge] Matching page ${pageIndex}: ${epubPositions.length} EPUB containers, ${idmlFrames.length} IDML frames`);
    
    const matchCount = Math.min(epubPositions.length, idmlFrames.length);
    
    for (let i = 0; i < matchCount; i++) {
      const epubPos = epubPositions[i];
      const idmlFrame = idmlFrames[i];
      
      console.log(`✓ [merge] MATCHED [${i}]: ${epubPos.containerId} → ${idmlFrame.id} (Story: ${idmlFrame.parentStory || 'N/A'})`);
      
      const mergedText = createMergedText(epubPos, idmlFrame, idmlData, bookId);
      mergedTexts.push(mergedText);
    }
    
    // Warn about unmatched items
    if (epubPositions.length > idmlFrames.length) {
      console.warn(`⚠ [merge] Page ${pageIndex}: ${epubPositions.length - idmlFrames.length} EPUB containers have no IDML match`);
    } else if (idmlFrames.length > epubPositions.length) {
      console.warn(`⚠ [merge] Page ${pageIndex}: ${idmlFrames.length - epubPositions.length} IDML frames have no EPUB match`);
    }
  }
  
  console.log(`\n[merge] ================== MERGE COMPLETE ==================`);
  console.log(`[merge] Successfully matched: ${mergedTexts.length}/${epubTextPositions.length}`);
  
  return mergedTexts;
}

/**
 * Extract numeric part from containerId (e.g., "_idContainer005" -> 5)
 */
function extractContainerNumber(containerId: string): number {
  const match = containerId.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Crée un élément de texte fusionné en combinant position EPUB et contenu/styles IDML
 * 
 * Hiérarchie des polices (priorité décroissante) - IDML UNIQUEMENT :
 * 1. IDML Inline Character Properties (le plus spécifique)
 * 2. IDML Applied Character Style
 * 3. IDML Paragraph Style (contient aussi fontFamily)
 * 
 * ⚠️ Si aucune police n'est trouvée dans l'IDML, c'est une ERREUR.
 * Le CSS de l'EPUB n'est PAS utilisé comme fallback.
 */
function createMergedText(
  epubPos: any,
  idmlFrame: any,
  idmlData: any,
  bookId: string
): any {
  const charStyleId = idmlFrame.appliedCharacterStyle;
  const paraStyleId = idmlFrame.appliedParagraphStyle;

  console.log(`[createMergedText] Text: "${idmlFrame.content.substring(0, 30)}"`);
  console.log(`[createMergedText]   CharStyleId: ${charStyleId || 'NONE'}`);
  console.log(`[createMergedText]   ParaStyleId: ${paraStyleId || 'NONE'}`);

  // Résoudre les IDs de style (avec/sans préfixe)
  const resolvedCharId = resolveStyleId(idmlData.characterStyles || {}, charStyleId, "CharacterStyle/");
  const resolvedParaId = resolveStyleId(idmlData.paragraphStyles || {}, paraStyleId, "ParagraphStyle/");

  console.log(`[createMergedText]   Resolved CharStyleId: ${resolvedCharId || 'NONE'}`);
  console.log(`[createMergedText]   Resolved ParaStyleId: ${resolvedParaId || 'NONE'}`);

  let charStyle = resolvedCharId && idmlData.characterStyles[resolvedCharId]
    ? { ...idmlData.characterStyles[resolvedCharId] }
    : {};
  
  if (charStyleId && !resolvedCharId) {
    console.warn(`[createMergedText] ⚠️ CharacterStyle "${charStyleId}" NOT FOUND in styles dictionary`);
    console.warn(`[createMergedText]   Available styles: ${Object.keys(idmlData.characterStyles).join(', ')}`);
  }
  
  const paraStyle = resolvedParaId && idmlData.paragraphStyles[resolvedParaId]
    ? idmlData.paragraphStyles[resolvedParaId]
    : {};
  
  if (paraStyleId && !resolvedParaId) {
    console.warn(`[createMergedText] ⚠️ ParagraphStyle "${paraStyleId}" NOT FOUND in styles dictionary`);
  }
  
  // DEBUG: Log paragraph style alignment
  console.log(`[createMergedText]   ParaStyle textAlign: ${paraStyle.textAlign || 'UNDEFINED'}`);
  console.log(`[createMergedText]   LocalParaProperties:`, idmlFrame.localParaProperties);
  
  console.log(`[createMergedText]   Found CharStyle:`, charStyle);
  console.log(`[createMergedText]   CharStyle fontFamily: ${charStyle.fontFamily || 'UNDEFINED'}`);
  console.log(`[createMergedText]   ParaStyle fontFamily: ${paraStyle.fontFamily || 'UNDEFINED'}`);
  console.log(`[createMergedText]   Has inline properties: ${!!idmlFrame.inlineCharProperties}`);
  
  // Priority 1: Use inline character properties (most specific)
  if (idmlFrame.inlineCharProperties) {
    const inline = idmlFrame.inlineCharProperties;
    if (inline.fontFamily) {
      console.log(`[createMergedText]   ✓ Using inline font: ${inline.fontFamily}`);
      charStyle.fontFamily = inline.fontFamily;
    }
    if (inline.fontSize) {
      charStyle.fontSize = inline.fontSize;
    }
    if (inline.fontWeight) {
      charStyle.fontWeight = inline.fontWeight;
    }
    if (inline.fontStyle) {
      charStyle.fontStyle = inline.fontStyle;
    }
    // Appliquer letterSpacing inline (tracking)
    if (inline.letterSpacing !== undefined) {
      console.log(`[createMergedText]   ✓ Using inline letterSpacing: ${inline.letterSpacing}em`);
      charStyle.letterSpacing = inline.letterSpacing;
    }
    // Appliquer les transformations inline
    if (inline.horizontalScale !== undefined) {
      charStyle.horizontalScale = inline.horizontalScale;
    }
    if (inline.verticalScale !== undefined) {
      charStyle.verticalScale = inline.verticalScale;
    }
    if (inline.skew !== undefined) {
      charStyle.skew = inline.skew;
    }
  }
  
  // Priority 2: If no CharacterStyle or no font in CharacterStyle, use ParagraphStyle font properties
  // BUGFIX: Quand le CharacterStyle n'a pas de police (style par défaut), on doit utiliser
  // TOUTES les propriétés du ParagraphStyle, pas juste la police
  if (!charStyle.fontFamily && paraStyle.fontFamily) {
    console.log(`[createMergedText]   ✓ Using font from ParagraphStyle: ${paraStyle.fontFamily}`);
    charStyle.fontFamily = paraStyle.fontFamily;
    // Copier toutes les propriétés du ParagraphStyle (pas seulement si undefined)
    if (paraStyle.fontSize) {
      charStyle.fontSize = paraStyle.fontSize;
    }
    if (paraStyle.fontWeight) {
      charStyle.fontWeight = paraStyle.fontWeight;
    }
    if (paraStyle.fontStyle) {
      charStyle.fontStyle = paraStyle.fontStyle;
    }
    // BUGFIX: Copier aussi la couleur, text-transform et stroke du ParagraphStyle
    if (paraStyle.paraColor) {
      charStyle.color = paraStyle.paraColor;
    }
    if (paraStyle.paraTextTransform) {
      charStyle.textTransform = paraStyle.paraTextTransform;
    }
    if (paraStyle.paraStrokeColor) {
      charStyle.strokeColor = paraStyle.paraStrokeColor;
    }
    if (paraStyle.paraStrokeWeight) {
      charStyle.strokeWeight = paraStyle.paraStrokeWeight;
    }
  }
  
  // ⚠️ Si toujours pas de fontFamily, c'est une ERREUR - pas de fallback CSS
  if (!charStyle.fontFamily) {
    console.error(`[createMergedText]   ❌ ERROR: No fontFamily found in IDML for text "${idmlFrame.content.substring(0, 30)}..."`);
    console.error(`[createMergedText]   The IDML file must contain font information. CSS fallback is NOT used.`);
    // On laisse undefined - le navigateur utilisera la police par défaut
  }
  
  // Extrait les propriétés de paragraphe locales (surcharges)
  let localParaStyle: any = {};
  if (idmlFrame.localParaProperties) {
    localParaStyle = extractLocalParagraphStyle(idmlFrame.localParaProperties);
  }
  
  // Priority 1.5: Si le texte a des segments conditionnels avec des styles,
  // utiliser le style du PREMIER segment significatif pour le style GLOBAL du texte
  if (idmlFrame.conditionalSegments && idmlFrame.conditionalSegments.length > 0) {
    // Trouver le premier segment non-vide avec un style de caractère appliqué
    const firstStyledSegment = idmlFrame.conditionalSegments.find(
      seg => seg.text.trim() && 
             seg.appliedCharacterStyle && 
             seg.appliedCharacterStyle !== 'CharacterStyle/$ID/[No character style]'
    );
    
    if (firstStyledSegment) {
      console.log(`[createMergedText]   ✓ Using style from first styled segment: "${firstStyledSegment.text.substring(0, 20)}"`);
      
      // Résoudre le style complet de ce segment
      const firstSegmentResolvedStyle = resolveSegmentStyle(
        firstStyledSegment,
        idmlData.characterStyles,
        idmlData.paragraphStyles,
        idmlData.colors,
        paraStyleId
      );
      
      // #region agent log
      fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idmlMerger.ts:createMergedText:APPLY_FIRST_SEGMENT',message:'Applying first segment style to global',data:{segmentText:firstStyledSegment.text.substring(0,20),segmentColor:firstSegmentResolvedStyle.color,segmentFontSize:firstSegmentResolvedStyle.fontSize},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H11'})}).catch(()=>{});
      // #endregion
      
      // Appliquer le style du segment au charStyle global
      // Extraction des valeurs numériques depuis le format CSS
      if (firstSegmentResolvedStyle.fontFamily) {
        charStyle.fontFamily = firstSegmentResolvedStyle.fontFamily;
      }
      if (firstSegmentResolvedStyle.fontSize) {
        const sizeMatch = firstSegmentResolvedStyle.fontSize.match(/^([\d.]+)pt$/);
        if (sizeMatch) charStyle.fontSize = parseFloat(sizeMatch[1]);
      }
      if (firstSegmentResolvedStyle.fontWeight && firstSegmentResolvedStyle.fontWeight !== 'normal') {
        charStyle.fontWeight = firstSegmentResolvedStyle.fontWeight;
      }
      if (firstSegmentResolvedStyle.fontStyle && firstSegmentResolvedStyle.fontStyle !== 'normal') {
        charStyle.fontStyle = firstSegmentResolvedStyle.fontStyle;
      }
      if (firstSegmentResolvedStyle.color) {
        charStyle.color = firstSegmentResolvedStyle.color;
      }
      if (firstSegmentResolvedStyle.letterSpacing && firstSegmentResolvedStyle.letterSpacing !== 'normal') {
        const spacingMatch = firstSegmentResolvedStyle.letterSpacing.match(/^([\d.]+)em$/);
        if (spacingMatch) charStyle.letterSpacing = parseFloat(spacingMatch[1]);
      }
      if (firstSegmentResolvedStyle.textTransform && firstSegmentResolvedStyle.textTransform !== 'none') {
        charStyle.textTransform = firstSegmentResolvedStyle.textTransform;
      }
      if (firstSegmentResolvedStyle.horizontalScale) {
        charStyle.horizontalScale = firstSegmentResolvedStyle.horizontalScale;
      }
      if (firstSegmentResolvedStyle.verticalScale) {
        charStyle.verticalScale = firstSegmentResolvedStyle.verticalScale;
      }
      if (firstSegmentResolvedStyle.skew) {
        charStyle.skew = firstSegmentResolvedStyle.skew;
      }
      if (firstSegmentResolvedStyle.strokeColor) {
        charStyle.strokeColor = firstSegmentResolvedStyle.strokeColor;
      }
      if (firstSegmentResolvedStyle.strokeWeight) {
        charStyle.strokeWeight = firstSegmentResolvedStyle.strokeWeight;
      }
      
      console.log(`[createMergedText]   ✓ Global style updated with first segment: color=${charStyle.color}, fontSize=${charStyle.fontSize}`);
    }
  }
  
  // Détecte si le texte est variable
  const isVariable = idmlFrame.variables.length > 0;
  
  // Traite le contenu : remplace {var} par {{var}} pour le moteur de template
  let processedContent = idmlFrame.content;
  if (isVariable) {
    processedContent = idmlFrame.content.replace(/\{([^}]+)\}/g, '{{$1}}');
  }
  
  // Construit l'objet de style complet
  const completeStyle = buildCompleteStyle(charStyle, paraStyle, localParaStyle);
  
  // Construire l'objet résultat
  const result: any = {
    id: `text-${bookId}-${epubPos.pageIndex}-${epubPos.containerId}`,
    type: isVariable ? 'variable' : 'fixed',
    label: epubPos.containerId,
    content: processedContent,
    originalContent: idmlFrame.content,
    variables: idmlFrame.variables,
    conditions: idmlFrame.conditions,
    style: completeStyle,
    position: {
      ...epubPos.position,
      pageIndex: epubPos.pageIndex,
      zoneId: 'body'
    },
    cssSelector: `#${epubPos.containerId}`,
    combinationKey: 'default',
    idmlFrameId: idmlFrame.id,
    idmlFrameName: idmlFrame.name,
    appliedParagraphStyle: paraStyleId,
    appliedCharacterStyle: charStyleId
  };
  
  // NOUVEAU: Ajouter les segments conditionnels si présents
  if (idmlFrame.conditionalSegments && idmlFrame.conditionalSegments.length > 0) {
    // Enrichir chaque segment avec son style résolu
    result.conditionalSegments = idmlFrame.conditionalSegments.map(segment => {
      const resolvedStyle = resolveSegmentStyle(
        segment,
        idmlData.characterStyles,
        idmlData.paragraphStyles,
        idmlData.colors,
        paraStyleId
      );
      
      console.log(`[createMergedText]   Segment "${segment.text.substring(0, 20)}" - Style: ${segment.appliedCharacterStyle}`);
      console.log(`[createMergedText]     Resolved: font=${resolvedStyle.fontFamily}, size=${resolvedStyle.fontSize}, color=${resolvedStyle.color}`);
      
      return {
        ...segment,
        resolvedStyle
      };
    });
    result.availableConditions = idmlFrame.availableConditions;
    
    // Marquer le type comme 'conditional' si des conditions sont présentes
    if (idmlFrame.availableConditions && idmlFrame.availableConditions.length > 0) {
      result.type = 'conditional';
    }
    
    
    console.log(`[createMergedText] Text has ${idmlFrame.conditionalSegments.length} conditional segments`);
    console.log(`[createMergedText] Available conditions: ${idmlFrame.availableConditions?.join(', ')}`);
  }
  
  return result;
}

/**
 * Extrait les propriétés de paragraphe locales
 */
function extractLocalParagraphStyle(props: any): any {
  const localStyle: any = {};
  
  const justification = props['@_Justification'];
  if (justification) {
    console.log(`[extractLocalParagraphStyle] Processing Justification: ${justification}`);
    
    // Gardons la valeur IDML originale pour l'affichage
    localStyle.idmlJustification = justification;
    
    switch (justification) {
      case 'LeftAlign':
        localStyle.textAlign = 'left';
        break;
      case 'CenterAlign':
        localStyle.textAlign = 'center';
        break;
      case 'RightAlign':
        localStyle.textAlign = 'right';
        break;
      case 'LeftJustified':
        localStyle.textAlign = 'justify';
        localStyle.textAlignLast = 'left';
        break;
      case 'RightJustified':
        localStyle.textAlign = 'justify';
        localStyle.textAlignLast = 'right';
        break;
      case 'CenterJustified':
        localStyle.textAlign = 'justify';
        localStyle.textAlignLast = 'center';
        break;
      case 'FullyJustified':
      case 'Justify':
        localStyle.textAlign = 'justify';
        localStyle.textAlignLast = 'justify';
        break;
      case 'ToBindingSide':
        localStyle.textAlign = 'left';
        break;
      case 'AwayFromBindingSide':
        localStyle.textAlign = 'right';
        break;
      default:
        console.warn(`[extractLocalParagraphStyle] Unknown Justification value: ${justification}`);
    }
    console.log(`[extractLocalParagraphStyle] Mapped to textAlign: ${localStyle.textAlign}, textAlignLast: ${localStyle.textAlignLast}`);
  }
  
  // Espacements de paragraphe (locaux)
  if (props['@_SpaceBefore']) {
    localStyle.marginTop = parseFloat(props['@_SpaceBefore']);
    console.log(`[extractLocalParagraphStyle] Local SpaceBefore: ${localStyle.marginTop}pt`);
  }
  
  if (props['@_SpaceAfter']) {
    localStyle.marginBottom = parseFloat(props['@_SpaceAfter']);
    console.log(`[extractLocalParagraphStyle] Local SpaceAfter: ${localStyle.marginBottom}pt`);
  }
  
  if (props['@_FirstLineIndent']) {
    localStyle.textIndent = parseFloat(props['@_FirstLineIndent']);
    console.log(`[extractLocalParagraphStyle] Local FirstLineIndent: ${localStyle.textIndent}pt`);
  }
  
  if (props['@_LeftIndent']) {
    localStyle.leftIndent = parseFloat(props['@_LeftIndent']);
    console.log(`[extractLocalParagraphStyle] Local LeftIndent: ${localStyle.leftIndent}pt`);
  }
  
  if (props['@_RightIndent']) {
    localStyle.rightIndent = parseFloat(props['@_RightIndent']);
    console.log(`[extractLocalParagraphStyle] Local RightIndent: ${localStyle.rightIndent}pt`);
  }
  
  // Interlignage (Leading)
  if (props['@_Leading'] && props['@_Leading'] !== 'Auto') {
    const leading = parseFloat(props['@_Leading']);
    const pointSize = parseFloat(props['@_PointSize']) || 12;
    if (leading && pointSize) {
      localStyle.lineHeight = (leading / pointSize).toFixed(2);
      console.log(`[extractLocalParagraphStyle] Local Leading: ${leading}pt → lineHeight: ${localStyle.lineHeight}`);
    }
  }
  
  return localStyle;
}

/**
 * Construit l'objet de style complet avec toutes les propriétés IDML extraites
 */
function buildCompleteStyle(
  charStyle: any,
  paraStyle: any,
  localParaStyle: any
): Record<string, any> {
  const completeStyle: Record<string, any> = {
    // ==================== STYLES DE CARACTÈRE ====================
    
    // BUGFIX CRITIQUE: Les propriétés de caractère peuvent venir de 3 sources (priorité décroissante):
    // 1. CharacterStyle (le plus spécifique)
    // 2. ParagraphStyle (quand pas de CharacterStyle)
    // 3. Valeurs par défaut
    
    // Base
    fontFamily: charStyle.fontFamily || paraStyle.fontFamily || undefined,
    fontSize: charStyle.fontSize ? `${charStyle.fontSize}pt` : 
              paraStyle.fontSize ? `${paraStyle.fontSize}pt` : '12pt',
    fontWeight: charStyle.fontWeight || paraStyle.fontWeight || 'normal',
    fontStyle: charStyle.fontStyle || paraStyle.fontStyle || 'normal',
    color: charStyle.color || paraStyle.paraColor || '#000000',
    letterSpacing: charStyle.letterSpacing ? `${charStyle.letterSpacing}em` : 
                   paraStyle.paraLetterSpacing ? `${paraStyle.paraLetterSpacing}em` : 'normal',
    textDecoration: charStyle.textDecoration || 'none',
    textTransform: charStyle.textTransform || paraStyle.paraTextTransform || 'none',
    
    // BUGFIX: Stroke (contour du texte) pour reproduire l'épaisseur de l'EPUB
    strokeColor: charStyle.strokeColor || paraStyle.paraStrokeColor || undefined,
    // Si strokeColor défini mais pas strokeWeight, utiliser 1pt par défaut (comme l'EPUB qui utilise 20px)
    strokeWeight: charStyle.strokeWeight || paraStyle.paraStrokeWeight || 
                  ((charStyle.strokeColor || paraStyle.paraStrokeColor) ? 1 : undefined),
    
    // BUGFIX: Ne pas utiliser overflow:hidden car cela coupe les lettres hautes (majuscules, polices manuscrites)
    // L'EPUB InDesign n'utilise pas overflow:hidden, le texte peut déborder naturellement de sa zone
    overflow: 'visible',
    
    // ==================== STYLES DE PARAGRAPHE ====================
    
    // Alignement
    textAlign: localParaStyle.textAlign || paraStyle.textAlign || 'left',
    // BUGFIX: lineHeight "1" de l'IDML coupe les ascendantes (lettres hautes)
    // Utiliser au minimum 1.3 pour laisser de l'espace, surtout pour les polices manuscrites
    // Priorité: local > style > défaut
    lineHeight: localParaStyle.lineHeight || 
                ((paraStyle.lineHeight && paraStyle.lineHeight !== '1') ? paraStyle.lineHeight : '1.3'),
    whiteSpace: paraStyle.whiteSpace || 'normal',
    
    // Valeur IDML originale pour l'affichage
    idmlJustification: localParaStyle.idmlJustification || undefined
  };
  
  // ==================== PRIORITY 1: TRANSFORMATIONS ====================
  
  // Horizontal/Vertical Scale - BUGFIX: Peut venir du CharacterStyle OU du ParagraphStyle
  const effectiveHorizontalScale = charStyle.horizontalScale || paraStyle.paraHorizontalScale;
  
  if (effectiveHorizontalScale && effectiveHorizontalScale !== 100) {
    // Option 1: font-stretch (mieux pour le flux de texte)
    const scalePercent = effectiveHorizontalScale;
    if (scalePercent < 62.5) completeStyle.fontStretch = 'ultra-condensed';
    else if (scalePercent < 75) completeStyle.fontStretch = 'extra-condensed';
    else if (scalePercent < 87.5) completeStyle.fontStretch = 'condensed';
    else if (scalePercent < 93.75) completeStyle.fontStretch = 'semi-condensed';
    else if (scalePercent <= 106.25) completeStyle.fontStretch = 'normal';
    else if (scalePercent < 112.5) completeStyle.fontStretch = 'semi-expanded';
    else if (scalePercent < 125) completeStyle.fontStretch = 'expanded';
    else if (scalePercent < 150) completeStyle.fontStretch = 'extra-expanded';
    else completeStyle.fontStretch = 'ultra-expanded';
    
    // Option 2: transform (plus fidèle pour les valeurs extrêmes comme 141%)
    // Pour les valeurs > 150%, font-stretch ne suffit pas, on utilise transform
    if (scalePercent > 150 || scalePercent < 50) {
      completeStyle.transform = `scaleX(${scalePercent / 100})`;
    }
    
    // Stocker la valeur exacte pour référence
    completeStyle.idmlHorizontalScale = effectiveHorizontalScale;
  }
  
  if (charStyle.verticalScale && charStyle.verticalScale !== 100) {
    completeStyle.idmlVerticalScale = charStyle.verticalScale;
    // Note: pas d'équivalent CSS direct pour verticalScale sans transform
    // On pourrait utiliser transform: scaleY() mais ça affecte le layout
  }
  
  // Skew
  if (charStyle.skew && charStyle.skew !== 0) {
    // Font-style oblique avec angle (CSS Fonts Level 4)
    completeStyle.fontStyle = `oblique ${charStyle.skew}deg`;
    completeStyle.idmlSkew = charStyle.skew;
  }
  
  // ==================== PRIORITY 1: CRÉNAGE ET LIGATURES ====================
  
  if (charStyle.kerningMethod) {
    if (charStyle.kerningMethod === 'None') {
      completeStyle.fontKerning = 'none';
    } else if (charStyle.kerningMethod === 'Optical') {
      completeStyle.fontKerning = 'auto';
    } else if (charStyle.kerningMethod === 'Metrics') {
      completeStyle.fontKerning = 'normal';
    }
  }
  
  if (charStyle.ligatures === false) {
    completeStyle.fontVariantLigatures = 'none';
  } else if (charStyle.ligatures === true) {
    completeStyle.fontVariantLigatures = 'common-ligatures';
  }
  
  if (charStyle.noBreak) {
    completeStyle.whiteSpace = 'nowrap';
  }
  
  // ==================== PRIORITY 1: COULEURS ET CONTOURS ====================
  
  if (charStyle.fillTint !== undefined && charStyle.fillTint !== 100) {
    completeStyle.idmlFillTint = charStyle.fillTint;
    // On pourrait ajuster l'opacité de la couleur en fonction de la teinte
  }
  
  if (charStyle.strokeColor) {
    completeStyle.webkitTextStroke = charStyle.strokeColor;
    completeStyle.webkitTextStrokeColor = charStyle.strokeColor;
    if (charStyle.strokeWeight) {
      completeStyle.webkitTextStrokeWidth = `${charStyle.strokeWeight}pt`;
    }
  }
  
  if (charStyle.strokeTint !== undefined) {
    completeStyle.idmlStrokeTint = charStyle.strokeTint;
  }
  
  // ==================== PRIORITY 1: SOULIGNEMENT ET BARRÉ AVANCÉS ====================
  
  if (charStyle.underlineColor) {
    completeStyle.textDecorationColor = charStyle.underlineColor;
  }
  
  if (charStyle.underlineWeight !== undefined) {
    completeStyle.textDecorationThickness = `${charStyle.underlineWeight}pt`;
  }
  
  if (charStyle.underlineOffset !== undefined) {
    completeStyle.textUnderlineOffset = `${charStyle.underlineOffset}pt`;
  }
  
  if (charStyle.underlineType) {
    // Types: Solid, Dashed, Dotted, etc.
    const typeMap: Record<string, string> = {
      'Solid': 'solid',
      'Dashed': 'dashed',
      'Dotted': 'dotted',
      'Wavy': 'wavy'
    };
    completeStyle.textDecorationStyle = typeMap[charStyle.underlineType] || 'solid';
  }
  
  if (charStyle.strikeThroughColor) {
    completeStyle.idmlStrikeThroughColor = charStyle.strikeThroughColor;
    // Note: CSS ne supporte pas de couleur différente pour le barré
  }
  
  // ==================== PRIORITY 1: POSITION ====================
  
  if (charStyle.position) {
    switch (charStyle.position) {
      case 'Superscript':
      case 'OTSuperscript':
        completeStyle.verticalAlign = 'super';
        completeStyle.fontSize = '0.6em';
        break;
      case 'Subscript':
      case 'OTSubscript':
        completeStyle.verticalAlign = 'sub';
        completeStyle.fontSize = '0.6em';
        break;
      case 'OTNumerator':
        completeStyle.fontFeatureSettings = '"numr"';
        break;
      case 'OTDenominator':
        completeStyle.fontFeatureSettings = '"dnom"';
        break;
    }
    completeStyle.idmlPosition = charStyle.position;
  }
  
  // ==================== PRIORITY 2: OPENTYPE FEATURES ====================
  
  const fontFeatures: string[] = [];
  
  if (charStyle.otfContextualAlternate) fontFeatures.push('"calt"');
  if (charStyle.otfDiscretionaryLigature) fontFeatures.push('"dlig"');
  if (charStyle.otfFraction) fontFeatures.push('"frac"');
  if (charStyle.otfHistorical) fontFeatures.push('"hist"');
  if (charStyle.otfOrdinal) fontFeatures.push('"ordn"');
  if (charStyle.otfSlashedZero) fontFeatures.push('"zero"');
  if (charStyle.otfSwash) fontFeatures.push('"swsh"');
  if (charStyle.otfTitling) fontFeatures.push('"titl"');
  
  if (charStyle.otfStylisticSets) {
    // Format: "ss01 ss03" -> ['"ss01"', '"ss03"']
    const sets = charStyle.otfStylisticSets.split(' ').map((s: string) => `"${s}"`);
    fontFeatures.push(...sets);
  }
  
  if (fontFeatures.length > 0) {
    completeStyle.fontFeatureSettings = fontFeatures.join(', ');
  }
  
  if (charStyle.glyphForm) {
    completeStyle.idmlGlyphForm = charStyle.glyphForm;
  }
  
  // ==================== PRIORITY 1: RETRAITS ====================
  
  // Priorité: local > style (pour les retraits locaux)
  const effectiveLeftIndent = localParaStyle.leftIndent !== undefined ? localParaStyle.leftIndent : paraStyle.leftIndent;
  const effectiveRightIndent = localParaStyle.rightIndent !== undefined ? localParaStyle.rightIndent : paraStyle.rightIndent;
  
  if (effectiveLeftIndent && effectiveLeftIndent !== 0) {
    completeStyle.paddingLeft = `${effectiveLeftIndent}pt`;
  }
  
  if (effectiveRightIndent && effectiveRightIndent !== 0) {
    completeStyle.paddingRight = `${effectiveRightIndent}pt`;
  }
  
  // ==================== PRIORITY 1: LANGUE ET COMPOSITION ====================
  
  if (paraStyle.appliedLanguage) {
    // Convertir $ID/French -> fr, $ID/English -> en, etc.
    const langMap: Record<string, string> = {
      '$ID/French': 'fr',
      '$ID/English': 'en',
      '$ID/Spanish': 'es',
      '$ID/German': 'de',
      '$ID/Italian': 'it',
      '$ID/Portuguese': 'pt',
      '$ID/Dutch': 'nl',
      '$ID/Japanese': 'ja',
      '$ID/Chinese': 'zh',
      '$ID/Korean': 'ko',
      '$ID/Russian': 'ru',
      '$ID/Arabic': 'ar',
      '$ID/Hebrew': 'he'
    };
    completeStyle.lang = langMap[paraStyle.appliedLanguage] || 'en';
    completeStyle.idmlLanguage = paraStyle.appliedLanguage;
  }
  
  if (paraStyle.composer) {
    completeStyle.idmlComposer = paraStyle.composer;
  }
  
  // ==================== PRIORITY 1: CÉSURE ====================
  
  if (paraStyle.hyphenate) {
    completeStyle.hyphens = 'auto';
    completeStyle.WebkitHyphens = 'auto';
  }
  
  // ==================== PRIORITY 2: INTERLIGNAGE AVANCÉ ====================
  
  if (paraStyle.autoLeading && paraStyle.autoLeading !== 120) {
    completeStyle.idmlAutoLeading = paraStyle.autoLeading;
    // Note: CSS n'a pas d'équivalent direct pour autoLeading
  }
  
  if (paraStyle.leadingModel) {
    completeStyle.idmlLeadingModel = paraStyle.leadingModel;
  }
  
  // ==================== PRIORITY 2: LETTRINES ====================
  
  if (paraStyle.dropCapCharacters && paraStyle.dropCapLines) {
    completeStyle.dropCap = {
      characters: paraStyle.dropCapCharacters,
      lines: paraStyle.dropCapLines
    };
    // Note: Nécessite un traitement spécial côté client avec ::first-letter
  }
  
  // ==================== PRIORITY 2: KEEP OPTIONS ====================
  
  if (paraStyle.keepWithNext) {
    completeStyle.pageBreakAfter = 'avoid';
    completeStyle.breakAfter = 'avoid';
  }
  
  if (paraStyle.keepAllLinesTogether) {
    completeStyle.pageBreakInside = 'avoid';
    completeStyle.breakInside = 'avoid';
  }
  
  // ==================== PRIORITY 2: JUSTIFICATION AVANCÉE ====================
  
  if (paraStyle.desiredWordSpacing !== undefined) {
    completeStyle.wordSpacing = `${paraStyle.desiredWordSpacing}%`;
  }
  
  if (paraStyle.singleWordJustification) {
    completeStyle.idmlSingleWordJustification = paraStyle.singleWordJustification;
  }
  
  // ==================== PRIORITY 3: DIRECTION RTL ====================
  
  if (paraStyle.paragraphDirection) {
    if (paraStyle.paragraphDirection === 'RightToLeftDirection') {
      completeStyle.direction = 'rtl';
      completeStyle.unicodeBidi = 'embed';
    } else {
      completeStyle.direction = 'ltr';
    }
  }
  
  // ==================== PRIORITY 3: CÉSURE DÉTAILLÉE ====================
  
  if (paraStyle.hyphenateBeforeLast !== undefined) {
    completeStyle.hyphenateLimitChars = `${paraStyle.hyphenateBeforeLast} ${paraStyle.hyphenateAfterFirst || 2} auto`;
  }
  
  if (paraStyle.hyphenateLadderLimit !== undefined) {
    completeStyle.hyphenateLimitLines = paraStyle.hyphenateLadderLimit;
  }
  
  if (paraStyle.hyphenationZone !== undefined) {
    completeStyle.hyphenateZone = `${paraStyle.hyphenationZone}pt`;
  }
  
  // ==================== ESPACEMENT ET BASELINE ====================
  
  // Ajouter textAlignLast si défini
  if (localParaStyle.textAlignLast || paraStyle.textAlignLast) {
    completeStyle.textAlignLast = localParaStyle.textAlignLast || paraStyle.textAlignLast;
  }
  
  // Ajoute l'espacement si défini (priorité: local > style)
  const effectiveMarginTop = localParaStyle.marginTop !== undefined ? localParaStyle.marginTop : paraStyle.marginTop;
  const effectiveMarginBottom = localParaStyle.marginBottom !== undefined ? localParaStyle.marginBottom : paraStyle.marginBottom;
  const effectiveTextIndent = localParaStyle.textIndent !== undefined ? localParaStyle.textIndent : paraStyle.textIndent;
  
  if (effectiveMarginTop) completeStyle.marginTop = `${effectiveMarginTop}pt`;
  if (effectiveMarginBottom) completeStyle.marginBottom = `${effectiveMarginBottom}pt`;
  if (effectiveTextIndent) completeStyle.textIndent = `${effectiveTextIndent}pt`;
  if (charStyle.baselineShift) completeStyle.baselineShift = `${charStyle.baselineShift}pt`;
  
  // ==================== PROPRIÉTÉS IDML NON-CSS (pour référence) ====================
  
  // Stocker les valeurs IDML qui n'ont pas d'équivalent CSS direct
  if (paraStyle.desiredLetterSpacing !== undefined) {
    completeStyle.idmlDesiredLetterSpacing = paraStyle.desiredLetterSpacing;
  }
  if (paraStyle.minimumLetterSpacing !== undefined) {
    completeStyle.idmlMinimumLetterSpacing = paraStyle.minimumLetterSpacing;
  }
  if (paraStyle.maximumLetterSpacing !== undefined) {
    completeStyle.idmlMaximumLetterSpacing = paraStyle.maximumLetterSpacing;
  }
  if (paraStyle.desiredGlyphScaling !== undefined) {
    completeStyle.idmlDesiredGlyphScaling = paraStyle.desiredGlyphScaling;
  }
  if (paraStyle.minimumGlyphScaling !== undefined) {
    completeStyle.idmlMinimumGlyphScaling = paraStyle.minimumGlyphScaling;
  }
  if (paraStyle.maximumGlyphScaling !== undefined) {
    completeStyle.idmlMaximumGlyphScaling = paraStyle.maximumGlyphScaling;
  }
  if (paraStyle.keepFirstLines !== undefined) {
    completeStyle.idmlKeepFirstLines = paraStyle.keepFirstLines;
  }
  if (paraStyle.keepLastLines !== undefined) {
    completeStyle.idmlKeepLastLines = paraStyle.keepLastLines;
  }
  if (charStyle.overprintFill) {
    completeStyle.idmlOverprintFill = true;
  }
  if (charStyle.overprintStroke) {
    completeStyle.idmlOverprintStroke = true;
  }
  
  return completeStyle;
}
