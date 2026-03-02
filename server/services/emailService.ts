import { Resend } from 'resend';
import sharp from 'sharp';
import type { Order } from '../../shared/schema';
import { logger } from '../utils/logger';
import { objectStorageClient } from './object_storage/objectStorage';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'nuagebook <orders@nuagebook.com>';

// SVG du logo nuagebook (identique à Navigation.tsx)
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="104" height="104">
  <path d="M75 10 L75 20 M75 50 L75 60 M55 35 L45 35 M105 35 L95 35 M61 21 L68 28 M82 42 L89 49 M89 21 L82 28 M61 49 L68 42" stroke="#FCD34D" stroke-width="4" stroke-linecap="round"/>
  <circle cx="75" cy="35" r="18" fill="#FCD34D"/>
  <path d="M20 70 C 10 70, 10 50, 30 50 C 30 30, 60 30, 60 50 C 70 40, 90 40, 90 60 C 90 80, 70 80, 60 80 L 30 80 C 10 80, 10 70, 20 70" fill="#60A5FA" stroke="#3B82F6" stroke-width="2"/>
  <circle cx="45" cy="65" r="3" fill="white"/>
  <circle cx="65" cy="65" r="3" fill="white"/>
  <path d="M50 72 Q 55 78, 60 72" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="42" cy="70" r="3" fill="#FF9999" opacity="0.6"/>
  <circle cx="68" cy="70" r="3" fill="#FF9999" opacity="0.6"/>
</svg>`;

let logoUrl: string | null = null;

export async function initEmailLogo(): Promise<void> {
  try {
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
    if (!R2_PUBLIC_URL) return;
    const objectKey = 'public/assets/email-logo.png';
    const pngBuffer = await sharp(Buffer.from(LOGO_SVG)).png().toBuffer();
    const file = objectStorageClient.bucket(process.env.R2_BUCKET_NAME || 'wawbook').file(objectKey);
    await file.save(pngBuffer, { contentType: 'image/png', metadata: { cacheControl: 'public, max-age=31536000' } });
    logoUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${objectKey}`;
    logger.info({ logoUrl }, 'Email logo uploaded to R2');
  } catch (err) {
    logger.warn({ err }, 'Failed to upload email logo to R2 — will use emoji fallback');
  }
}

export async function sendOrderConfirmation(order: Order): Promise<void> {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM,
      to: order.customerEmail,
      subject: `Confirmation de votre commande ${order.id}`,
      html: buildOrderConfirmationHtml(order),
    });
    logger.info({ orderId: order.id, to: order.customerEmail }, 'Order confirmation email sent');
  } catch (err) {
    throw err;
  }
}

