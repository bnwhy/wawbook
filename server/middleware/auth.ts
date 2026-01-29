import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  logger.warn({ path: req.path }, 'Unauthorized access attempt');
  res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
}

/**
 * Middleware for optional authentication
 * Continues regardless of authentication status
 * Use this when you want to provide different behavior for authenticated users
 */
export function optionalAuth(_req: Request, _res: Response, next: NextFunction) {
  // req.user will be populated if authenticated, undefined otherwise
  next();
}
