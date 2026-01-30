import { z } from 'zod';

/**
 * Schéma de validation des variables d'environnement
 * Toutes les variables nécessaires au fonctionnement de l'application
 */
const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default('5000'),
  
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // Session
  SESSION_SECRET: z.string().default('dev-secret-change-in-production'),
  
  // Google OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Apple Sign In (optional)
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  
  // Stripe (optional pour le développement)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SYNC_BACKFILL: z.enum(['true', 'false']).optional(),
  
  // Replit
  REPLIT_DOMAINS: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  
  // Optional services
  REDIS_URL: z.string().url().optional(),
  HOME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valide et parse les variables d'environnement
 * Lance une erreur si la validation échoue
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');
      
      console.error('❌ Environment validation failed:\n' + missingVars);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Variables d'environnement validées et typées
 * À utiliser partout dans l'application au lieu de process.env
 */
export const env = validateEnv();

// Log des variables chargées (masquer les secrets)
if (env.NODE_ENV === 'development') {
  console.log('✅ Environment variables loaded:', {
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    DATABASE_URL: env.DATABASE_URL ? '***configured***' : undefined,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY ? '***configured***' : undefined,
    REPLIT_DOMAINS: env.REPLIT_DOMAINS,
    LOG_LEVEL: env.LOG_LEVEL,
  });
}
