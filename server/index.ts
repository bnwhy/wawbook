import express from "express";
import { registerRoutes } from "./routes/index";
import { registerRoutes as registerLegacyRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { WebhookHandlers } from "./webhookHandlers";
import { logger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { env } from "./config/env";
import compression from "compression";
import { apiLimiter } from "./middleware/rate-limit";
import { storage, pool } from "./storage";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import { configurePassport } from "./config/passport";

const app = express();
const httpServer = createServer(app);

// Required for accurate IP detection behind reverse proxies (Docker, nginx, cloud LBs)
// Without this, all users share the same rate limit (the proxy IP)
app.set('trust proxy', 1);

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

async function initOrderSequence() {
  try {
    logger.info('Initializing order number sequence...');
    
    // Check if sequence exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'order_number_seq' AND relkind = 'S'
      ) as exists
    `);
    
    if (!checkResult.rows[0].exists) {
      // Create sequence if it doesn't exist
      await pool.query('CREATE SEQUENCE order_number_seq START WITH 1');
      logger.info('Created order_number_seq sequence');
    } else {
      logger.info('order_number_seq sequence already exists');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize order sequence');
  }
}

initDefaultSettings();
initOrderSequence();

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
      return res.status(200).json({ received: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error }, `Webhook error: ${message}`);
      return res.status(400).json({ error: 'Webhook processing error' });
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

// Session configuration
const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool: pool,
      tableName: 'session', // connect-pg-simple default table name
      createTableIfMissing: true,
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// Passport configuration
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

logger.info('Session and authentication middleware configured');

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
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
