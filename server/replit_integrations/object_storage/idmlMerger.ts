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
  
  // Détecte si le texte est variable
  const isVariable = idmlFrame.variables.length > 0;
  
  // Traite le contenu : remplace {var} par {{var}} pour le moteur de template
  let processedContent = idmlFrame.content;
  if (isVariable) {
    processedContent = idmlFrame.content.replace(/\{([^}]+)\}/g, '{{$1}}');
  }
  
  // Construit l'objet de style complet
  const completeStyle = buildCompleteStyle(charStyle, paraStyle, localParaStyle);
  
  return {
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
    lineHeight: (paraStyle.lineHeight && paraStyle.lineHeight !== '1') ? paraStyle.lineHeight : '1.3',
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
  
  if (paraStyle.leftIndent && paraStyle.leftIndent !== 0) {
    completeStyle.paddingLeft = `${paraStyle.leftIndent}pt`;
  }
  
  if (paraStyle.rightIndent && paraStyle.rightIndent !== 0) {
    completeStyle.paddingRight = `${paraStyle.rightIndent}pt`;
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
  
  // Ajoute l'espacement si défini
  if (paraStyle.marginTop) completeStyle.marginTop = `${paraStyle.marginTop}pt`;
  if (paraStyle.marginBottom) completeStyle.marginBottom = `${paraStyle.marginBottom}pt`;
  if (paraStyle.textIndent) completeStyle.textIndent = `${paraStyle.textIndent}pt`;
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
