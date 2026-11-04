import type { PaymentProvider, ProviderPayment, ProviderRefund } from '@/lib/payments/provider';

/** In-memory stand-in for Razorpay. Records calls so tests can assert "exactly one refund was created". */
export function makeFakeProvider() {
  const payments = new Map<string, ProviderPayment>();
  const refunds = new Map<string, ProviderRefund[]>();
  const calls = { fetch: 0, capture: 0, createRefund: 0, listRefunds: 0 };
  const state = { down: false, refundError: null as Error | null, refundDelayMs: 0 };

  const provider: PaymentProvider = {
    async fetchPayment(id) {
      calls.fetch++;
      if (state.down) throw new Error('gateway down');
      const p = payments.get(id);
      if (!p) throw new Error('payment not found');
      return { ...p };
    },
    async capturePayment(id, amount, currency) {
      calls.capture++;
      const p = payments.get(id);
      if (!p || p.amount !== amount || p.currency !== currency) throw new Error('capture rejected');
      p.status = 'captured';
      return { ...p };
    },
    async listRefunds(id) {
      calls.listRefunds++;
      return [...(refunds.get(id) || [])];
    },
    async createRefund(id, amount) {
      calls.createRefund++;
      if (state.refundDelayMs) await new Promise((r) => setTimeout(r, state.refundDelayMs));
      if (state.refundError) throw state.refundError;
      const r: ProviderRefund = { id: `rfnd_${calls.createRefund}`, payment_id: id, amount, status: 'processed' };
      refunds.set(id, [...(refunds.get(id) || []), r]);
      return r;
    },
  };

  return {
    provider, calls, state, refunds,
    addPayment: (p: { id: string; order_id: string; amount: number; status?: string; currency?: string }) =>
      payments.set(p.id, { status: 'captured', currency: 'INR', ...p }),
    reset() {
      payments.clear(); refunds.clear();
      calls.fetch = calls.capture = calls.createRefund = calls.listRefunds = 0;
      state.down = false; state.refundError = null; state.refundDelayMs = 0;
    },
  };
}
