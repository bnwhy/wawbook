/**
 * Module pour fusionner les positions EPUB avec le contenu/styles IDML
 */

/**
 * Fusionne les positions de texte EPUB avec le contenu et les styles IDML
 * 
 * Stratégie de mapping automatique :
 * 1. Trie les conteneurs EPUB par page, puis par position Y (haut en bas)
 * 2. Trie les frames de texte IDML par page, puis par position Y (haut en bas)
 * 3. Match dans l'ordre : 1er conteneur EPUB = 1er frame IDML, etc.
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
      position?: { x: number; y: number; width: number; height: number };
      pageIndex: number;
    }>;
  },
  bookId: string
): any[] {
  const mergedTexts: any[] = [];
  
  console.log(`[merge] ==================== MERGE EPUB + IDML ====================`);
  console.log(`[merge] EPUB positions: ${epubTextPositions.length}, IDML frames: ${idmlData.textFrames.length}`);
  
  // Trie les positions EPUB par page, puis par Y
  const sortedEpubPositions = [...epubTextPositions].sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
    return a.position.y - b.position.y;
  });
  
  // Trie les frames IDML par page, puis par Y
  const sortedIdmlFrames = [...idmlData.textFrames].sort((a, b) => {
    if (a.pageIndex > 0 && b.pageIndex > 0 && a.pageIndex !== b.pageIndex) {
      return a.pageIndex - b.pageIndex;
    }
    if (a.position && b.position) {
      return a.position.y - b.position.y;
    }
    return 0;
  });
  
  console.log('\n[merge] EPUB containers (sorted):');
  sortedEpubPositions.forEach((pos, idx) => {
    console.log(`  [${idx}] Page ${pos.pageIndex}, Container: ${pos.containerId}, Y: ${pos.position.y.toFixed(1)}`);
  });
  
  console.log('\n[merge] IDML text frames (sorted):');
  sortedIdmlFrames.forEach((frame, idx) => {
    const posInfo = frame.position ? `Y: ${frame.position.y.toFixed(1)}` : 'Y: N/A';
    console.log(`  [${idx}] Story: ${frame.id}, Page: ${frame.pageIndex}, ${posInfo}`);
    console.log(`       Content: "${frame.content.substring(0, 60)}..."`);
  });
  
  const usedIdmlIndices = new Set<number>();
  
  for (const epubPos of sortedEpubPositions) {
    let bestMatch: { frame: any; score: number; index: number } | null = null;
    
    sortedIdmlFrames.forEach((idmlFrame, idx) => {
      if (usedIdmlIndices.has(idx)) return;
      
      const score = calculateMatchScore(epubPos, idmlFrame);
      
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { frame: idmlFrame, score, index: idx };
      }
    });
    
    if (bestMatch) {
      usedIdmlIndices.add(bestMatch.index);
      console.log(`✓ [merge] MATCHED: ${epubPos.containerId} (page ${epubPos.pageIndex}, y=${epubPos.position.y.toFixed(1)}) → Story ${bestMatch.frame.id} (score: ${bestMatch.score})`);
      
      const mergedText = createMergedText(epubPos, bestMatch.frame, idmlData, bookId);
      mergedTexts.push(mergedText);
    } else {
      console.warn(`✗ [merge] No match found for ${epubPos.containerId}`);
    }
  }
  
  console.log(`\n[merge] ================== MERGE COMPLETE ==================`);
  console.log(`[merge] Successfully matched: ${mergedTexts.length}/${epubTextPositions.length}`);
  
  return mergedTexts;
}

/**
 * Calcule un score de correspondance entre une position EPUB et un frame IDML
 */
function calculateMatchScore(
  epubPos: any,
  idmlFrame: any
): number {
  let score = 0;
  const content = idmlFrame.content.toLowerCase().trim();
  
  // Règle 1 : Position haute (y < 100) devrait obtenir du contenu ressemblant à un titre
  if (epubPos.position.y < 100) {
    if (content.includes('titre') || content.includes('title')) {
      score += 100;
    }
    if (idmlFrame.content.length > 10 && idmlFrame.content.length < 30) {
      score += 50;
    }
  }
  
  // Règle 2 : Position basse (y > 400) devrait obtenir du contenu restant
  if (epubPos.position.y > 400) {
    if (!content.includes('titre') && !content.includes('title')) {
      score += 50;
    }
    if (idmlFrame.content.length < 10) {
      score += 30;
    }
  }
  
  // Règle 3 : Page 2 devrait obtenir du contenu mentionnant "page"
  if (epubPos.pageIndex === 2 && content.includes('page')) {
    score += 100;
  }
  
  // Règle 4 : Match par position IDML si disponible
  if (idmlFrame.position && idmlFrame.position.y) {
    const yDiff = Math.abs(idmlFrame.position.y - epubPos.position.y);
    if (yDiff < 50) score += 200;
    else if (yDiff < 100) score += 100;
  }
  
  return score;
}

/**
 * Crée un élément de texte fusionné
 */
function createMergedText(
  epubPos: any,
  idmlFrame: any,
  idmlData: any,
  bookId: string
): any {
  const charStyleId = idmlFrame.appliedCharacterStyle;
  const paraStyleId = idmlFrame.appliedParagraphStyle;

  const charStyle = charStyleId && idmlData.characterStyles[charStyleId]
    ? idmlData.characterStyles[charStyleId]
    : {};
  
  const paraStyle = paraStyleId && idmlData.paragraphStyles[paraStyleId]
    ? idmlData.paragraphStyles[paraStyleId]
    : {};
  
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
    fontFamily: charStyle.fontFamily || 'serif',
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
