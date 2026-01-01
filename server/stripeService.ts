// Stripe Service for NuageBook
// Integration: stripe

import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

export class StripeService {
  async createCustomer(email: string, name?: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      name,
    });
  }

  async createCheckoutSession(params: {
    customerEmail: string;
    lineItems: Array<{ name: string; description?: string; amount: number; quantity: number }>;
    shippingOption?: { name: string; description?: string; amount: number };
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    const stripe = await getUncachableStripeClient();
    
    const sessionConfig: any = {
      payment_method_types: ['card'],
      customer_email: params.customerEmail,
      line_items: params.lineItems.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
            ...(item.description && { description: item.description }),
          },
          unit_amount: Math.round(item.amount * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    };

    if (params.shippingOption) {
      sessionConfig.shipping_options = [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: Math.round(params.shippingOption.amount * 100),
            currency: 'eur',
          },
          display_name: params.shippingOption.name,
          ...(params.shippingOption.description && { 
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 5 },
            }
          }),
        },
      }];
    }

    return await stripe.checkout.sessions.create(sessionConfig);
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async listPrices(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async getCheckoutSession(sessionId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.retrieve(sessionId);
  }

  async getPaymentStatus(sessionId: string): Promise<{
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentIntentId?: string;
  }> {
    const session = await this.getCheckoutSession(sessionId);
    
    if (session.payment_status === 'paid') {
      return {
        status: 'paid',
        paymentIntentId: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id,
      };
    } else if (session.payment_status === 'unpaid') {
      return { status: 'pending' };
    } else {
      return { status: 'failed' };
    }
  }
}

export const stripeService = new StripeService();
