import express from "express";
import { pool } from "../storage";
import { logger } from "../utils/logger";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// DELETE /api/admin/reset/all - Reset all data (dangerous!)
router.delete("/reset/all", requireAuth, async (req, res, next) => {
  try {
    logger.warn({ userId: req.user?.id }, 'Admin requested full database reset');
    
    // Delete all data in order (respecting foreign keys)
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM customers');
    await pool.query('DELETE FROM books');
    await pool.query('DELETE FROM shipping_zones');
    await pool.query('DELETE FROM printers');
    await pool.query('DELETE FROM menus');
    await pool.query('DELETE FROM settings');
    
    // Reset sequences
    await pool.query("SELECT setval('order_number_seq', 1, false)");
    
    logger.info('Database reset completed');
    res.json({ message: 'Toutes les données ont été supprimées avec succès' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to reset database');
    next(error);
  }
});

// DELETE /api/admin/reset/books - Reset only books
router.delete("/reset/books", requireAuth, async (req, res, next) => {
  try {
    logger.warn({ userId: req.user?.id }, 'Admin requested books reset');
    
    await pool.query('DELETE FROM books');
    
    logger.info('Books reset completed');
    res.json({ message: 'Tous les livres ont été supprimés avec succès' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to reset books');
    next(error);
  }
});

// DELETE /api/admin/reset/customers - Reset only customers
router.delete("/reset/customers", requireAuth, async (req, res, next) => {
  try {
    logger.warn({ userId: req.user?.id }, 'Admin requested customers reset');
    
    // Delete customers (will cascade to orders if foreign key is set up that way)
    await pool.query('DELETE FROM customers');
    
    logger.info('Customers reset completed');
    res.json({ message: 'Tous les clients ont été supprimés avec succès' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to reset customers');
    next(error);
  }
});

// DELETE /api/admin/reset/orders - Reset only orders
router.delete("/reset/orders", requireAuth, async (req, res, next) => {
  try {
    logger.warn({ userId: req.user?.id }, 'Admin requested orders reset');
    
    await pool.query('DELETE FROM orders');
    
    // Reset order number sequence
    await pool.query("SELECT setval('order_number_seq', 1, false)");
    
    logger.info('Orders reset completed');
    res.json({ message: 'Toutes les commandes ont été supprimées avec succès' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to reset orders');
    next(error);
  }
});

// GET /api/admin/stats - Get database statistics
router.get("/stats", requireAuth, async (_req, res, next) => {
  try {
    const booksCount = await pool.query('SELECT COUNT(*) FROM books');
    const customersCount = await pool.query('SELECT COUNT(*) FROM customers');
    const ordersCount = await pool.query('SELECT COUNT(*) FROM orders');
    const shippingZonesCount = await pool.query('SELECT COUNT(*) FROM shipping_zones');
    
    res.json({
      books: parseInt(booksCount.rows[0].count),
      customers: parseInt(customersCount.rows[0].count),
      orders: parseInt(ordersCount.rows[0].count),
      shippingZones: parseInt(shippingZonesCount.rows[0].count),
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get stats');
    next(error);
  }
});

export default router;
