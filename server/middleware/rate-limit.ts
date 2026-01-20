import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Rate limiter général pour les API
 * 100 requêtes par IP toutes les 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite par IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded');
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later'
    });
  },
});

/**
 * Rate limiter strict pour les uploads
 * 10 uploads par heure par IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // max 10 uploads/heure
  message: 'Too many uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Upload rate limit exceeded');
    res.status(429).json({
      status: 'error',
      message: 'Too many uploads, please try again in an hour'
    });
  },
});

/**
 * Rate limiter pour les opérations sensibles (login, register, etc.)
 * 5 tentatives par IP toutes les 15 minutes
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 tentatives
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Strict rate limit exceeded');
    res.status(429).json({
      status: 'error',
      message: 'Too many attempts, account temporarily locked'
    });
  },
});

/**
 * Rate limiter pour le rendu de pages
 * 20 rendus par IP toutes les 10 minutes
 */
export const renderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // max 20 rendus
  message: 'Too many render requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Render rate limit exceeded');
    res.status(429).json({
      status: 'error',
      message: 'Too many render requests, please try again later'
    });
  },
});
