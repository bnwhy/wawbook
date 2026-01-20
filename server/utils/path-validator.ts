import path from 'path';
import { ValidationError } from './errors';

/**
 * Valide un chemin fourni par l'utilisateur pour prévenir les attaques path traversal
 * @param userPath - Chemin fourni par l'utilisateur
 * @param basePath - Chemin de base autorisé
 * @returns Chemin résolu et validé
 * @throws ValidationError si le chemin est invalide ou dangereux
 */
export function validatePath(userPath: string, basePath: string): string {
  // Normaliser le chemin
  const normalizedPath = path.normalize(userPath);
  
  // Interdire les séquences dangereuses
  if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
    throw new ValidationError('Invalid path: path traversal detected');
  }
  
  // Interdire les chemins absolus sauf s'ils commencent par basePath
  if (path.isAbsolute(normalizedPath) && !normalizedPath.startsWith(basePath)) {
    throw new ValidationError('Invalid path: absolute paths not allowed');
  }
  
  // Résoudre le chemin complet
  const fullPath = path.resolve(basePath, normalizedPath);
  
  // Vérifier que le chemin final est bien dans le dossier de base
  if (!fullPath.startsWith(basePath + path.sep) && fullPath !== basePath) {
    throw new ValidationError('Invalid path: outside base directory');
  }
  
  return fullPath;
}

/**
 * Valide un ID de ressource (alphanumeric, hyphens et underscores uniquement)
 * @param id - ID à valider
 * @param resourceName - Nom de la ressource (pour le message d'erreur)
 * @throws ValidationError si l'ID est invalide
 */
export function validateResourceId(id: string, resourceName: string = 'Resource'): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new ValidationError(`Invalid ${resourceName} ID format`);
  }
}
