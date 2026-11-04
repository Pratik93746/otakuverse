import type { OrderStatus } from '@/lib/db/types';

export const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
export const CARRIERS = ['Delhivery', 'BlueDart', 'Shiprocket', 'DTDC', 'India Post', 'Other'] as const;

export interface TrackingInput { carrier: string; trackingNumber: string; trackingUrl?: string }

const TRACKING_URLS: Record<string, (n: string) => string | undefined> = {
  delhivery: (n) => `https://www.delhivery.com/track/package/${encodeURIComponent(n)}`,
  bluedart: (n) => `https://www.bluedart.com/tracking?trackNumber=${encodeURIComponent(n)}`,
  'blue dart': (n) => `https://www.bluedart.com/tracking?trackNumber=${encodeURIComponent(n)}`,
  shiprocket: (n) => `https://shiprocket.co/tracking/${encodeURIComponent(n)}`,
  dtdc: () => 'https://www.dtdc.in/tracking/shipment-tracking.asp',
};

/** Validates courier details typed by the owner. Only http(s) links are accepted. */
export function parseTracking(input: unknown): { value?: TrackingInput; error?: string } {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object') return { error: 'Tracking details are invalid.' };
  const t = input as Record<string, unknown>;
  const carrier = typeof t.carrier === 'string' ? t.carrier.trim().slice(0, 40) : '';
  const trackingNumber = typeof t.trackingNumber === 'string' ? t.trackingNumber.trim() : '';
  if (!carrier) return { error: 'Please choose the courier.' };
  if (!/^[A-Za-z0-9\-_/]{4,40}$/.test(trackingNumber)) return { error: 'The tracking (AWB) number should be 4-40 letters or numbers.' };
  let trackingUrl: string | undefined;
  if (typeof t.trackingUrl === 'string' && t.trackingUrl.trim()) {
    try {
      const u = new URL(t.trackingUrl.trim());
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('scheme');
      trackingUrl = u.toString().slice(0, 500);
    } catch {
      return { error: 'The tracking link must start with https://' };
    }
  } else {
    trackingUrl = TRACKING_URLS[carrier.toLowerCase()]?.(trackingNumber);
  }
  return { value: { carrier, trackingNumber, trackingUrl } };
}
