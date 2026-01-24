/**
 * Module pour la résolution des textes conditionnels
 * 
 * Lors de la génération du livre, cette fonction filtre les segments
 * conditionnels selon les sélections du wizard utilisateur.
 * 
 * Pattern de condition: (TXTCOND)tabId_variantId-optionId (même format que les images)
 * Ex: (TXTCOND)hero-child_gender-boy
 */

/**
 * Interface pour un segment conditionnel
 */
export interface ConditionalSegment {
  text: string;
  condition?: string;
  parsedCondition?: {
    tabId: string;
    variantId: string;
    optionId: string;
  };
  variables?: string[];
  appliedCharacterStyle?: string;
}

/**
 * Interface pour les sélections du wizard
 * Format: { tabId: { variantId: optionId } }
 * Ex: { 'hero-child': { gender: 'boy', skin: 'light' } }
 */
export type WizardSelections = Record<string, Record<string, string>>;

/**
 * Résout le texte conditionnel en filtrant les segments selon les sélections actives
 * et en remplaçant les variables de texte
 * 
 * @param segments - Segments conditionnels du TextFrame
 * @param selections - Sélections du wizard { tabId: { variantId: optionId } }
 * @returns Texte résolu après filtrage des conditions et remplacement des variables
 * 
 * @example
 * const segments = [
 *   { text: 'Le petit ', condition: 'TXTCOND_hero-child_gender-boy' },
 *   { text: 'La petite ', condition: 'TXTCOND_hero-child_gender-girl' },
 *   { text: '{name_child} joue.', variables: ['name_child'] }
 * ];
 * 
 * const result = resolveConditionalText(segments, { 'hero-child': { gender: 'boy', name: 'Tom' } });
 * // => 'Le petit Tom joue.'
 */
export function resolveConditionalText(
  segments: ConditionalSegment[],
  selections: WizardSelections
): string {
  // #region agent log
  fetch('http://localhost:7242/ingest/aa4c1bba-a516-4425-8523-5cad25aa24d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conditionalTextResolver.ts:resolveConditionalText-entry',message:'Entry',data:{segmentsCount:segments?.length||0,selections},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  if (!segments || segments.length === 0) {
    return '';
  }
  
  const result: string[] = [];
  
  for (const segment of segments) {
    // Segment sans condition: toujours inclus
    if (!segment.condition) {
      let text = segment.text;
      
      // Remplacer les variables si présentes
      if (segment.variables && segment.variables.length > 0) {
        text = resolveVariablesInText(text, selections);
      }
      
      result.push(text);
      continue;
    }
    
    // Vérifier si la condition est satisfaite
    if (isConditionActive(segment, selections)) {
      let text = segment.text;
      
      // Remplacer les variables dans le segment conditionnel actif
      if (segment.variables && segment.variables.length > 0) {
        text = resolveVariablesInText(text, selections);
      }
      
      result.push(text);
    }
  }
  
  return result.join('');
}

/**
 * Convertit un tabId de condition IDML vers le tabId du wizard
 * Mapping: "hero-child" → "child", "hero-parent" → "parent", etc.
 * Les tabIds sans préfixe "hero-" restent inchangés
 */
function mapConditionTabIdToWizardTabId(conditionTabId: string): string {
  // Si le tabId de la condition commence par "hero-", on retire ce préfixe
  if (conditionTabId.startsWith('hero-')) {
    return conditionTabId.replace(/^hero-/, '');
  }
  
  // Sinon, on retourne tel quel
  return conditionTabId;
}

/**
 * Résout les variables dans un texte selon les sélections du wizard
 * Pattern des variables InDesign: {name_child}, {age_child}, etc.
 * Mapping: {variantId_tabId} → selections[tabId][variantId]
 * 
 * Ex: {name_child} avec selections = { child: { name: 'Tom' } } → 'Tom'
 */
function resolveVariablesInText(
  text: string,
  selections: WizardSelections
): string {
  let result = text;
  
  // Pattern: {variantId_tabId} ou {variantId-tabId}
  const variablePattern = /\{([^}]+)\}/g;
  
  result = result.replace(variablePattern, (match, varName) => {
    // Essayer de parser le format variant_tab ou variant-tab
    const parts = varName.split(/[_-]/);
    
    if (parts.length === 2) {
      const [variantId, tabId] = parts;
      
      // Chercher dans les sélections avec mapping hero-*
      for (const [selTabId, selValues] of Object.entries(selections)) {
        // Vérifier si tabId correspond (avec mapping hero-child → child)
        if (selTabId === tabId || selTabId === `hero-${tabId}` || `hero-${selTabId}` === tabId) {
          if (selValues[variantId]) {
            return selValues[variantId];
          }
        }
      }
    }
    
    // Si pas trouvé, retourner la variable inchangée
    return match;
  });
  
  return result;
}

/**
 * Trouve le tabId dans les sélections après mapping
 */
function findTabSelections(
  conditionTabId: string,
  selections: WizardSelections
): Record<string, string> | undefined {
  const wizardTabId = mapConditionTabIdToWizardTabId(conditionTabId);
  return selections[wizardTabId];
}

/**
 * Vérifie si la condition d'un segment est active selon les sélections
 * 
 * Logique:
 * 1. Si parsedCondition disponible, utilise le matching structuré avec fallback hero-*
 * 2. Sinon, tente de parser la condition et matcher
 */
