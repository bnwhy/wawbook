/**
 * Classes d'erreurs spécifiques au parsing IDML
 * Inspiré de SimpleIDML et de la structure d'erreurs de server/utils/errors.ts
 */

import { AppError } from '../../../utils/errors';

/**
 * Erreur de base pour tous les problèmes de parsing IDML
 */
export class IdmlParseError extends AppError {
  constructor(message: string, public filePath?: string) {
    super(400, `IDML Parse Error: ${message}`, true);
    Object.setPrototypeOf(this, IdmlParseError.prototype);
  }
}

/**
 * Erreur quand un style référencé n'existe pas
 */
export class IdmlStyleNotFoundError extends IdmlParseError {
  constructor(
    public styleId: string,
    public styleType: 'character' | 'paragraph'
  ) {
    super(`${styleType} style '${styleId}' not found`);
    Object.setPrototypeOf(this, IdmlStyleNotFoundError.prototype);
  }
}

/**
 * Erreur quand un cycle d'héritage est détecté dans les styles
 */
export class IdmlInheritanceCycleError extends IdmlParseError {
  constructor(public styleId: string, public cycle: string[]) {
    super(`Inheritance cycle detected: ${cycle.join(' → ')} → ${styleId}`);
    Object.setPrototypeOf(this, IdmlInheritanceCycleError.prototype);
  }
}

/**
 * Erreur quand une police requise est manquante
 */
export class IdmlMissingFontError extends IdmlParseError {
  constructor(public fontFamily: string, public context: string) {
    super(`Font '${fontFamily}' required but not found in ${context}`);
    Object.setPrototypeOf(this, IdmlMissingFontError.prototype);
  }
}

/**
 * Erreur quand le fichier IDML est corrompu ou mal formé
 */
export class IdmlCorruptedFileError extends IdmlParseError {
  constructor(filePath: string, public reason: string) {
    super(`Corrupted IDML file '${filePath}': ${reason}`, filePath);
    Object.setPrototypeOf(this, IdmlCorruptedFileError.prototype);
  }
}

/**
 * Erreur quand la structure XML est invalide
 */
export class IdmlInvalidXmlError extends IdmlParseError {
  constructor(public xmlPath: string, public details: string) {
    super(`Invalid XML in '${xmlPath}': ${details}`);
    Object.setPrototypeOf(this, IdmlInvalidXmlError.prototype);
  }
}

/**
 * Erreur quand un fichier requis est manquant dans le package IDML
 */
export class IdmlMissingFileError extends IdmlParseError {
  constructor(public requiredFile: string) {
    super(`Missing required file: ${requiredFile}`);
    Object.setPrototypeOf(this, IdmlMissingFileError.prototype);
  }
}
