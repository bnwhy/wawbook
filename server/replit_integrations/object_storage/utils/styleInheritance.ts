/**
 * Utilitaires pour la résolution d'héritage des styles IDML
 * Implémentation robuste avec détection de cycles
 */

import {
  IdmlStyleNotFoundError,
  IdmlInheritanceCycleError,
} from '../errors/IdmlErrors';

/**
 * Résout l'héritage d'un style de manière récursive avec détection de cycles
 * 
 * @template T - Type des propriétés du style
 * @param styleId - ID du style à résoudre
 * @param rawMap - Map contenant tous les styles bruts
 * @param resolver - Fonction qui extrait les propriétés d'un style brut
 * @param styleType - Type de style ('character' | 'paragraph') pour les messages d'erreur
 * @param visited - Set des styles déjà visités (pour détection de cycles)
 * @returns Propriétés du style avec héritage résolu
 * @throws IdmlInheritanceCycleError si un cycle est détecté
 * @throws IdmlStyleNotFoundError si un style référencé n'existe pas
 */
export function resolveInheritance<T extends Record<string, any>>(
  styleId: string,
  rawMap: Map<string, any>,
  resolver: (style: any) => Partial<T>,
  styleType: 'character' | 'paragraph',
  visited: Set<string> = new Set()
): Partial<T> {
  // 1. Détection de cycle
  if (visited.has(styleId)) {
    throw new IdmlInheritanceCycleError(styleId, Array.from(visited));
  }

  visited.add(styleId);

  // 2. Récupérer le style
  let style = rawMap.get(styleId);
  
  // 2b. Essayer avec normalisation si pas trouvé
  if (!style) {
    // Essayer sans préfixe CharacterStyle/ ou ParagraphStyle/
    const normalizedId = styleId.replace(/^(CharacterStyle|ParagraphStyle)\//, '');
    style = rawMap.get(normalizedId);
    
    // Essayer avec préfixe si pas trouvé
    if (!style) {
      const prefix = styleType === 'character' ? 'CharacterStyle/' : 'ParagraphStyle/';
      style = rawMap.get(prefix + styleId);
    }
  }
  
  if (!style) {
    throw new IdmlStyleNotFoundError(styleId, styleType);
  }

  // 3. Vérifier s'il y a un parent (BasedOn)
  const basedOn = style['@_BasedOn'];
  
  // Styles de base sans héritage
  const noInheritanceIds = [
    '$ID/[No character style]',
    '$ID/[No paragraph style]',
    'CharacterStyle/$ID/[No character style]',
    'ParagraphStyle/$ID/[No paragraph style]',
    '$ID/NormalParagraphStyle',
    'ParagraphStyle/$ID/NormalParagraphStyle',
  ];
  
  if (!basedOn || noInheritanceIds.includes(basedOn)) {
    // Pas d'héritage, retourner les propriétés du style
    return resolver(style);
  }

  // 4. Résolution récursive avec le parent
  const parentProps = resolveInheritance(
    basedOn,
    rawMap,
    resolver,
    styleType,
    visited
  );
  
  const currentProps = resolver(style);

  // 5. Merge : propriétés actuelles écrasent celles du parent
  // On ne merge que les propriétés définies (non undefined)
  const merged: Partial<T> = { ...parentProps };
  
  for (const [key, value] of Object.entries(currentProps)) {
    if (value !== undefined) {
      merged[key as keyof T] = value;
    }
  }

  return merged;
}

/**
 * Détecte si un graphe de styles contient des cycles
 * Utile pour valider les styles avant traitement
 * 
 * @param stylesMap - Map de tous les styles
 * @returns Liste des cycles détectés (chaque cycle est un array de style IDs)
 */
export function detectStyleCycles(stylesMap: Map<string, any>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function visit(styleId: string, path: string[]): void {
    if (recursionStack.has(styleId)) {
      // Cycle détecté
      const cycleStart = path.indexOf(styleId);
      const cycle = path.slice(cycleStart);
      cycle.push(styleId);
      cycles.push(cycle);
      return;
    }

    if (visited.has(styleId)) {
      return;
    }

    visited.add(styleId);
    recursionStack.add(styleId);

    const style = stylesMap.get(styleId);
    const basedOn = style?.['@_BasedOn'];

    if (basedOn) {
      visit(basedOn, [...path, styleId]);
    }

    recursionStack.delete(styleId);
  }

  // Vérifier tous les styles
  for (const styleId of stylesMap.keys()) {
    if (!visited.has(styleId)) {
      visit(styleId, []);
    }
  }

  return cycles;
}

/**
 * Construit un arbre d'héritage pour debugging
 * Utile pour visualiser les relations entre styles
 * 
 * @param styleId - ID du style racine
 * @param stylesMap - Map de tous les styles
 * @returns Arbre d'héritage sous forme de string
 */
export function buildInheritanceTree(
  styleId: string,
  stylesMap: Map<string, any>,
  indent: string = ''
): string {
  const style = stylesMap.get(styleId);
  if (!style) return `${indent}${styleId} (NOT FOUND)`;

  const name = style['@_Name'] || styleId;
  const basedOn = style['@_BasedOn'];

  if (!basedOn || basedOn.includes('[No')) {
    return `${indent}${name}`;
  }

  return `${indent}${name}\n${buildInheritanceTree(basedOn, stylesMap, indent + '  ')}`;
}
