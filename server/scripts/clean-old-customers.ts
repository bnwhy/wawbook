/**
 * Script to clean old customer and order data
 * Run this before deploying the authentication system
 * 
 * Usage: tsx server/scripts/clean-old-customers.ts
 */

import { pool } from '../storage';
import { logger } from '../utils/logger';

async function cleanOldData() {
  try {
    logger.info('Starting cleanup of old customer data...');

    // Delete orders first (foreign key constraint)
    const ordersResult = await pool.query('DELETE FROM orders');
    logger.info({ count: ordersResult.rowCount }, 'Deleted orders');

    // Delete customers
    const customersResult = await pool.query('DELETE FROM customers');
    logger.info({ count: customersResult.rowCount }, 'Deleted customers');

    // Reset sequences if needed
    try {
      await pool.query("SELECT setval('order_number_seq', 1, false)");
      logger.info('Reset order_number_seq');
    } catch (seqError) {
      logger.warn('Could not reset order_number_seq (might not exist)');
    }

    logger.info('✅ Cleanup completed successfully');
    logger.info('Database is ready for the new authentication system');
  } catch (error) {
    logger.error({ err: error }, '❌ Cleanup failed');
    throw error;
  } finally {
    await pool.end();
  }
}

cleanOldData()
  .then(() => {
    console.log('\n✅ Done! You can now start the server with the new authentication system.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
