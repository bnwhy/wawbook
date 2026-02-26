import express from "express";
import { storage, pool } from "../storage";
import { insertOrderSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { stripeService } from "../stripeService";
import { requireAuth } from "../middleware/auth";
import { sendOrderConfirmation, sendShippingConfirmation } from "../services/emailService";

const router = express.Router();

// GET /api/orders/next-id
router.get("/next-id", async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT nextval('order_number_seq') as seq");
    const seq = result.rows[0].seq;
    const year = new Date().getFullYear().toString().slice(-2);
    const orderId = `ORD-${year}-${String(seq).padStart(7, '0')}`;
    res.json({ orderId });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders
router.get("/", async (_req, res, next) => {
  try {
    const orders = await storage.getAllOrders();
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/my-orders - Get orders for authenticated customer (protected)
router.get("/my-orders", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    const orders = await storage.getOrdersByCustomer(req.user.id);
    logger.info({ customerId: req.user.id, orderCount: orders.length }, 'Customer orders retrieved');
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res, next) => {
  try {
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      throw new NotFoundError('Order', req.params.id);
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:customerId/orders
router.get("/customer/:customerId", async (req, res, next) => {
  try {
    const orders = await storage.getOrdersByCustomer(req.params.customerId);
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// POST /api/orders
router.post("/", async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      totalAmount: req.body.totalAmount !== undefined ? String(req.body.totalAmount) : undefined,
    };
    const validationResult = insertOrderSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(fromZodError(validationResult.error).message);
    }
    const order = await storage.createOrder(validationResult.data);
    logger.info({ orderId: order.id }, 'Order created');
    sendOrderConfirmation(order).catch(err =>
      logger.warn({ err, orderId: order.id }, 'Failed to send order confirmation email')
    );
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/orders/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      totalAmount: req.body.totalAmount !== undefined ? String(req.body.totalAmount) : undefined,
    };
    const prevOrder = await storage.getOrder(req.params.id);
    const order = await storage.updateOrder(req.params.id, body);
    if (!order) {
      throw new NotFoundError('Order', req.params.id);
    }
    logger.info({ orderId: order.id }, 'Order updated');
    if (body.status === 'shipped' && prevOrder?.status !== 'shipped') {
      sendShippingConfirmation(order).catch(err =>
        logger.warn({ err, orderId: order.id }, 'Failed to send shipping confirmation email')
      );
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/orders/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await storage.deleteOrder(req.params.id);
    logger.info({ orderId: req.params.id }, 'Order deleted');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id/payment-status
router.get("/:id/payment-status", async (req, res, next) => {
  try {
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      throw new NotFoundError('Order', req.params.id);
    }

    // If we have a Stripe session ID, get fresh status from Stripe
    if (order.stripeSessionId) {
      try {
        const paymentResult = await stripeService.getPaymentStatus(order.stripeSessionId);
        
        // Update if status changed
        if (paymentResult.status !== order.paymentStatus) {
          await storage.updateOrder(order.id, {
            paymentStatus: paymentResult.status,
            stripePaymentIntentId: paymentResult.paymentIntentId,
          });
        }
        
        res.json({
          paymentStatus: paymentResult.status,
          stripeSessionId: order.stripeSessionId,
          stripePaymentIntentId: paymentResult.paymentIntentId,
        });
      } catch (stripeError) {
        logger.warn({ err: stripeError, orderId: order.id }, 'Failed to get payment status from Stripe');
        // If Stripe fails, return stored status
        res.json({
          paymentStatus: order.paymentStatus || 'pending',
          stripeSessionId: order.stripeSessionId,
        });
      }
    } else {
      res.json({
        paymentStatus: order.paymentStatus || 'pending',
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
