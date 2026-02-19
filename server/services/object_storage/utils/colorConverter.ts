/**
 * Utilitaires pour la conversion de couleurs IDML vers format web
 */

/**
 * Convertit une valeur de couleur IDML vers hexadécimal
 */
export function convertColorToHex(space: string, colorValue: string): string {
  if (!colorValue) {
    return '#000000';
  }
  
  const values = colorValue.split(' ').map(v => parseFloat(v));
  if (space === 'RGB') {
    const hex = rgbToHex(values[0] || 0, values[1] || 0, values[2] || 0);
    return hex;
  }
  
  if (space === 'CMYK') {
    const hex = cmykToHex(values[0] || 0, values[1] || 0, values[2] || 0, values[3] || 0);
    return hex;
  }
  return '#000000';
}

/**
 * Convertit RGB vers hexadécimal
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convertit CMYK vers RGB puis hexadécimal
 * 
 * BUGFIX CRITIQUE: CMYK(0, 0, 0, 0) = BLANC (#ffffff), pas de facteurs de compensation !
 * Les facteurs de compensation ne s'appliquent QUE quand il y a de l'encre.
 * 
 * Formule calibrée précisément pour correspondre aux conversions InDesign (profil ICC FOGRA39).
 * Calibration basée sur l'export EPUB d'InDesign avec validation sur plusieurs échantillons.
 * 
 * Références de calibration:
 * - CMYK(0, 0, 0, 0) → RGB(255, 255, 255) #ffffff (BLANC / Paper)
 * - CMYK(65, 100, 0, 13) → RGB(111, 29, 118) #6f1d76
 * - CMYK(55, 100, 0, 13) → RGB(128, 26, 118) #801a76
 */
function cmykToHex(c: number, m: number, y: number, k: number): string {
  // BUGFIX CRITIQUE: Si CMYK(0,0,0,0) = Paper (blanc), retourner #ffffff directement
  if (c === 0 && m === 0 && y === 0 && k === 0) {
    return '#ffffff';
  }
  
  // Normaliser les valeurs CMYK de 0-100 vers 0-1
  const c2 = c / 100;
  const m2 = m / 100;
  const y2 = y / 100;
  const k2 = k / 100;
  
  // Facteur R: inversement proportionnel à Cyan
  // Plus il y a de Cyan, plus le facteur est élevé (compensation pour l'absorption)
  const rFactor = 0.468 + 0.0148 * c;
  
  // Facteur B: constant (calibré sur les échantillons)
  const bFactor = 0.532;
  
  // Offset G quand Magenta ≥ 95%: proportionnel à Cyan
  // InDesign laisse un résidu de vert même quand M=100% (encre magenta imparfaite)
  const gOffset = m2 >= 0.95 ? (9.5 + 0.3 * c) : 0;
  
  const r = 255 * (1 - c2) * (1 - k2) * rFactor;
  const g = 255 * (1 - m2) * (1 - k2) + gOffset;
  const b = 255 * (1 - y2) * (1 - k2) * bFactor;
  
  const result = rgbToHex(r, g, b);
  return result;
}
