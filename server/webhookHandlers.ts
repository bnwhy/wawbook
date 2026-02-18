// Stripe Webhook Handlers for NuageBook
import Stripe from 'stripe';
import { getUncachableStripeClient } from './stripeClient';
import { logger } from './utils/logger';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      logger.warn('STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    logger.info({ type: event.type, id: event.id }, 'Stripe webhook received');

    // TODO: Handle specific event types as needed
    // e.g. checkout.session.completed, payment_intent.succeeded, etc.
  }
}
