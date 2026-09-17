import Razorpay from 'razorpay';
import crypto from 'crypto';

export function getRazorpayCredentials(): { key_id: string; key_secret: string } {
  const key_id = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  return { key_id, key_secret };
}

export function getRazorpayClient(): Razorpay | null {
  const { key_id, key_secret } = getRazorpayCredentials();

  if (!key_id || !key_secret || key_id.includes('placeholder') || key_secret.includes('placeholder')) {
    return null;
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Validates HMAC-SHA256 signature from Razorpay standard checkout
 * signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { key_secret } = getRazorpayCredentials();
  if (!key_secret || !orderId || !paymentId || !signature) {
    return false;
  }

  try {
    const generatedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const genBuf = Buffer.from(generatedSignature, 'utf-8');
    const sigBuf = Buffer.from(signature, 'utf-8');

    if (genBuf.length !== sigBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(genBuf, sigBuf);
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}
