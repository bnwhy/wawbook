import { type Request, type Response, type NextFunction } from 'express';
import { type z } from 'zod';
import { ValidationError } from '../utils/errors';
import { fromZodError } from 'zod-validation-error';

/**
 * Middleware de validation centralisée utilisant Zod
 * @param schema - Schéma Zod pour valider le body de la requête
 * @returns Middleware Express
 */
export function validate(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new ValidationError(fromZodError(err).message));
      } else {
        next(err);
      }
    }
  };
}

/**
 * Validation des paramètres de requête
 */
export function validateParams(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new ValidationError(fromZodError(err).message));
      } else {
        next(err);
      }
    }
  };
}

/**
 * Validation de la query string
 */
export function validateQuery(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new ValidationError(fromZodError(err).message));
      } else {
        next(err);
      }
    }
  };
}
