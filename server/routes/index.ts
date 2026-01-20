import type { Express } from "express";
import express from "express";
import type { Server } from "http";
import * as path from "path";
import { registerObjectStorageRoutes } from "../replit_integrations/object_storage";
import booksRouter from "./books.routes";
import customersRouter from "./customers.routes";
import ordersRouter from "./orders.routes";
import checkoutRouter from "./checkout.routes";
import shippingRouter from "./shipping.routes";
import printersRouter from "./printers.routes";
import menusRouter from "./menus.routes";
import settingsRouter from "./settings.routes";
import healthRouter from "./health.routes";
import { logger } from "../utils/logger";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve local book assets (images, fonts)
  const assetsPath = path.join(process.cwd(), 'server', 'assets');
  app.use('/assets', express.static(assetsPath, {
    maxAge: '1y',
    immutable: true,
  }));
  logger.info({ assetsPath }, 'Serving local assets');

  // Health check routes (no /api prefix for easier monitoring)
  app.use("/health", healthRouter);

  // API routes
  app.use("/api/books", booksRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/checkout", checkoutRouter);
  app.use("/api/shipping-zones", shippingRouter);
  app.use("/api/printers", printersRouter);
  app.use("/api/menus", menusRouter);
  app.use("/api/settings", settingsRouter);

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  logger.info('All routes registered');

  return httpServer;
}
