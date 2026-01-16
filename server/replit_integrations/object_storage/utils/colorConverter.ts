/**
 * Utilitaires pour la conversion de couleurs IDML vers format web
 */

/**
 * Convertit une valeur de couleur IDML vers hexadécimal
 */
export function convertColorToHex(space: string, colorValue: string): string {
  if (!colorValue) return '#000000';
  
  const values = colorValue.split(' ').map(v => parseFloat(v));
  
  if (space === 'RGB') {
    return rgbToHex(values[0] || 0, values[1] || 0, values[2] || 0);
  }
  
  if (space === 'CMYK') {
    return cmykToHex(values[0] || 0, values[1] || 0, values[2] || 0, values[3] || 0);
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
 */
function cmykToHex(c: number, m: number, y: number, k: number): string {
  const c2 = c / 100;
  const m2 = m / 100;
  const y2 = y / 100;
  const k2 = k / 100;
  
  const r = 255 * (1 - c2) * (1 - k2);
  const g = 255 * (1 - m2) * (1 - k2);
  const b = 255 * (1 - y2) * (1 - k2);
  
  return rgbToHex(r, g, b);
}
