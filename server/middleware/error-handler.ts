import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

/**
 * Middleware centralisé de gestion d'erreurs
 * Doit être enregistré après toutes les routes
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Si les headers sont déjà envoyés, déléguer à Express
  if (res.headersSent) {
    return next(err);
  }

  // Gestion des erreurs Zod (validation)
  if (err instanceof ZodError) {
    logger.warn({ err, path: req.path, body: req.body }, 'Validation error');
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Gestion des erreurs applicatives (AppError)
  if (err instanceof AppError) {
    logger.warn({ 
      err, 
      path: req.path, 
      statusCode: err.statusCode,
      isOperational: err.isOperational
    }, err.message);
    
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Erreur non prévue - critique
  logger.error({ 
    err, 
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
  }, 'Unhandled error');

  // En production, ne pas exposer les détails de l'erreur
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message || 'Internal server error';

  res.status(500).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * Middleware pour gérer les routes non trouvées (404)
 * Doit être enregistré après toutes les routes mais avant errorHandler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.path}`,
  });
}
