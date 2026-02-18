/**
 * Utilitaires pour la gestion des types de contenu (MIME types)
 */

const extensionToContentType: Record<string, string> = {
  // Images
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  // Polices
  'ttf': 'font/ttf',
  'otf': 'font/otf',
  'woff': 'font/woff',
  'woff2': 'font/woff2',
  'eot': 'application/vnd.ms-fontobject',
};

const contentTypeToExtension: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/**
 * Obtient le type de contenu à partir de l'extension de fichier
 */
export function getContentTypeFromExt(ext: string): string {
  return extensionToContentType[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Obtient le type de contenu pour les polices
 */
export function getFontContentType(ext: string): string {
  const type = extensionToContentType[ext.toLowerCase()];
  return type && type.startsWith('font/') ? type : 'font/ttf';
}

/**
 * Obtient l'extension à partir du type de contenu
 */
export function getExtensionFromContentType(contentType: string): string {
  return contentTypeToExtension[contentType] || 'bin';
}

/**
 * Parse un chemin d'objet simple pour extraire le bucket et le nom de l'objet
 */
export function parseObjectPathSimple(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  
  const pathParts = path.split("/");
  if (pathParts.length < 2) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return { bucketName, objectName };
}
