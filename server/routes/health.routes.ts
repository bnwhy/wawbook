import express from "express";
import { pool } from "../storage";
import { logger } from "../utils/logger";

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 * Returns the health status of the application and its dependencies
 */
router.get("/", async (_req, res) => {
  const startTime = Date.now();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: {
        status: 'unknown',
        responseTime: 0,
      },
    },
  };

  // Check database connection
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    health.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
    };
    logger.error({ err: error }, 'Database health check failed');
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness probe
 * GET /health/ready
 * Returns 200 if the app is ready to serve traffic
 */
router.get("/ready", async (_req, res) => {
  try {
    // Check if database is accessible
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    logger.error({ err: error }, 'Readiness check failed');
    res.status(503).json({ status: 'not ready' });
  }
});

/**
 * Liveness probe
 * GET /health/live
 * Returns 200 if the app is alive (basic ping)
 */
router.get("/live", (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
