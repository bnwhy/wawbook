/**
 * Extracteur de références d'images depuis IDML
 * Inspiré de idml2html-python - documente les références images même si non utilisées en production
 * 
 * Note : Dans notre architecture, les images proviennent de l'EPUB, pas de l'IDML.
 * Ce module sert principalement à la documentation et au debugging.
 */

import JSZip from 'jszip';

export interface ImageReference {
  linkResourceURI: string;
  embedded: boolean;
  frameId: string;
  pageIndex: number;
  imageType?: string; // jpg, png, etc.
}

export class ImageExtractor {
  /**
   * Extrait les références images depuis les Spreads IDML
   * (pour documentation et debug, pas utilisé en production)
   * 
   * Les images dans IDML peuvent être :
   * - Embarquées dans le ZIP (dans Links/ ou Resources/)
   * - Référencées par LinkResourceURI (chemins externes)
   * 
   * @param spreadsData - Données des Spreads parsées
   * @returns Liste des références images trouvées
   */
  static extractImageReferences(spreadsData: any[]): ImageReference[] {
    const images: ImageReference[] = [];

    for (const _spread of spreadsData) {
      // TODO: Parser les Rectangle/Polygon qui contiennent des images
      // Structure IDML typique :
      // <Rectangle Self="...">
      //   <Image Self="..." ItemTransform="...">
      //     <Link Self="..." LinkResourceURI="file:///path/to/image.jpg" />
      //   </Image>
      // </Rectangle>
      //
      // ou avec href:
      // <Image href="Links/image.jpg" />
    }

    return images;
  }

  /**
   * Vérifie si les images sont embarquées dans le IDML
   * 
   * @param zip - Package IDML (JSZip)
   * @returns Liste des chemins d'images embarquées
   */
  static async checkEmbeddedImages(zip: JSZip): Promise<string[]> {
    const embedded: string[] = [];

    // Chercher dans Links/ ou Resources/
    const linkFiles = Object.keys(zip.files).filter(
      f => f.startsWith('Links/') || f.startsWith('Resources/')
    );

    for (const file of linkFiles) {
      // Extensions d'images courantes
      if (/\.(jpg|jpeg|png|gif|tif|tiff|psd|ai|eps|pdf)$/i.test(file)) {
        embedded.push(file);
      }
    }

    return embedded;
  }

  /**
   * Analyse les dépendances d'images d'un document IDML
   * Utile pour diagnostiquer les images manquantes
   * 
   * @param zip - Package IDML
   * @returns Rapport de dépendances
   */
  static async analyzeDependencies(zip: JSZip): Promise<{
    embedded: string[];
    external: string[];
    missing: string[];
  }> {
    const embedded = await this.checkEmbeddedImages(zip);
    const external: string[] = [];
    const missing: string[] = [];

    // TODO: Parser les LinkResourceURI pour identifier les images externes
    // Comparer avec les images embarquées pour détecter les manquantes

    return {
      embedded,
      external,
      missing,
    };
  }

  /**
   * Extrait les métadonnées d'une image embarquée
   * 
   * @param zip - Package IDML
   * @param imagePath - Chemin de l'image dans le ZIP
   * @returns Métadonnées (taille, type, etc.)
   */
  static async extractImageMetadata(
    zip: JSZip,
    imagePath: string
  ): Promise<{
    path: string;
    size: number;
    type: string;
  } | null> {
    const file = zip.file(imagePath);
    if (!file) return null;

    const content = await file.async('nodebuffer');
    const extension = imagePath.split('.').pop()?.toLowerCase() || '';

    return {
      path: imagePath,
      size: content.length,
      type: extension,
    };
  }

  /**
   * Détermine le type MIME d'une image depuis son extension
   */
  static getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      tif: 'image/tiff',
      tiff: 'image/tiff',
      psd: 'image/vnd.adobe.photoshop',
      ai: 'application/postscript',
      eps: 'application/postscript',
      pdf: 'application/pdf',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}
