import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { registerRoutes as registerLegacyRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { logger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { env } from "./config/env";
import compression from "compression";
import { apiLimiter } from "./middleware/rate-limit";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initDefaultSettings() {
  try {
    logger.info('Initializing default settings...');
    
    const defaultShippingRate = await storage.getSetting('defaultShippingRate');
    if (!defaultShippingRate) {
      await storage.setSetting('defaultShippingRate', 5.99);
      logger.info('Created default shipping rate setting: 5.99€');
    }
    
    logger.info('Default settings initialized');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize default settings');
  }
}

async function initStripe() {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    logger.info('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    logger.info('Stripe schema ready');

    const stripeSync = await getStripeSync();

    logger.info('Setting up managed webhook...');
    const replitDomain = env.REPLIT_DOMAINS?.split(',')[0];
    if (replitDomain) {
      const webhookBaseUrl = `https://${replitDomain}`;
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        if (result?.webhook?.url) {
          logger.info({ webhookUrl: result.webhook.url }, 'Webhook configured');
        } else {
          logger.info('Webhook setup completed (no URL returned)');
        }
      } catch (webhookError) {
        logger.warn({ err: webhookError }, 'Could not set up managed webhook');
      }
    } else {
      logger.info('No REPLIT_DOMAINS set, skipping webhook setup');
    }

    // syncBackfill peut prendre très longtemps ou tourner indéfiniment
    // On le rend optionnel via STRIPE_SYNC_BACKFILL pour éviter qu'il bloque le démarrage
    // Par défaut, on le désactive car les webhooks gèrent la synchronisation en temps réel
    if (env.STRIPE_SYNC_BACKFILL === 'true') {
      logger.info('Starting Stripe backfill sync (this may take a while)...');
      stripeSync.syncBackfill()
        .then(() => logger.info('Stripe data synced'))
        .catch((err: unknown) => logger.error({ err }, 'Error syncing Stripe data'));
    } else {
      logger.info('Stripe backfill sync skipped (set STRIPE_SYNC_BACKFILL=true to enable)');
      logger.info('Note: Stripe data will be synced via webhooks in real-time');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Stripe');
  }
}

initDefaultSettings();
initStripe();

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        logger.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error }, `Webhook error: ${message}`);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Compression des réponses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

// Rate limiting pour les API
app.use('/api', apiLimiter);

export function log(message: string, source = "express") {
  logger.info({ source }, message);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);
  await registerLegacyRoutes(httpServer, app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Error handling middlewares (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = env.PORT;
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
