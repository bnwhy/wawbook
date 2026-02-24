// Stripe Client for NuageBook
// Reads keys from env vars first, then falls back to DB admin settings

import Stripe from 'stripe';
import { storage } from './storage';

async function getSecretKeyFromDb(): Promise<string | null> {
  try {
    const setting = await storage.getSetting('payment');
    const val = setting?.value as { stripeSecretKey?: string; stripeEnabled?: boolean } | undefined;
    return val?.stripeSecretKey || null;
  } catch {
    return null;
  }
}

async function getPublishableKeyFromDb(): Promise<string | null> {
  try {
    const setting = await storage.getSetting('payment');
    const val = setting?.value as { stripeKey?: string } | undefined;
    return val?.stripeKey || null;
  } catch {
    return null;
  }
}

export async function getUncachableStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY || await getSecretKeyFromDb();
  if (!secretKey) {
    throw new Error('Clé secrète Stripe non configurée. Ajoutez-la dans l\'admin (Paramètres → Paiement).');
  }
  return new Stripe(secretKey);
}

export async function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY || await getSecretKeyFromDb();
  if (!secretKey) {
    throw new Error('Clé secrète Stripe non configurée. Ajoutez-la dans l\'admin (Paramètres → Paiement).');
  }
  return secretKey;
}

export async function getStripePublishableKey() {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || await getPublishableKeyFromDb();
  if (!publishableKey) {
    throw new Error('Clé publique Stripe non configurée. Ajoutez-la dans l\'admin (Paramètres → Paiement).');
  }
  return publishableKey;
}
