/**
 * Validateur d'ordre de lecture pour les TextFrames IDML
 * Inspiré de idml2html-python qui identifie le défi majeur de préserver l'ordre de lecture
 */

export interface ReadingOrderValidation {
  valid: boolean;
  warnings: string[];
  correctedOrder?: number[];
}

interface FrameWithPosition {
  id: string;
  position: { x: number; y: number };
  layoutOrder?: number;
}

export class ReadingOrderValidator {
  /**
   * Valide que l'ordre des TextFrames correspond à l'ordre de lecture logique
   * basé sur les positions (top-to-bottom, left-to-right par défaut)
   * 
   * @param frames - Liste des frames avec positions
   * @param pageIndex - Numéro de page (pour logging)
   * @param tolerance - Tolérance en pixels pour considérer deux Y comme égaux (défaut: 10px)
   * @returns Résultat de validation avec warnings si nécessaire
   */
  static validateReadingOrder(
    frames: FrameWithPosition[],
    pageIndex: number,
    tolerance: number = 10
  ): ReadingOrderValidation {
    const warnings: string[] = [];

    if (frames.length === 0) {
      return { valid: true, warnings: [] };
    }

    // Trier par position visuelle (top -> bottom, left -> right)
    const visualOrder = [...frames].sort((a, b) => {
      const yDiff = a.position.y - b.position.y;
      // Si la différence Y est significative, trier par Y
      if (Math.abs(yDiff) > tolerance) {
        return yDiff;
      }
      // Sinon, trier par X (même ligne)
      return a.position.x - b.position.x;
    });

    // Trier par layoutOrder si présent
    const layoutOrder = [...frames].sort((a, b) =>
      (a.layoutOrder || 0) - (b.layoutOrder || 0)
    );

    // Vérifier les différences
    const hasDiscrepancy = visualOrder.some(
      (frame, idx) => frame.id !== layoutOrder[idx]?.id
    );

    if (hasDiscrepancy) {
      warnings.push(
        `Page ${pageIndex}: Reading order discrepancy detected. ` +
        `Visual order differs from layout order. ` +
        `Consider reviewing InDesign document structure.`
      );

      // Identifier les frames en conflit
      const conflicts: string[] = [];
      for (let i = 0; i < visualOrder.length; i++) {
        if (visualOrder[i].id !== layoutOrder[i]?.id) {
          conflicts.push(
            `Position ${i}: visual=${visualOrder[i].id}, layout=${layoutOrder[i]?.id}`
          );
        }
      }

      if (conflicts.length > 0 && conflicts.length <= 5) {
        warnings.push(`Conflicts: ${conflicts.join('; ')}`);
      }
    }

    return {
      valid: !hasDiscrepancy,
      warnings,
      correctedOrder: hasDiscrepancy
        ? visualOrder.map(f => frames.indexOf(f))
        : undefined,
    };
  }

  /**
   * Détecte les frames liés (linked text frames) dans IDML
   * Les frames liés forment des chaînes où le texte coule d'un frame au suivant
   * 
   * @param idmlData - Données IDML complètes
   * @returns Map des chaînes de frames liés (clé: premier frame ID, valeur: liste des IDs liés)
   */
  static detectLinkedFrames(_idmlData: any): Map<string, string[]> {
    const linkedChains = new Map<string, string[]>();

    // TODO: Parser les Spreads pour trouver les NextTextFrame / PreviousTextFrame
    // Structure IDML typique :
    // <TextFrame Self="..." NextTextFrame="u123" PreviousTextFrame="u120">
    //
    // Algorithme :
    // 1. Parcourir tous les Spreads
    // 2. Pour chaque TextFrame, récupérer NextTextFrame
    // 3. Construire les chaînes en suivant les liens
    // 4. Identifier le premier frame de chaque chaîne (celui sans PreviousTextFrame)

    return linkedChains;
  }

  /**
   * Détecte les layouts multi-colonnes
   * Utile pour comprendre l'ordre de lecture attendu
   * 
   * @param frames - Liste des frames
   * @param pageWidth - Largeur de la page
   * @returns True si le layout semble être multi-colonnes
   */
  static detectMultiColumnLayout(
    frames: FrameWithPosition[],
    pageWidth: number
  ): boolean {
    if (frames.length < 2) return false;

    // Grouper les frames par colonne approximative
    const columns: FrameWithPosition[][] = [];
    const columnWidth = pageWidth / 3; // Supposer maximum 3 colonnes

    for (const frame of frames) {
      const columnIndex = Math.floor(frame.position.x / columnWidth);
      if (!columns[columnIndex]) {
        columns[columnIndex] = [];
      }
      columns[columnIndex].push(frame);
    }

    // Si on a au moins 2 colonnes avec plusieurs frames chacune
    const nonEmptyColumns = columns.filter(col => col && col.length > 0);
    return nonEmptyColumns.length >= 2;
  }

  /**
   * Suggère un ordre de lecture corrigé basé sur l'analyse visuelle
   * 
   * @param frames - Liste des frames
   * @param pageWidth - Largeur de la page
   * @param tolerance - Tolérance Y en pixels
   * @returns Frames réordonnés
   */
  static suggestReadingOrder(
    frames: FrameWithPosition[],
    pageWidth: number,
    tolerance: number = 10
  ): FrameWithPosition[] {
    const isMultiColumn = this.detectMultiColumnLayout(frames, pageWidth);

    if (isMultiColumn) {
      // Pour multi-colonnes : trier par X d'abord (colonnes), puis par Y dans chaque colonne
      return [...frames].sort((a, b) => {
        const xDiff = a.position.x - b.position.x;
        if (Math.abs(xDiff) > pageWidth / 4) {
          return xDiff; // Différente colonne
        }
        return a.position.y - b.position.y; // Même colonne
      });
    } else {
      // Pour layout simple : trier par Y d'abord, puis par X
      return [...frames].sort((a, b) => {
        const yDiff = a.position.y - b.position.y;
        if (Math.abs(yDiff) > tolerance) {
          return yDiff;
        }
        return a.position.x - b.position.x;
      });
    }
  }
}