export async function sendShippingConfirmation(order: Order): Promise<void> {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM,
      to: order.customerEmail,
      subject: `Votre commande ${order.id} est en route !`,
      html: buildShippingHtml(order),
    });
    logger.info({ orderId: order.id, to: order.customerEmail }, 'Shipping confirmation email sent');
  } catch (err) {
    throw err;
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

function formatPrice(amount: number | string): string {
  return Number(amount).toFixed(2).replace('.', ',') + ' €';
}

function itemsTable(order: Order): string {
  return order.items.map(item => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;">
        ${item.bookTitle}${item.quantity > 1 ? ` × ${item.quantity}` : ''}
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;text-align:right;white-space:nowrap;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');
}

function addressBlock(order: Order): string {
  const a = order.shippingAddress;
  return `${a.street}<br>${a.zipCode} ${a.city}<br>${a.country}`;
}

function logoBlock(): string {
  if (logoUrl) {
    return `<table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
              <tr>
                <td style="padding-right:10px;vertical-align:middle;">
                  <img src="${logoUrl}" width="52" height="52" alt="nuagebook" style="display:block;border:0;">
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:30px;font-weight:900;color:#0EA5E9;letter-spacing:-1.5px;font-family:'Nunito',Arial,Helvetica,sans-serif;text-transform:lowercase;line-height:1;">nuagebook</span>
                </td>
              </tr>
            </table>`;
  }
  // Fallback si R2 non configuré
  return `<table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
              <tr>
                <td style="padding-right:8px;vertical-align:middle;font-size:40px;line-height:1;">&#9925;</td>
                <td style="vertical-align:middle;">
                  <span style="font-size:30px;font-weight:900;color:#0EA5E9;letter-spacing:-1.5px;font-family:'Nunito',Arial,Helvetica,sans-serif;text-transform:lowercase;line-height:1;">nuagebook</span>
                </td>
              </tr>
            </table>`;
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:#E0F2FE;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#E0F2FE;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#F0F9FF;border-radius:16px 16px 0 0;padding:36px 40px 28px;text-align:center;border:1px solid #BAE6FD;border-bottom:none;">
            ${logoBlock()}
            <p style="margin:0;color:#0C4A6E;font-size:13px;font-family:Arial,Helvetica,sans-serif;">Des livres personnalisés pour petits et grands</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-left:1px solid #BAE6FD;border-right:1px solid #BAE6FD;font-family:Arial,Helvetica,sans-serif;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F0F9FF;border-radius:0 0 16px 16px;border:1px solid #BAE6FD;border-top:none;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#0C4A6E;font-family:Arial,Helvetica,sans-serif;">
              Des questions ? Répondez à cet email ou écrivez-nous à <a href="mailto:orders@nuagebook.com" style="color:#0EA5E9;font-weight:700;text-decoration:none;">orders@nuagebook.com</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">© ${new Date().getFullYear()} nuagebook · Tous droits réservés</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildOrderConfirmationHtml(order: Order): string {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;">Merci pour votre commande !</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">
      Bonjour ${order.customerName},<br>
      Votre commande a bien été reçue et est en cours de traitement.
    </p>

    <!-- Numéro de commande -->
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#0369a1;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Numéro de commande</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#0c4a6e;">${order.id}</p>
    </div>

    <!-- Articles -->
    <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Votre commande</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${itemsTable(order)}
      <tr>
        <td style="padding:16px 8px 8px;font-size:15px;font-weight:800;color:#0f172a;">Total</td>
        <td style="padding:16px 8px 8px;font-size:15px;font-weight:800;color:#0f172a;text-align:right;">${formatPrice(order.totalAmount)}</td>
      </tr>
    </table>

    <!-- Adresse -->
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid #f1f5f9;">
      <h3 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Adresse de livraison</h3>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${addressBlock(order)}</p>
    </div>

    <p style="margin:28px 0 0;font-size:14px;color:#475569;line-height:1.6;">
      Nous vous enverrons un email dès que votre commande est expédiée.<br>
      La magie est en cours de préparation ✨
    </p>
  `;
  return emailWrapper(content);
}

function buildPasswordResetHtml(firstName: string, resetLink: string): string {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;">Réinitialisez votre mot de passe</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">
      Bonjour ${firstName || 'là'},<br>
      Vous avez demandé à réinitialiser votre mot de passe nuagebook. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
    </p>

    <!-- Bouton CTA -->
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
      <tr>
        <td style="background:#0EA5E9;border-radius:10px;padding:14px 32px;text-align:center;">
          <a href="${resetLink}" style="font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;font-family:'Nunito',Arial,Helvetica,sans-serif;display:block;white-space:nowrap;">
            Réinitialiser mon mot de passe
          </a>
        </td>
      </tr>
    </table>

    <!-- Info expiration -->
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        Ce lien est valable <strong>1 heure</strong>. Passé ce délai, vous devrez faire une nouvelle demande.
      </p>
    </div>

    <!-- Lien de secours -->
    <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
    <p style="margin:0 0 24px;font-size:12px;color:#0EA5E9;word-break:break-all;">${resetLink}</p>

    <p style="margin:0;font-size:13px;color:#94a3b8;">
      Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe actuel reste inchangé.
    </p>
  `;
  return emailWrapper(content);
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName: string
): Promise<void> {
  if (!resend) return;
  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Réinitialisation de votre mot de passe nuagebook',
      html: buildPasswordResetHtml(firstName, resetLink),
    });
    logger.info({ to: email }, 'Password reset email sent');
  } catch (err) {
    logger.error({ err, to: email }, 'Failed to send password reset email');
    throw err;
  }
}

function buildShippingHtml(order: Order): string {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;">Votre commande est en route ! 🚀</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">
      Bonjour ${order.customerName},<br>
      Bonne nouvelle ! Votre commande <strong>${order.id}</strong> a été expédiée.
    </p>

    ${order.trackingNumber ? `
    <!-- Numéro de suivi -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Numéro de suivi</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#15803d;">${order.trackingNumber}</p>
    </div>
    ` : ''}

    <!-- Articles -->
    <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Votre commande</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${itemsTable(order)}
      <tr>
        <td style="padding:16px 8px 8px;font-size:15px;font-weight:800;color:#0f172a;">Total</td>
        <td style="padding:16px 8px 8px;font-size:15px;font-weight:800;color:#0f172a;text-align:right;">${formatPrice(order.totalAmount)}</td>
      </tr>
    </table>

    <!-- Adresse -->
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid #f1f5f9;">
      <h3 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Adresse de livraison</h3>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${addressBlock(order)}</p>
    </div>

    <p style="margin:28px 0 0;font-size:14px;color:#475569;line-height:1.6;">
      Votre livre personnalisé arrive bientôt entre vos mains 📖<br>
      Merci de faire confiance à nuagebook !
    </p>
  `;
  return emailWrapper(content);
}
