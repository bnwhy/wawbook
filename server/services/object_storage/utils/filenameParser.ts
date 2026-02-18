/**
 * Utilitaires pour parser les noms de fichiers contenant des caractéristiques
 * Format: page1_hero-father_skin-light_hair-brown.png
 */

export interface ImageCharacteristics {
  pageIndex: number | null;
  characteristics: Record<string, string>;
  combinationKey: string;
}

/**
 * Parse un nom de fichier image pour extraire les caractéristiques de personnalisation
 */
export function parseImageFilename(filename: string): ImageCharacteristics {
  const result: ImageCharacteristics = {
    pageIndex: null,
    characteristics: {},
    combinationKey: 'default',
  };
  
  // Retire l'extension
  const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|svg|webp)$/i, '');
  
  // Divise par underscore pour obtenir les parties
  const parts = nameWithoutExt.split('_');
  
  if (parts.length === 0) return result;
  
  const characteristicParts: string[] = [];
  
  for (const part of parts) {
    // Vérifie le numéro de page (page1, page2, etc.)
    const pageMatch = part.match(/^page(\d+)$/i);
    if (pageMatch) {
      result.pageIndex = parseInt(pageMatch[1], 10);
      continue;
    }
    
    // Vérifie les caractéristiques (format key-value comme hero-father, skin-light)
    const charMatch = part.match(/^([a-z]+)-([a-z0-9]+)$/i);
    if (charMatch) {
      const key = charMatch[1].toLowerCase();
      const value = charMatch[2].toLowerCase();
      result.characteristics[key] = value;
      characteristicParts.push(`${key}:${value}`);
    }
  }
  
  // Construit la clé de combinaison à partir des caractéristiques triées
  if (characteristicParts.length > 0) {
    characteristicParts.sort();
    result.combinationKey = characteristicParts.join('_');
  }
  
  return result;
}
