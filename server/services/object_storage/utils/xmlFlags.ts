/**
 * Flags XML avancés pour contrôler le comportement d'import XML
 * Inspiré de SimpleIDML qui utilise ces flags pour un contrôle fin de l'import
 */

export type SetContentFlag =
  | 'false'      // Ne pas mettre à jour le contenu (mais traiter les enfants)
  | 'true'       // Mettre à jour le contenu (défaut)
  | 'delete'     // Supprimer l'élément correspondant
  | 'clear'      // Vider le texte de l'élément
  | 'remove-previous-br'; // Supprimer les sauts de ligne avant l'élément

export interface XmlElementFlags {
  setContent?: SetContentFlag;
  ignoreContent?: boolean;
  forceContent?: boolean;
}

/**
 * Parse les flags depuis les attributs XML
 * 
 * Attributs supportés :
 * - simpleidml-setcontent : contrôle la mise à jour du contenu
 * - simpleidml-ignorecontent : ignore le contenu de cet élément ET ses enfants
 * - simpleidml-forcecontent : force la mise à jour même dans un contexte ignore
 * 
 * @param attributes - Attributs XML de l'élément
 * @returns Flags parsés
 */
export function parseXmlFlags(attributes: Record<string, string>): XmlElementFlags {
  const flags: XmlElementFlags = {};

  // Parse setContent (peut contenir plusieurs flags séparés par virgules)
  const setContentAttr = attributes['simpleidml-setcontent'];
  if (setContentAttr) {
    // Prendre le premier flag si plusieurs sont spécifiés
    const firstFlag = setContentAttr.split(',')[0].trim() as SetContentFlag;
    flags.setContent = firstFlag;
  }

  // Parse ignoreContent
  if (attributes['simpleidml-ignorecontent'] === 'true') {
    flags.ignoreContent = true;
  }

  // Parse forceContent
  if (attributes['simpleidml-forcecontent'] === 'true') {
    flags.forceContent = true;
  }

  return flags;
}

/**
 * Détermine si le contenu d'un élément doit être traité
 * 
 * @param flags - Flags de l'élément
 * @param parentIgnored - True si le parent est en mode ignore
 * @returns True si le contenu doit être traité
 */
export function shouldProcessContent(
  flags: XmlElementFlags,
  parentIgnored: boolean = false
): boolean {
  // forceContent force le traitement même si parent ignoré
  if (flags.forceContent) {
    return true;
  }

  // ignoreContent ou parent ignoré = pas de traitement
  if (flags.ignoreContent || parentIgnored) {
    return false;
  }

  // setContent="false" = pas de traitement
  if (flags.setContent === 'false') {
    return false;
  }

  // Par défaut, traiter le contenu
  return true;
}

/**
 * Détermine si un élément doit être supprimé
 * 
 * @param flags - Flags de l'élément
 * @returns True si l'élément doit être supprimé
 */
export function shouldDeleteElement(flags: XmlElementFlags): boolean {
  return flags.setContent === 'delete';
}

/**
 * Détermine si le contenu doit être vidé (mais l'élément conservé)
 * 
 * @param flags - Flags de l'élément
 * @returns True si le contenu doit être vidé
 */
export function shouldClearContent(flags: XmlElementFlags): boolean {
  return flags.setContent === 'clear';
}

/**
 * Détermine si les sauts de ligne précédents doivent être supprimés
 * 
 * @param flags - Flags de l'élément
 * @returns True si les <Br/> précédents doivent être retirés
 */
export function shouldRemovePreviousBr(flags: XmlElementFlags): boolean {
  return flags.setContent === 'remove-previous-br';
}

/**
 * Applique les flags à un contenu textuel
 * 
 * @param content - Contenu original
 * @param flags - Flags à appliquer
 * @returns Contenu modifié selon les flags
 */
export function applyContentFlags(
  content: string,
  flags: XmlElementFlags
): string | null {
  // delete = retourner null (indique suppression)
  if (shouldDeleteElement(flags)) {
    return null;
  }

  // clear = retourner chaîne vide
  if (shouldClearContent(flags)) {
    return '';
  }

  // remove-previous-br = retirer les \n au début
  if (shouldRemovePreviousBr(flags)) {
    return content.replace(/^\n+/, '');
  }

  // false = ne pas modifier
  if (flags.setContent === 'false') {
    return content;
  }

  // Sinon, retourner le contenu inchangé
  return content;
}

/**
 * Exemple d'utilisation dans un import XML :
 * 
 * ```typescript
 * function importXmlElement(element: any, parentIgnored: boolean = false) {
 *   const flags = parseXmlFlags(element.attributes);
 *   
 *   // Vérifier si on doit traiter
 *   if (!shouldProcessContent(flags, parentIgnored)) {
 *     return null;
 *   }
 *   
 *   // Appliquer les transformations de contenu
 *   const content = applyContentFlags(element.textContent, flags);
 *   if (content === null) {
 *     // Élément à supprimer
 *     return null;
 *   }
 *   
 *   // Traiter les enfants (avec propagation du contexte ignore)
 *   const childrenIgnored = flags.ignoreContent || parentIgnored;
 *   for (const child of element.children) {
 *     importXmlElement(child, childrenIgnored);
 *   }
 * }
 * ```
 */
