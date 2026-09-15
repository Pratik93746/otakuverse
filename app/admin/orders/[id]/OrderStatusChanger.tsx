'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, Truck, ExternalLink, Save } from 'lucide-react';
import { OrderStatus } from '@/lib/db/types';
import { fetchWithAuth } from '@/lib/api-client';

const statuses: { value: OrderStatus; label: string; desc: string; color: string }[] = [
  { value: 'PENDING', label: 'Pending', desc: 'Order awaiting payment or verification', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'CONFIRMED', label: 'Confirmed', desc: 'Payment verified, preparing inventory', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'PROCESSING', label: 'Processing', desc: 'Figure being packaged with collector protection', color: 'bg-purple-100 text-purple-800' },
  { value: 'SHIPPED', label: 'Shipped', desc: 'Dispatched with logistics carrier', color: 'bg-blue-100 text-blue-800' },
  { value: 'DELIVERED', label: 'Delivered', desc: 'Successfully received by customer', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Cancelled', desc: 'Order voided and closed', color: 'bg-red-100 text-red-800' },
];

const CARRIERS = ['Delhivery', 'BlueDart', 'Shiprocket', 'DTDC', 'India Post', 'Other'];

export function OrderStatusChanger({
  orderNumber,
  currentStatus,
  initialTracking,
}: {
  orderNumber: string;
  currentStatus: OrderStatus;
  initialTracking?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [carrier, setCarrier] = useState(initialTracking?.carrier || 'Delhivery');
  const [trackingNumber, setTrackingNumber] = useState(initialTracking?.trackingNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(initialTracking?.trackingUrl || '');
  const [loading, setLoading] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);

  const handleUpdate = async (newStatus: OrderStatus) => {
    if (newStatus === status) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/admin/orders/${orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          tracking: trackingNumber ? { carrier, trackingNumber, trackingUrl } : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(newStatus);
        toast.success(`Order #${orderNumber} updated to ${newStatus}`);
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to update order status');
      }
    } catch {
      toast.error('Network error updating status');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      toast.error('Please enter an AWB / Tracking number');
      return;
    }

    setSavingTracking(true);
    try {
      const res = await fetchWithAuth(`/api/admin/orders/${orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status === 'CONFIRMED' || status === 'PROCESSING' ? 'SHIPPED' : status,
          tracking: {
            carrier,
            trackingNumber: trackingNumber.trim(),
            trackingUrl: trackingUrl.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.tracking?.trackingUrl) {
          setTrackingUrl(data.tracking.trackingUrl);
        }
        if (status === 'CONFIRMED' || status === 'PROCESSING') {
          setStatus('SHIPPED');
        }
        toast.success('Courier AWB tracking details updated!');
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to save tracking info');
      }
    } catch {
      toast.error('Network error updating tracking');
    } finally {
      setSavingTracking(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Fulfillment Status Selectors */}
      <div className="bg-white border border-gray-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg tracking-wider uppercase">Order Fulfillment Status</h3>
            <p className="text-xs text-gray-500">
              Updating the status syncs with MongoDB Atlas and reflects in the customer&apos;s account instantly.
            </p>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-brand-red" />}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {statuses.map((s) => {
            const isCurrent = status === s.value;
            return (
              <button
                key={s.value}
                onClick={() => handleUpdate(s.value)}
                disabled={loading}
                className={`p-3 text-left border rounded-sm transition-all relative ${
                  isCurrent
                    ? 'border-brand-red bg-red-50/40 ring-1 ring-brand-red shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${s.color}`}>
                    {s.label}
                  </span>
                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-brand-red" />}
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Courier AWB & Tracking Dispatch Console */}
      <div className="bg-white border border-gray-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand-red" />
            <h3 className="font-heading text-base tracking-wider uppercase">
              COURIER DISPATCH & AWB TRACKING
            </h3>
          </div>
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-red hover:underline"
            >
              Live Courier Tracking <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <form onSubmit={handleSaveTracking} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Logistics Carrier
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 text-xs bg-gray-50/50 outline-none focus:border-brand-red rounded-sm"
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              AWB / Tracking Number
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. DELH123456789"
              className="w-full px-3 py-2 border border-gray-200 text-xs outline-none focus:border-brand-red rounded-sm font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingTracking}
              className="btn-dark w-full py-2 text-xs flex items-center justify-center gap-2 h-[34px]"
            >
              {savingTracking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> SAVING...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> SAVE AWB DISPATCH
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
