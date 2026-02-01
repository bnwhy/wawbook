/**
 * Text Fitter - Algorithme d'auto-ajustement de taille de police
 * 
 * Reproduit le comportement d'InDesign : réduire la taille de police
 * jusqu'à ce que le texte tienne dans le container (jamais de débordement).
 * 
 * @module textFitter
 */

/**
 * Résultat du calcul de fitting
 */
export interface TextFitResult {
  scale: number;              // Facteur d'échelle appliqué (1 = pas de réduction)
  fittedFontSize: number;     // Taille finale en pixels (déjà scalée pour canvas)
  lines: string[];            // Lignes après word-wrap
  totalHeight: number;        // Hauteur totale calculée
  reductionPercent: number;   // Pourcentage de réduction (0 = pas de réduction)
}

/**
 * Options pour le calcul de fitting
 */
interface FitOptions {
  originalFontSize: number;   // Taille originale en pixels (déjà * 4 pour canvas)
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  lineHeightMultiplier: number;
  letterSpacing: number;
  textIndent: number;
}

/**
 * Effectue le word-wrap d'un texte et retourne les lignes
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  fontStyle: string,
  letterSpacing: number,
  textIndent: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  
  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const para = paragraphs[pIdx];
    
    // Paragraphe vide = ligne vide
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    
    const words = para.split(' ');
    let currentLine = '';
    let isFirstLineOfPara = true;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      const effectiveWidth = metrics.width + (letterSpacing * testLine.length);
      const availableWidth = isFirstLineOfPara ? maxWidth - textIndent : maxWidth;
      
      if (effectiveWidth > availableWidth && currentLine) {
        // La ligne actuelle est pleine, passer à la suivante
        lines.push(currentLine);
        currentLine = word;
        isFirstLineOfPara = false;
      } else {
        currentLine = testLine;
      }
    }
    
    // Ajouter la dernière ligne du paragraphe
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

/**
 * Calcule la hauteur totale d'un texte avec word-wrap
 */
function calculateTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  containerWidth: number,
  fontSize: number,
  options: FitOptions
): { lines: string[]; totalHeight: number } {
  const lines = wrapText(
    ctx,
    text,
    containerWidth,
    fontSize,
    options.fontFamily,
    options.fontWeight,
    options.fontStyle,
    options.letterSpacing * (fontSize / options.originalFontSize), // Scale letterSpacing proportionnellement
    options.textIndent * (fontSize / options.originalFontSize)     // Scale textIndent proportionnellement
  );
  
  const lineHeight = fontSize * options.lineHeightMultiplier;
  const totalHeight = lines.length * lineHeight;
  
  return { lines, totalHeight };
}

/**
 * Calcule le facteur d'échelle pour que le texte tienne dans le container
 * 
 * Algorithme : réduction par pas de 0.5pt (comme InDesign) jusqu'à ce que
 * la hauteur totale soit <= hauteur du container.
 * 
 * @param ctx - Contexte Canvas 2D
 * @param text - Texte à fitter (après résolution des variables)
 * @param containerWidth - Largeur du container en pixels
 * @param containerHeight - Hauteur du container en pixels
 * @param options - Options de style (fontSize, fontFamily, etc.)
 * @returns Facteur d'échelle entre 0 et 1 (1 = pas de réduction)
 */
export function calculateTextFitScale(
  ctx: CanvasRenderingContext2D,
  text: string,
  containerWidth: number,
  containerHeight: number,
  options: FitOptions
): TextFitResult {  
  // Sécurité : si pas de texte ou pas de container, pas de fitting
  if (!text || !text.trim() || containerWidth <= 0 || containerHeight <= 0) {    return {
      scale: 1,
      fittedFontSize: options.originalFontSize,
      lines: [],
      totalHeight: 0,
      reductionPercent: 0
    };
  }
  
  const originalFontSize = options.originalFontSize;
  const step = 0.5 * 4; // 0.5pt converti en pixels canvas (facteur 4)
  const absoluteMinimum = 1 * 4; // 1pt minimum absolu
  
  let currentFontSize = originalFontSize;
  
  // Boucle de réduction (comme InDesign avec textFrame.overflows)
  while (currentFontSize > absoluteMinimum) {
    const { lines, totalHeight } = calculateTextHeight(
      ctx,
      text,
      containerWidth,
      currentFontSize,
      options
    );
    
    // Si ça tient, on a trouvé la bonne taille
    if (totalHeight <= containerHeight) {
      const scale = currentFontSize / originalFontSize;      return {
        scale,
        fittedFontSize: currentFontSize,
        lines,
        totalHeight,
        reductionPercent: (1 - scale) * 100
      };
    }
    
    // Réduire et continuer
    currentFontSize -= step;
  }
  
  // Cas extrême : même à la taille minimum, ça ne tient pas
  // On force quand même pour ne jamais déborder
  const { lines, totalHeight } = calculateTextHeight(
    ctx,
    text,
    containerWidth,
    absoluteMinimum,
    options
  );
  
  const scale = absoluteMinimum / originalFontSize;
  return {
    scale,
    fittedFontSize: absoluteMinimum,
    lines,
    totalHeight,
    reductionPercent: (1 - scale) * 100
  };
}

