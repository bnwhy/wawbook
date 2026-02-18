/**
 * Module pour la construction de la configuration wizard depuis les caractéristiques détectées
 */

export interface WizardOptionServer {
  id: string;
  label: string;
  thumbnail?: string;
  resource?: string;
}

export interface WizardVariantServer {
  id: string;
  label: string;
  title?: string;
  type: 'options' | 'text' | 'checkbox';
  options?: WizardOptionServer[];
}

export interface WizardTabServer {
  id: string;
  label: string;
  type: 'character' | 'element';
  options: string[];
  variants: WizardVariantServer[];
}

/**
 * Construit la configuration wizard depuis les caractéristiques détectées
 * Retourne des tabs avec des variants pour chaque type de caractéristique
 */
export function buildWizardConfigFromCharacteristics(
  allCharacteristics: Record<string, Set<string>>
): WizardTabServer[] {
  const tabs: WizardTabServer[] = [];
  
  // Labels en français pour les caractéristiques connues
  const labelMap: Record<string, string> = {
    hero: 'Personnage principal',
    skin: 'Couleur de peau',
    hair: 'Couleur des cheveux',
    eyes: 'Couleur des yeux',
    gender: 'Genre',
    outfit: 'Tenue',
    accessory: 'Accessoire',
  };
  
  // Labels de valeurs en français
  const valueLabels: Record<string, Record<string, string>> = {
    hero: { 
      father: 'Papa', 
      mother: 'Maman', 
      boy: 'Garçon', 
      girl: 'Fille', 
      grandpa: 'Grand-père', 
      grandma: 'Grand-mère' 
    },
    skin: { 
      light: 'Claire', 
      medium: 'Moyenne', 
      dark: 'Foncée', 
      tan: 'Bronzée' 
    },
    hair: { 
      brown: 'Brun', 
      black: 'Noir', 
      blonde: 'Blond', 
      red: 'Roux', 
      grey: 'Gris', 
      white: 'Blanc' 
    },
    eyes: { 
      brown: 'Marron', 
      blue: 'Bleu', 
      green: 'Vert', 
      hazel: 'Noisette' 
    },
    gender: { 
      male: 'Masculin', 
      female: 'Féminin' 
    },
  };
  
  // Tri des clés pour un ordre cohérent
  const orderedKeys = ['hero', 'gender', 'skin', 'hair', 'eyes', 'outfit', 'accessory'];
  const sortedKeys = Object.keys(allCharacteristics).sort((a, b) => {
    const aIndex = orderedKeys.indexOf(a);
    const bIndex = orderedKeys.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  
  for (const key of sortedKeys) {
    const values = allCharacteristics[key];
    if (!values || values.size === 0) continue;
    
    const options: WizardOptionServer[] = [];
    const sortedValues = Array.from(values).sort();
    
    for (const value of sortedValues) {
      const label = valueLabels[key]?.[value] || capitalizeFirst(value);
      options.push({
        id: value,
        label,
      });
    }
    
    // Crée un variant unique par onglet de caractéristique
    const variant: WizardVariantServer = {
      id: key,
      label: labelMap[key] || capitalizeFirst(key),
      title: labelMap[key] || capitalizeFirst(key),
      type: 'options',
      options,
    };
    
    tabs.push({
      id: key,
      label: labelMap[key] || capitalizeFirst(key),
      type: 'character',
      options: [],
      variants: [variant],
    });
  }
  
  return tabs;
}

/**
 * Met en majuscule la première lettre
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
