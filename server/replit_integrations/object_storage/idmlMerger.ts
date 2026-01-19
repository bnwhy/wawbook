/**
 * Module pour fusionner les positions EPUB avec le contenu/styles IDML
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
  bookId: string,
  cssFontMapping?: Record<string, string>
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
      
      const mergedText = createMergedText(epubPos, idmlFrame, idmlData, bookId, cssFontMapping);
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
 * Crée un élément de texte fusionné
 */
function createMergedText(
  epubPos: any,
  idmlFrame: any,
  idmlData: any,
  bookId: string,
  cssFontMapping?: Record<string, string>
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
  if (!charStyle.fontFamily && paraStyle.fontFamily) {
    console.log(`[createMergedText]   ✓ Using font from ParagraphStyle: ${paraStyle.fontFamily}`);
    charStyle.fontFamily = paraStyle.fontFamily;
    if (paraStyle.fontSize && !charStyle.fontSize) {
      charStyle.fontSize = paraStyle.fontSize;
    }
    if (paraStyle.fontWeight) {
      charStyle.fontWeight = paraStyle.fontWeight;
    }
    if (paraStyle.fontStyle) {
      charStyle.fontStyle = paraStyle.fontStyle;
    }
  }
  
  // Priority 3: Fallback on CSS class mapping from EPUB if still no fontFamily
  if (!charStyle.fontFamily && cssFontMapping) {
    // Try common EPUB CSS class patterns: CharOverride-1, CharOverride-2, etc.
    // The containerId is like _idContainer005, and related text spans use CharOverride-X classes
    // We look for classes that define fonts in the CSS
    for (const [selector, fontFamily] of Object.entries(cssFontMapping)) {
      // CharOverride classes are the most common for character styling
      if (selector.includes('CharOverride') || selector.includes('char-override')) {
        console.log(`[createMergedText]   ✓ Using font from CSS fallback (${selector}): ${fontFamily}`);
        charStyle.fontFamily = fontFamily;
        break;
      }
    }
    
    // If still no font, try span selectors
    if (!charStyle.fontFamily) {
      for (const [selector, fontFamily] of Object.entries(cssFontMapping)) {
        if (selector.startsWith('span.') || selector.startsWith('.')) {
          console.log(`[createMergedText]   ✓ Using font from CSS fallback (${selector}): ${fontFamily}`);
          charStyle.fontFamily = fontFamily;
          break;
        }
      }
    }
  }
  
  if (!charStyle.fontFamily) {
    console.warn(`[createMergedText]   ⚠ No fontFamily found for text "${idmlFrame.content.substring(0, 30)}..." - will use browser default`);
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
 * Construit l'objet de style complet
 */
function buildCompleteStyle(
  charStyle: any,
  paraStyle: any,
  localParaStyle: any
): Record<string, any> {
  const completeStyle: Record<string, any> = {
    // Styles de caractère
    fontFamily: charStyle.fontFamily || undefined,
    fontSize: charStyle.fontSize ? `${charStyle.fontSize}pt` : '12pt',
    fontWeight: charStyle.fontWeight || 'normal',
    fontStyle: charStyle.fontStyle || 'normal',
    color: charStyle.color || '#000000',
    letterSpacing: charStyle.letterSpacing ? `${charStyle.letterSpacing}em` : 'normal',
    textDecoration: charStyle.textDecoration || 'none',
    textTransform: charStyle.textTransform || 'none',

    // Styles de paragraphe (les propriétés locales surchargent les globales)
    textAlign: localParaStyle.textAlign || paraStyle.textAlign || 'left',
    lineHeight: paraStyle.lineHeight || '1.2',
    whiteSpace: paraStyle.whiteSpace || 'normal',

    // Overflow pour la zone de texte
    overflow: 'hidden',
    
    // Valeur IDML originale pour l'affichage
    idmlJustification: localParaStyle.idmlJustification || undefined
  };
  
  // Ajouter textAlignLast si défini
  if (localParaStyle.textAlignLast || paraStyle.textAlignLast) {
    completeStyle.textAlignLast = localParaStyle.textAlignLast || paraStyle.textAlignLast;
  }
  
  // Ajoute l'espacement si défini
  if (paraStyle.marginTop) completeStyle.marginTop = `${paraStyle.marginTop}pt`;
  if (paraStyle.marginBottom) completeStyle.marginBottom = `${paraStyle.marginBottom}pt`;
  if (paraStyle.textIndent) completeStyle.textIndent = `${paraStyle.textIndent}pt`;
  if (charStyle.baselineShift) completeStyle.baselineShift = `${charStyle.baselineShift}pt`;
  
  return completeStyle;
}