/**
 * Calcule le facteur d'échelle pour les segments conditionnels
 * 
 * Pour les textes avec segments de styles différents, on calcule un facteur
 * de réduction UNIFORME à appliquer à toutes les tailles de police.
 * Cela préserve les proportions relatives entre les segments.
 * 
 * @param ctx - Contexte Canvas 2D
 * @param segments - Segments actifs (déjà filtrés par condition)
 * @param containerWidth - Largeur du container en pixels
 * @param containerHeight - Hauteur du container en pixels
 * @param globalStyle - Style global du layer (fallback)
 * @param resolveVariables - Fonction pour résoudre les variables dans le texte
 * @returns Facteur d'échelle entre 0 et 1 (1 = pas de réduction)
 */
export function calculateSegmentsFitScale(
  ctx: CanvasRenderingContext2D,
  segments: any[],
  containerWidth: number,
  containerHeight: number,
  globalStyle: any,
  resolveVariables: (text: string) => string
): number {  
  // Sécurité : si pas de segments ou pas de container, pas de fitting
  if (!segments || segments.length === 0 || containerWidth <= 0 || containerHeight <= 0) {    return 1;
  }
  
  const step = 0.5 * 4; // 0.5pt en pixels canvas
  const absoluteMinimum = 1 * 4; // 1pt minimum
  
  // Taille de référence (la plus grande parmi les segments)
  let maxFontSize = 0;
  for (const segment of segments) {
    const segStyle = segment.resolvedStyle || globalStyle;
    const fontSize = parseFloat(segStyle?.fontSize?.toString() || '16') * 4;
    maxFontSize = Math.max(maxFontSize, fontSize);
  }
  
  if (maxFontSize === 0) {
    maxFontSize = 16 * 4; // Fallback
  }
  
  let scaleFactor = 1.0;
  
  // Boucle de réduction
  while (scaleFactor > absoluteMinimum / maxFontSize) {
    const totalHeight = simulateSegmentsHeight(
      ctx,
      segments,
      containerWidth,
      globalStyle,
      scaleFactor,
      resolveVariables
    );
    
    // Si ça tient, on a trouvé le bon facteur
    if (totalHeight <= containerHeight) {      return scaleFactor;
    }
    
    // Réduire le facteur
    scaleFactor -= step / maxFontSize;
  }  // Minimum atteint
  return absoluteMinimum / maxFontSize;
}

/**
 * Simule la hauteur totale des segments avec un facteur d'échelle donné
 */
function simulateSegmentsHeight(
  ctx: CanvasRenderingContext2D,
  segments: any[],
  containerWidth: number,
  globalStyle: any,
  scaleFactor: number,
  resolveVariables: (text: string) => string
): number {
  const globalFontSize = parseFloat(globalStyle?.fontSize || '16') * 4 * scaleFactor;
  const lineHeightMultiplier = parseFloat(globalStyle?.lineHeight || '1.2');
  const globalLineHeight = globalFontSize * lineHeightMultiplier;
  
  // Parse textIndent
  let textIndent = 0;
  if (globalStyle?.textIndent) {
    const ti = globalStyle.textIndent;
    if (typeof ti === 'string' && ti.endsWith('pt')) {
      textIndent = parseFloat(ti) * 4 * scaleFactor;
    } else if (typeof ti === 'number') {
      textIndent = ti * 4 * scaleFactor;
    }
  }
  
  // Simuler le word-wrap comme dans renderConditionalSegments
  let lineCount = 0;
  let currentLineWidth = 0;
  let isFirstLineOfPara = true;
  
  for (const segment of segments) {
    const segStyle = segment.resolvedStyle || globalStyle;
    const fontSize = parseFloat(segStyle?.fontSize?.toString() || '16') * 4 * scaleFactor;
    const fontFamily = segStyle?.fontFamily || 'serif';
    const fontWeight = segStyle?.fontWeight || 'normal';
    const fontStyle = segStyle?.fontStyle || 'normal';
    
    // Letter spacing scalé
    let letterSpacing = 0;
    if (segStyle?.letterSpacing && segStyle.letterSpacing !== 'normal') {
      const ls = segStyle.letterSpacing;
      if (typeof ls === 'string' && ls.endsWith('em')) {
        letterSpacing = parseFloat(ls) * fontSize;
      } else if (typeof ls === 'number') {
        letterSpacing = ls * fontSize;
      }
    }
    
    // Résoudre les variables dans le texte du segment
    let text = resolveVariables(segment.text || '');
    
    // Appliquer text-transform
    const textTransform = segStyle?.textTransform || 'none';
    if (textTransform === 'uppercase') {
      text = text.toUpperCase();
    } else if (textTransform === 'lowercase') {
      text = text.toLowerCase();
    }
    
    // Word-wrap
    const paragraphs = text.split('\n');
    
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const words = para.split(' ');
      
      for (const word of words) {
        if (!word) continue;
        
        const testWord = word + ' ';
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(testWord);
        const wordWidth = metrics.width + (letterSpacing * testWord.length);
        
        const maxWidth = isFirstLineOfPara ? containerWidth - textIndent : containerWidth;
        
        if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
          // Nouvelle ligne
          lineCount++;
          currentLineWidth = wordWidth;
          isFirstLineOfPara = false;
        } else {
          currentLineWidth += wordWidth;
        }
      }
      
      // Fin de paragraphe
      if (pIdx < paragraphs.length - 1) {
        lineCount++;
        currentLineWidth = 0;
        isFirstLineOfPara = true;
      }
    }
  }
  
  // Ajouter la dernière ligne
  if (currentLineWidth > 0) {
    lineCount++;
  }
  
  return lineCount * globalLineHeight;
}
