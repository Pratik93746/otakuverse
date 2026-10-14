import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund & Return Policy | BAKA Posters & Art',
  description: 'Easy replacement and refund policies for BAKA anime art prints.',
};

export default function RefundPolicyPage() {
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
          <RefreshCw className="w-5 h-5 text-brand-red" />
          <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Customer Assurance</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-wide mb-6">
          Refund & Return Policy
        </h1>
        <p className="text-xs text-gray-400 mb-8 font-mono">Last Updated: October 2026</p>

        <div className="prose prose-sm text-gray-700 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. 100% Replacement Guarantee on Transit Damage</h2>
            <p>
              We ship our fine art posters in heavy-duty protective cylindrical tubes and reinforced corner packaging. In the unlikely event that your poster or frame arrives damaged, creased, or defective, we provide a <strong>free immediate replacement</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Reporting a Damaged or Incorrect Item</h2>
            <p>
              To file a claim for transit damage or an incorrect item:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Contact us within <strong>48 hours</strong> of parcel delivery.</li>
              <li>Share clear photographs or a short video showing the outer packaging and the damaged poster or frame.</li>
              <li>Send the details to our WhatsApp support or official email with your <strong>Order Number</strong> (e.g. <code>OV-XXXXXX</code>).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Refund Processing</h2>
            <p>
              If a replacement cannot be provided due to out-of-stock items, we will issue a full refund to your original payment method:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Prepaid Orders (UPI/Card/Netbanking):</strong> Refunds are credited back to your original source account within <strong>5–7 business days</strong> via Razorpay.</li>
              <li><strong>COD Orders:</strong> Refunds are disbursed directly via UPI transfer after receiving your verified account handle.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Non-Returnable Items</h2>
            <p>
              Custom-sized prints or personalized commission posters cannot be returned for buyer remorse once printed, unless they arrived damaged or incorrect.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