function isConditionActive(
  segment: ConditionalSegment,
  selections: WizardSelections
): boolean {
  const { condition, parsedCondition } = segment;
  
  if (!condition) return true;
  
  // Matching via condition parsée
  if (parsedCondition) {
    const { tabId, variantId, optionId } = parsedCondition;
    
    // Vérifier avec fallback hero-*
    const tabSelections = findTabSelections(tabId, selections);
    if (tabSelections && tabSelections[variantId] === optionId) {
      return true;
    }
    
    return false;
  }
  
  // Fallback: parser la condition manuellement
  const parsed = parseConditionName(condition);
  if (parsed) {
    const { tabId, variantId, optionId } = parsed;
    
    const tabSelections = findTabSelections(tabId, selections);
    if (tabSelections && tabSelections[variantId] === optionId) {
      return true;
    }
    
    return false;
  }
  
  // Condition inconnue: on l'inclut par défaut (sécurité)
  console.warn(`[conditionalTextResolver] Unknown condition format: ${condition}`);
  return true;
}

/**
 * Parse le nom d'une condition IDML
 * Pattern: TXTCOND_tabId_variantId-optionId (format InDesign)
 */
function parseConditionName(
  conditionRef: string
): { tabId: string; variantId: string; optionId: string } | null {
  // Retirer le préfixe "Condition/" si présent
  const conditionName = conditionRef.replace(/^Condition\//, '');
  
  // Pattern: TXTCOND_tabId_variantId-optionId
  const match = conditionName.match(/^TXTCOND_([^_]+)_([^-]+)-(.+)$/);
  if (match) {
    return {
      tabId: match[1],
      variantId: match[2],
      optionId: match[3],
    };
  }
  
  return null;
}

/**
 * Génère toutes les variantes possibles d'un texte conditionnel
 * Utile pour prévisualiser toutes les combinaisons
 * 
 * @param segments - Segments conditionnels
 * @returns Map de clé de combinaison -> texte résolu
 */
export function generateAllVariants(
  segments: ConditionalSegment[]
): Map<string, string> {
  const variants = new Map<string, string>();
  
  // Extraire tous les variants et options uniques par tab
  const tabVariantOptions: Record<string, Record<string, Set<string>>> = {};
  
  for (const segment of segments) {
    let parsed = segment.parsedCondition;
    
    // Si pas de parsedCondition, tenter de parser la condition
    if (!parsed && segment.condition) {
      parsed = parseConditionName(segment.condition) ?? undefined;
    }
    
    if (parsed) {
      const { tabId, variantId, optionId } = parsed;
      
      if (!tabVariantOptions[tabId]) {
        tabVariantOptions[tabId] = {};
      }
      if (!tabVariantOptions[tabId][variantId]) {
        tabVariantOptions[tabId][variantId] = new Set();
      }
      tabVariantOptions[tabId][variantId].add(optionId);
    }
  }
  
  // Si pas de conditions, une seule variante
  const tabIds = Object.keys(tabVariantOptions);
  if (tabIds.length === 0) {
    variants.set('default', resolveConditionalText(segments, {}));
    return variants;
  }
  
  // Générer toutes les combinaisons
  const generateCombinations = (
    tabIndex: number,
    current: WizardSelections
  ): WizardSelections[] => {
    if (tabIndex >= tabIds.length) {
      return [JSON.parse(JSON.stringify(current))];
    }
    
    const tabId = tabIds[tabIndex];
    const variantIds = Object.keys(tabVariantOptions[tabId]);
    const results: WizardSelections[] = [];
    
    // Pour chaque variant du tab, générer les combinaisons
    const generateVariantCombos = (
      variantIndex: number,
      currentTab: Record<string, string>
    ): Record<string, string>[] => {
      if (variantIndex >= variantIds.length) {
        return [{ ...currentTab }];
      }
      
      const variantId = variantIds[variantIndex];
      const options = Array.from(tabVariantOptions[tabId][variantId]);
      const combos: Record<string, string>[] = [];
      
      for (const option of options) {
        combos.push(
          ...generateVariantCombos(variantIndex + 1, { ...currentTab, [variantId]: option })
        );
      }
      
      return combos;
    };
    
    const tabCombos = generateVariantCombos(0, {});
    
    for (const tabCombo of tabCombos) {
      const newCurrent = { ...current, [tabId]: tabCombo };
      results.push(...generateCombinations(tabIndex + 1, newCurrent));
    }
    
    return results;
  };
  
  const combinations = generateCombinations(0, {});
  
  for (const combo of combinations) {
    // Créer une clé lisible
    const keyParts: string[] = [];
    for (const [tabId, variantSelections] of Object.entries(combo)) {
      for (const [variantId, optionId] of Object.entries(variantSelections)) {
        keyParts.push(`${tabId}_${variantId}-${optionId}`);
      }
    }
    const key = keyParts.sort().join('|') || 'default';
    
    const text = resolveConditionalText(segments, combo);
    variants.set(key, text);
  }
  
  return variants;
}

/**
 * Vérifie si un TextFrame contient du texte conditionnel
 */
export function hasConditionalText(
  frame: { conditionalSegments?: ConditionalSegment[] }
): boolean {
  if (!frame.conditionalSegments || frame.conditionalSegments.length === 0) {
    return false;
  }
  
  // Vérifier s'il y a au moins un segment avec une condition
  return frame.conditionalSegments.some(s => !!s.condition);
}

/**
 * Extrait les conditions uniques utilisées dans un ensemble de segments
 */
export function extractUniqueConditions(
  segments: ConditionalSegment[]
): string[] {
  const conditions = new Set<string>();
  
  for (const segment of segments) {
    if (segment.condition) {
      conditions.add(segment.condition);
    }
  }
  
  return Array.from(conditions).sort();
}
