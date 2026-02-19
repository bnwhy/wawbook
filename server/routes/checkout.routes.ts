import express from "express";
import { storage } from "../storage";
import { stripeService } from "../stripeService";
import { getStripePublishableKey } from "../stripeClient";
import { ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

const router = express.Router();

// GET /api/stripe/config
router.get("/stripe/config", async (_req, res, next) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error) {
    next(error);
  }
});

// POST /api/checkout/create-session
router.post("/create-session", async (req, res, next) => {
  try {
    const { items, shippingOption, customerEmail, customerName, shippingAddress, orderId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError("Items are required");
    }

    if (!customerEmail) {
      throw new ValidationError("Customer email is required");
    }

    const lineItems = items.map((item) => ({
      name: item.name || item.title || 'Livre personnalisé',
      description: item.description,
      amount: parseFloat(item.price) || 29.90,
      quantity: item.quantity || 1,
    }));

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const session = await stripeService.createCheckoutSession({
      customerEmail,
      lineItems,
      shippingOption: shippingOption ? {
        name: shippingOption.name,
        description: shippingOption.description,
        amount: parseFloat(shippingOption.price) || 0,
      } : undefined,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/checkout/cancel`,
      metadata: {
        orderId: orderId || '',
        customerName: customerName || '',
        shippingAddress: JSON.stringify(shippingAddress || {}),
      },
    });

    logger.info({ sessionId: session.id, orderId }, 'Checkout session created');
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
});

// POST /api/checkout/verify-payment
router.post("/verify-payment", async (req, res, next) => {
  try {
    const { sessionId, orderId } = req.body;

    if (!sessionId) {
      throw new ValidationError("Session ID is required");
    }

    const paymentResult = await stripeService.getPaymentStatus(sessionId);
    
    // Update order with payment status if orderId is provided
    if (orderId) {
      await storage.updateOrder(orderId, {
        paymentStatus: paymentResult.status,
        stripeSessionId: sessionId,
        stripePaymentIntentId: paymentResult.paymentIntentId,
      });
      logger.info({ orderId, paymentStatus: paymentResult.status }, 'Order payment status updated');
    }

    res.json({
      paymentStatus: paymentResult.status,
      paymentIntentId: paymentResult.paymentIntentId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
