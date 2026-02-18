/**
 * Parse font filename to extract family name, weight, and style
 */

interface ParsedFontName {
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
}

/**
 * Parse a font filename to extract the font family name and variant info
 * 
 * Examples:
 * - "MinionPro-Regular.otf" -> { fontFamily: "Minion Pro", fontWeight: "normal", fontStyle: "normal" }
 * - "Minion-Pro-Bold.ttf" -> { fontFamily: "Minion Pro", fontWeight: "bold", fontStyle: "normal" }
 * - "MinionPro-BoldItalic.otf" -> { fontFamily: "Minion Pro", fontWeight: "bold", fontStyle: "italic" }
 */
export function parseFontFileName(filename: string): ParsedFontName {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(ttf|otf|woff2?|eot)$/i, '');
  
  // Detect weight and style (order matters: check combined patterns first)
  let fontWeight: 'normal' | 'bold' = 'normal';
  let fontStyle: 'normal' | 'italic' = 'normal';
  
  // Check for combined patterns first (BoldItalic, BoldOblique, etc.)
  if (/(bold|black|heavy|extrabold|semibold)(italic|oblique|it)/i.test(nameWithoutExt)) {
    fontWeight = 'bold';
    fontStyle = 'italic';
  } else if (/(italic|oblique|it)(bold|black|heavy|extrabold|semibold)/i.test(nameWithoutExt)) {
    fontWeight = 'bold';
    fontStyle = 'italic';
  } else {
    // Check individual patterns
    if (/(?:^|[-_\s])(bold|black|heavy|extrabold|semibold)(?:[-_\s]|$)/i.test(nameWithoutExt)) {
      fontWeight = 'bold';
    }
    if (/(?:^|[-_\s])(italic|oblique|it)(?:[-_\s]|$)/i.test(nameWithoutExt)) {
      fontStyle = 'italic';
    }
  }
  
  // Extract base font family name by removing weight/style keywords
  let baseName = nameWithoutExt;
  
  // Remove all variant keywords (including combined ones)
  baseName = baseName.replace(/(bold|black|heavy|extrabold|semibold|light|thin|ultralight|extralight|medium|regular|normal|book|roman)(italic|oblique|it)/gi, '');
  baseName = baseName.replace(/(italic|oblique|it)(bold|black|heavy|extrabold|semibold)/gi, '');
  baseName = baseName.replace(/[-_\s]*(bold|black|heavy|extrabold|semibold|light|thin|ultralight|extralight|medium|regular|normal|book|roman|italic|oblique|it)[-_\s]*/gi, '');
  
  // Clean up multiple separators
  baseName = baseName.replace(/[-_\s]+/g, ' ').trim();
  baseName = baseName.replace(/^[-_\s]+|[-_\s]+$/g, '');
  
  // Normalize: "MinionPro" -> "Minion Pro", "OpenSans" -> "Open Sans"
  const fontFamily = normalizeFontFamilyName(baseName);
  
  return {
    fontFamily,
    fontWeight,
    fontStyle,
  };
}

/**
 * Normalize font family name by adding spaces before capitals
 */
function normalizeFontFamilyName(name: string): string {
  // If already has spaces, return as-is
  if (/\s/.test(name)) {
    return name;
  }
  
  // Add space before capital letters (e.g., "MinionPro" -> "Minion Pro")
  let result = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Handle numbers (e.g., "Helvetica65" -> "Helvetica 65")
  result = result.replace(/([a-zA-Z])(\d)/g, '$1 $2');
  
  return result;
}
