/**
 * Mapper pour convertir les variables IDML vers les attributs du wizard
 * Format IDML : {name_child}, {hero_father}, {skin_light}
 * Format wizard : heroID_attributID (ex: child_name, father_hero, light_skin)
 */

export interface VariableMapping {
  idmlVariable: string;        // Ex: "name_child"
  wizardAttribute: string;      // Ex: "child_name"
  heroId?: string;              // Ex: "child"
  attributeId?: string;         // Ex: "name"
  type: 'text' | 'characteristic';
}

/**
 * Parse une variable IDML et extrait hero et attribut
 * 
 * Formats supportés :
 * - {attribute_hero} → hero: hero, attribute: attribute
 * - {hero_attribute} → hero: hero, attribute: attribute
 * 
 * Exemples :
 * - {name_child} → hero: "child", attribute: "name"
 * - {hero_father} → hero: "father", attribute: "hero"
 * - {skin_light} → hero: "light", attribute: "skin" (ou inversement)
 * 
 * @param variable - Variable IDML (ex: "name_child")
 * @returns Objet avec heroId et attributeId
 */
export function parseIdmlVariable(variable: string): {
  heroId: string;
  attributeId: string;
} | null {
  // Nettoyer la variable (retirer {})
  const clean = variable.replace(/[{}]/g, '').trim();
  
  // Séparer par underscore
  const parts = clean.split('_');
  
  if (parts.length !== 2) {
    return null; // Format invalide
  }
  
  const [part1, part2] = parts;
  
  // Listes de héros connus
  const knownHeroes = ['child', 'father', 'mother', 'boy', 'girl', 'grandpa', 'grandma', 'baby', 'teen'];
  
  // Listes d'attributs connus
  const knownAttributes = ['name', 'hero', 'skin', 'hair', 'eyes', 'gender', 'outfit', 'accessory', 'age'];
  
  // Déterminer qui est le héros et qui est l'attribut
  let heroId: string;
  let attributeId: string;
  
  if (knownHeroes.includes(part1)) {
    // Format: {hero_attribute} → hero=part1, attribute=part2
    heroId = part1;
    attributeId = part2;
  } else if (knownHeroes.includes(part2)) {
    // Format: {attribute_hero} → hero=part2, attribute=part1
    heroId = part2;
    attributeId = part1;
  } else if (knownAttributes.includes(part1)) {
    // part1 est un attribut, donc part2 est le héros
    heroId = part2;
    attributeId = part1;
  } else if (knownAttributes.includes(part2)) {
    // part2 est un attribut, donc part1 est le héros
    heroId = part1;
    attributeId = part2;
  } else {
    // Par défaut : premier = attribut, second = héros
    attributeId = part1;
    heroId = part2;
  }
  
  return { heroId, attributeId };
}

/**
 * Convertit une variable IDML vers le format wizard
 * 
 * @param idmlVariable - Variable IDML (ex: "name_child")
 * @returns Variable wizard (ex: "child_name")
 */
export function idmlToWizardVariable(idmlVariable: string): string {
  const parsed = parseIdmlVariable(idmlVariable);
  if (!parsed) return idmlVariable;
  
  // Format wizard : heroID_attributID
  return `${parsed.heroId}_${parsed.attributeId}`;
}

/**
 * Convertit une variable wizard vers le format IDML
 * 
 * @param wizardVariable - Variable wizard (ex: "child_name")
 * @returns Variable IDML (ex: "{name_child}")
 */
export function wizardToIdmlVariable(wizardVariable: string): string {
  const parts = wizardVariable.split('_');
  if (parts.length !== 2) return `{${wizardVariable}}`;
  
  const [heroId, attributeId] = parts;
  
  // Format IDML : {attribute_hero}
  return `{${attributeId}_${heroId}}`;
}

/**
 * Mappe toutes les variables d'un texte IDML
 * 
 * @param idmlVariables - Liste des variables extraites de l'IDML
 * @returns Liste des mappings
 */
export function mapIdmlVariables(idmlVariables: string[]): VariableMapping[] {
  return idmlVariables.map(idmlVar => {
    const parsed = parseIdmlVariable(idmlVar);
    
    if (!parsed) {
      // Variable non parsable, garder telle quelle
      return {
        idmlVariable: idmlVar,
        wizardAttribute: idmlVar,
        type: 'text' as const
      };
    }
    
    return {
      idmlVariable: idmlVar,
      wizardAttribute: `${parsed.heroId}_${parsed.attributeId}`,
      heroId: parsed.heroId,
      attributeId: parsed.attributeId,
      type: parsed.attributeId === 'name' ? 'text' : 'characteristic'
    };
  });
}

/**
 * Crée les options de wizard depuis les variables IDML détectées
 * 
 * @param idmlVariables - Variables extraites de l'IDML
 * @returns Configuration wizard partielle
 */
export function createWizardOptionsFromIdmlVariables(
  idmlVariables: string[]
): Array<{ id: string; label: string; type: 'text' | 'options' }> {
  const mappings = mapIdmlVariables(idmlVariables);
  const options: Array<{ id: string; label: string; type: 'text' | 'options' }> = [];
  
  // Grouper par héros
  const byHero = new Map<string, VariableMapping[]>();
  
  for (const mapping of mappings) {
    if (!mapping.heroId) continue;
    
    if (!byHero.has(mapping.heroId)) {
      byHero.set(mapping.heroId, []);
    }
    byHero.get(mapping.heroId)!.push(mapping);
  }
  
  // Créer les options
  for (const [heroId, vars] of byHero) {
    for (const v of vars) {
      const label = `${v.attributeId} (${heroId})`;
      options.push({
        id: v.wizardAttribute,
        label,
        type: v.type === 'text' ? 'text' : 'options'
      });
    }
  }
  
  return options;
}
