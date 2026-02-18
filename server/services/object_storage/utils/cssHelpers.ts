/**
 * Utilitaires pour le nettoyage et la manipulation de CSS
 */

/**
 * Nettoie les erreurs de syntaxe CSS qui peuvent empêcher le chargement des polices
 */
export function cleanCssSyntax(css: string): string {
  return css
    .replace(/\s+:/g, ':')          // Supprime les espaces avant les deux-points
    .replace(/:\s+/g, ': ')         // Normalise les espaces après les deux-points
    .replace(/\(\s+/g, '(')         // Supprime les espaces après les parenthèses ouvrantes
    .replace(/\s+\)/g, ')');        // Supprime les espaces avant les parenthèses fermantes
}

/**
 * Liste des polices natives disponibles sur Linux/Playwright
 */
export const NATIVE_LINUX_FONTS = new Set([
  // Polices génériques CSS
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
  // Polices Liberation
  'liberation sans', 'liberation serif', 'liberation mono',
  // DejaVu
  'dejavu sans', 'dejavu serif', 'dejavu sans mono', 'dejavu sans condensed',
  // Noto (Google)
  'noto sans', 'noto serif', 'noto mono', 'noto color emoji',
  // Autres polices open-source
  'freesans', 'freeserif', 'freemono',
  'ubuntu', 'ubuntu mono', 'ubuntu condensed',
  'droid sans', 'droid serif', 'droid sans mono',
  'roboto', 'roboto mono', 'roboto condensed', 'roboto slab',
  'open sans', 'lato', 'source sans pro', 'source serif pro', 'source code pro',
]);

export interface FontWarning {
  fontFamily: string;
  reason: 'not_embedded' | 'no_font_face' | 'missing_base64';
  severity: 'warning' | 'error';
  message: string;
}

/**
 * Détecte les problèmes de polices dans le CSS
 * 
 * Note: Les polices de l'EPUB sont ignorées. Elles doivent être uploadées manuellement.
 * Cette fonction vérifie uniquement si les polices utilisées sont disponibles en base64
 * ou sont des polices système natives.
 */
export function detectFontIssues(css: string, fontMap: Record<string, string> = {}): FontWarning[] {
  const warnings: FontWarning[] = [];
  const usedFonts = new Set<string>();
  
  // Vérifie si les polices ont des données base64 embarquées
  const fontsWithBase64 = extractFontsWithBase64(css);
  
  // Extrait toutes les utilisations de font-family
  const cssWithoutFontFace = css.replace(/@font-face\s*\{[^}]+\}/gi, '');
  const fontFamilyRegex = /font-family\s*:\s*([^;]+);/gi;
  
  let match;
  while ((match = fontFamilyRegex.exec(cssWithoutFontFace)) !== null) {
    const fontList = match[1]
      .split(',')
      .map(f => normalizeFontName(f.replace(/["']/g, '')))
      .filter(f => f && !['inherit', 'initial', 'unset'].includes(f));
    
    fontList.forEach(f => usedFonts.add(f));
  }
  
  // Vérifie chaque police utilisée
  for (const font of usedFonts) {
    if (NATIVE_LINUX_FONTS.has(font)) {
      continue; // Police native, pas de problème
    }
    
    if (!fontsWithBase64.has(font)) {
      warnings.push({
        fontFamily: font,
        reason: 'not_embedded',
        severity: 'error',
        message: `La police "${font}" n'est pas disponible sur le serveur. Vous devez uploader les fichiers de polices .ttf/.otf lors de l'import.`
      });
    }
  }
  
  return warnings;
}

/**
 * Normalise un nom de police pour la comparaison
 * Supprime les espaces multiples, trim, et met en minuscules
 */
function normalizeFontName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Remplace les espaces multiples par un seul
    .trim();
}

/**
 * Extrait les polices qui ont des données base64 embarquées ou des URLs valides
 */
function extractFontsWithBase64(css: string): Set<string> {
  const fontsWithBase64 = new Set<string>();
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/gi;
  
  let match;
  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];
    const familyMatch = block.match(/font-family\s*:\s*["']?([^;"']+)["']?/i);
    
    // Accept fonts with base64 data OR any URL reference (local or remote)
    if (familyMatch && (block.includes('data:font') || block.includes('data:application') || block.includes('url('))) {
      fontsWithBase64.add(normalizeFontName(familyMatch[1]));
    }
  }
  
  return fontsWithBase64;
}
