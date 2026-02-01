/**
 * Server-side Text Fitter
 * Calcule la taille de police optimale pour qu'un texte tienne dans un container
 */
interface FitOptions {
  originalFontSize: number;  // en pt
  lineHeightMultiplier: number;
  textIndent: number;  // en pt
  containerWidth: number;  // en px
  containerHeight: number;  // en px
}

/**
 * Estimation de la largeur d'un texte (approximation simple)
 * Note: En production, utiliser canvas ou une librairie précise
 * Facteur augmenté pour tenir compte des polices larges (Sue Ellen Francisco + extra-expanded)
 */
function estimateTextWidth(text: string, fontSize: number): number {
  // Approximation conservative: 1 caractère ≈ 1.2 * fontSize pour polices extra-larges
  return text.length * fontSize * 1.2;
}

/**
 * Calcule le nombre de lignes nécessaires pour un texte
 */
function calculateLineCount(
  text: string,
  containerWidth: number,
  fontSize: number,
  textIndent: number
): number {
  const paragraphs = text.split('\n');
  let totalLines = 0;
  
  for (const para of paragraphs) {
    if (!para.trim()) {
      totalLines++;
      continue;
    }
    
    const words = para.split(' ');
    let currentLineWidth = 0;
    let linesInPara = 0;
    let isFirstLine = true;
    
    for (const word of words) {
      if (!word) continue;
      
      const wordWidth = estimateTextWidth(word + ' ', fontSize);
      const availableWidth = isFirstLine 
        ? containerWidth - textIndent 
        : containerWidth;
      
      if (currentLineWidth + wordWidth > availableWidth && currentLineWidth > 0) {
        linesInPara++;
        currentLineWidth = wordWidth;
        isFirstLine = false;
      } else {
        currentLineWidth += wordWidth;
      }
    }
    
    if (currentLineWidth > 0) {
      linesInPara++;
    }
    
    totalLines += linesInPara || 1;
  }
  
  return totalLines;
}

/**
 * Calcule la taille de police optimale pour qu'un texte tienne dans le container
 */
export function fitTextToContainer(
  text: string,
  options: FitOptions
): number {
  // Si pas de texte ou container invalide, retourner taille originale
  if (!text || !text.trim() || options.containerWidth <= 0 || options.containerHeight <= 0) {
    return options.originalFontSize;
  }
  
  const step = 0.5;  // Réduction par pas de 0.5pt
  const absoluteMinimum = 1;  // 1pt minimum
  
  let currentFontSize = options.originalFontSize;
  
  // Boucle de réduction
  while (currentFontSize > absoluteMinimum) {
    const lineCount = calculateLineCount(
      text,
      options.containerWidth,
      currentFontSize,
      options.textIndent
    );
    
    const lineHeight = currentFontSize * options.lineHeightMultiplier;
    const totalHeight = lineCount * lineHeight;
    
    // Si ça tient, retourner cette taille
    if (totalHeight <= options.containerHeight) {
      return currentFontSize;
    }
    
    // Réduire et continuer
    currentFontSize -= step;
  }
  
  // Minimum atteint
  return absoluteMinimum;
}
