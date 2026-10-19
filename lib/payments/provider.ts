import { getRazorpayClient } from '@/lib/razorpay';

export interface ProviderPayment {
  id: string;
  order_id: string;
  status: string; // created | authorized | captured | refunded | failed
  amount: number; // paise
  currency: string;
}

export interface ProviderRefund {
  id: string;
  payment_id?: string;
  amount: number; // paise
  status?: string; // pending | processed | failed
}

/** The few Razorpay calls the shop needs. Kept behind an interface so flows are testable without the network. */
export interface PaymentProvider {
  fetchPayment(paymentId: string): Promise<ProviderPayment>;
  capturePayment(paymentId: string, amountPaise: number, currency: string): Promise<ProviderPayment>;
  listRefunds(paymentId: string): Promise<ProviderRefund[]>;
  createRefund(paymentId: string, amountPaise: number, notes: Record<string, string>): Promise<ProviderRefund>;
}

let override: PaymentProvider | null | undefined;

/** Test hook. Refuses to run in production so a stub can never replace the real gateway there. */
export function __setPaymentProviderForTests(p: PaymentProvider | null | undefined) {
  if (process.env.NODE_ENV === 'production') throw new Error('Payment provider override is not allowed in production');
  override = p;
}

export function getPaymentProvider(): PaymentProvider | null {
  if (override !== undefined) return override;
  const rzp = getRazorpayClient();
  if (!rzp) return null;
  const sdk = rzp as any;
  return {
    async fetchPayment(id) {
      return (await sdk.payments.fetch(id)) as ProviderPayment;
    },
    async capturePayment(id, amount, currency) {
      return (await sdk.payments.capture(id, amount, currency)) as ProviderPayment;
    },
    async listRefunds(paymentId) {
      const res = await sdk.payments.fetchMultipleRefund(paymentId);
      return (res?.items || []) as ProviderRefund[];
    },
    async createRefund(paymentId, amount, notes) {
      return (await sdk.payments.refund(paymentId, { amount, speed: 'normal', notes })) as ProviderRefund;
    },
  };
}
