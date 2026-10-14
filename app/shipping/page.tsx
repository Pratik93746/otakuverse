import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Truck, Package, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Shipping Policy | BAKA Posters & Art',
  description: 'Pan-India shipping timelines, packaging, and free delivery details for BAKA.',
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-narrow bg-white p-8 sm:p-12 border border-gray-200 rounded-sm shadow-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <Truck className="w-5 h-5 text-brand-red" />
          <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Logistics & Delivery</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-wide mb-6">
          Shipping & Delivery Policy
        </h1>
        <p className="text-xs text-gray-400 mb-8 font-mono">Last Updated: October 2026</p>

        <div className="prose prose-sm text-gray-700 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Pan-India Delivery Coverage</h2>
            <p>
              We deliver to over 19,000+ PIN codes across all 28 states and 8 union territories in India. We partner with tier-1 logistics carriers including <strong>Delhivery, BlueDart, Shiprocket, and DTDC</strong> to ensure prompt delivery to your doorstep.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Processing & Dispatch Timelines</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Order Processing:</strong> Posters and prints are inspected, printed on archival fine art paper, and packaged within <strong>24 to 48 hours</strong> of order confirmation.</li>
              <li><strong>Transit Times:</strong> Metro cities typically receive delivery within <strong>3–4 business days</strong>. Rest of India (Tier 2/3 cities and remote zones) takes <strong>4–7 business days</strong>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Shipping Fees</h2>
            <p>
              We are proud to offer <strong>Free Standard Shipping on all orders across India</strong>. No hidden delivery fees are added at checkout.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Hard-Tube & Corner-Guarded Packaging</h2>
            <p>
              To ensure pristine condition upon arrival:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Unframed Posters:</strong> Rolled in waterproof kraft paper and encased in high-density spiral cylindrical tubes that withstand heavy transit pressure.</li>
              <li><strong>Framed Canvas & Wall Art:</strong> Fitted with custom corner protectors, double-wrapped in bubble cushioning, and packed in corrugated crush-resistant cartons.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Live Shipment Tracking</h2>
            <p>
              As soon as your parcel is dispatched from our fulfillment facility, you will receive an AWB tracking code and direct live tracking link via SMS / email to follow your package until delivery.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
