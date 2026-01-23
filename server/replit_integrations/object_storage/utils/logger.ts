/**
 * Logger structuré pour le parser IDML
 * Utilise pino (déjà disponible dans le projet)
 */

import pino from 'pino';

export const idmlLogger = pino({
  name: 'idml-parser',
  level: process.env.IDML_LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

/**
 * Log la résolution d'un style avec héritage
 */
export function logStyleResolution(
  styleType: 'character' | 'paragraph',
  styleId: string,
  resolved: any
) {
  idmlLogger.debug(
    {
      styleType,
      styleId,
      fontFamily: resolved.fontFamily,
      fontSize: resolved.fontSize,
      basedOn: resolved.basedOn,
    },
    'Style resolved'
  );
}

/**
 * Log l'extraction d'un TextFrame
 */
export function logTextFrameExtraction(
  frameId: string,
  contentLength: number,
  variablesCount: number
) {
  idmlLogger.debug(
    {
      frameId,
      contentLength,
      variablesCount,
    },
    'TextFrame extracted'
  );
}

/**
 * Log le début du parsing d'un fichier IDML
 */
export function logParsingStart(fileName?: string) {
  idmlLogger.info(
    {
      fileName,
    },
    'Starting IDML parsing'
  );
}

/**
 * Log la fin du parsing avec statistiques
 */
export function logParsingComplete(stats: {
  characterStyles: number;
  paragraphStyles: number;
  textFrames: number;
  colors: number;
  pages: number;
  durationMs: number;
}) {
  idmlLogger.info(
    stats,
    'IDML parsing completed'
  );
}

/**
 * Log une erreur de parsing
 */
export function logParsingError(error: Error, context?: string) {
  idmlLogger.error(
    {
      error: error.message,
      stack: error.stack,
      context,
    },
    'IDML parsing error'
  );
}

/**
 * Log un warning (propriété manquante, fallback, etc.)
 */
export function logWarning(message: string, details?: any) {
  idmlLogger.warn(
    {
      message,
      ...details,
    },
    'IDML parser warning'
  );
}

/**
 * Log les validations à l'import
 */
export function logValidation(
  valid: boolean,
  errors: string[],
  warnings: string[]
) {
  if (valid) {
    idmlLogger.info('IDML package validation passed');
  } else {
    idmlLogger.error(
      {
        errors,
        warnings,
      },
      'IDML package validation failed'
    );
  }
}
