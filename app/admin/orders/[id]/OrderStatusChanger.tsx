'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, Truck, ExternalLink, AlertTriangle } from 'lucide-react';
import type { DbOrder, OrderStatus } from '@/lib/db/types';
import { allowedAdminActions } from '@/lib/orders/lifecycle';
import { fetchWithAuth } from '@/lib/api-client';

const CARRIERS = ['Delhivery', 'BlueDart', 'Shiprocket', 'DTDC', 'India Post', 'Other'];

const FLAG_TEXT: Record<string, string> = {
  OUT_OF_STOCK_AFTER_PAYMENT: 'The customer paid but this item ran out of stock. Contact them, or cancel the order with a refund.',
  AMOUNT_MISMATCH: 'A payment arrived with a different amount than the order total. It was NOT accepted. Check it in your Razorpay dashboard.',
  PAID_AFTER_CANCELLATION: 'The customer paid after this order was cancelled or timed out. Please refund them.',
  DUPLICATE_PAYMENT: 'The customer paid twice for this order. Please refund the extra payment from your Razorpay dashboard.',
  REFUND_REQUIRED: 'A refund is still owed to this customer.',
  STOCK_RESTORE_FAILED: 'Stock could not be returned automatically after cancelling. Please correct the stock on the Products page.',
};

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function OrderStatusChanger({
  order,
}: {
  order: Pick<DbOrder, 'orderNumber' | 'orderStatus' | 'payment' | 'total' | 'reviewFlags' | 'tracking'>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [carrier, setCarrier] = useState(order.tracking?.carrier || 'Delhivery');
  const [trackingNumber, setTrackingNumber] = useState(order.tracking?.trackingNumber || '');

  const status = order.orderStatus;
  const isCod = order.payment?.paymentMethod === 'COD';
  const paid = order.payment?.paymentStatus === 'PAID';
  const refunded = order.payment?.paymentStatus === 'REFUNDED';
  const actions = allowedAdminActions(order as DbOrder);
  const owesRefund = status === 'CANCELLED' && paid && !isCod;

  const call = async (body: Record<string, unknown>, success: string, method: 'PATCH' | 'POST' = 'PATCH') => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/admin/orders/${order.orderNumber}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(data.error || 'Could not save. Nothing was changed — please try again.');
        if (res.status === 409) router.refresh();
      }
    } catch {
      toast.error('Could not reach the server. Nothing was changed — check your internet and try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    const refund = paid && !isCod;
    const msg = refund
      ? `Cancel order #${order.orderNumber} and refund ${rupees(order.total)} to the customer?\n\nThe money goes back to the customer's original payment method. This cannot be undone.`
      : `Cancel order #${order.orderNumber}?\n\nThe items go back into stock. This cannot be undone.`;
    if (!confirm(msg)) return;
    void call({ status: 'CANCELLED', refund }, refund ? 'Order cancelled and refund started.' : 'Order cancelled.');
  };

  const ship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return toast.error('Please enter the courier tracking (AWB) number first.');
    if (!confirm(`Mark order #${order.orderNumber} as shipped with ${carrier} tracking ${trackingNumber.trim()}?`)) return;
    void call({ status: 'SHIPPED', tracking: { carrier, trackingNumber: trackingNumber.trim() } }, 'Marked as shipped.');
  };

  return (
    <div className="space-y-4">
      {order.reviewFlags && order.reviewFlags.length > 0 && (
        <div className="border border-red-300 bg-red-50 p-4 text-sm text-red-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> This order needs your attention</p>
          <ul className="list-disc pl-5 text-xs space-y-0.5">
            {order.reviewFlags.map((f) => <li key={f}>{FLAG_TEXT[f] || f}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-white border border-gray-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-heading text-lg tracking-wider uppercase">What would you like to do?</h3>
          {busy && <Loader2 className="w-4 h-4 animate-spin text-brand-red" />}
        </div>

        {status === 'PENDING' && (
          <p className="text-xs text-gray-600 mb-3">
            Waiting for the customer to pay. You cannot pack or ship this order until the payment arrives. If they do not pay within 30 minutes it is cancelled automatically.
          </p>
        )}
        {status === 'DELIVERED' && <p className="text-xs text-gray-600 mb-3">This order is complete. Nothing more to do.</p>}
        {status === 'CANCELLED' && !owesRefund && <p className="text-xs text-gray-600 mb-3">This order is cancelled.{refunded ? ' The customer has been refunded.' : ''}</p>}
        {status === 'SHIPPED' && <p className="text-xs text-gray-600 mb-3">The parcel is with the courier. Mark it delivered once the customer has received it. If a parcel comes back to you, see the owner guide.</p>}

        <div className="flex flex-wrap gap-2">
          {actions.includes('PROCESSING') && (
            <button disabled={busy} onClick={() => call({ status: 'PROCESSING' }, 'Order is now being packed.')} className="btn-primary text-xs py-2 px-4 disabled:opacity-50">
              Start packing this order
            </button>
          )}
          {actions.includes('DELIVERED') && (
            <button
              disabled={busy}
              onClick={() => confirm(`Mark order #${order.orderNumber} as delivered?${isCod ? '\n\nThis also records the cash on delivery payment as received.' : ''}`) && call({ status: 'DELIVERED' }, 'Marked as delivered.')}
              className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
            >
              Mark as delivered
            </button>
          )}
          {actions.includes('CANCELLED') && (
            <button disabled={busy} onClick={cancel} className="text-xs py-2 px-4 border border-red-300 text-red-700 hover:bg-red-50 font-semibold disabled:opacity-50">
              {paid && !isCod ? `Cancel and refund ${rupees(order.total)}` : 'Cancel order'}
            </button>
          )}
          {owesRefund && (
            <button
              disabled={busy}
              onClick={() => confirm(`Refund ${rupees(order.total)} to the customer for order #${order.orderNumber}?`) && call({ action: 'refund' }, 'Refund started.', 'POST')}
              className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
            >
              Refund {rupees(order.total)} to customer
            </button>
          )}
        </div>
      </div>

      {(actions.includes('SHIPPED') || status === 'SHIPPED') && (
        <div className="bg-white border border-gray-200 p-5 shadow-xs">
          <h3 className="font-heading text-base tracking-wider uppercase flex items-center gap-2 mb-1"><Truck className="w-4 h-4" /> Courier details</h3>
          {order.tracking?.trackingUrl && (
            <a href={order.tracking.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 underline inline-flex items-center gap-1 mb-2">
              Track this parcel <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {actions.includes('SHIPPED') ? (
            <form onSubmit={ship} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <label className="text-[11px] font-semibold text-gray-600">
                Courier
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="input-field mt-1 w-full">
                  {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-semibold text-gray-600">
                Tracking (AWB) number
                <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="input-field mt-1 w-full" placeholder="e.g. 1234567890" />
              </label>
              <button type="submit" disabled={busy} className="btn-primary text-xs py-2.5 px-4 disabled:opacity-50">Mark as shipped</button>
            </form>
          ) : (
            <p className="text-xs text-gray-600">{order.tracking?.carrier} — {order.tracking?.trackingNumber}</p>
          )}
        </div>
      )}
    </div>
  );
}
