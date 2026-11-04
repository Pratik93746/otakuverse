import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | BAKA Posters & Art',
  description: 'Terms and conditions governing purchases and usage of BAKA online store.',
};

export default function TermsOfServicePage() {
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
          <FileText className="w-5 h-5 text-brand-red" />
          <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Legal Compliance</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-wide mb-6">
          Terms of Service
        </h1>
        <p className="text-xs text-gray-400 mb-8 font-mono">Last Updated: October 2026</p>

        <div className="prose prose-sm text-gray-700 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Agreement to Terms</h2>
            <p>
              By accessing or purchasing from BAKA (&quot;the Website&quot;), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Products & Specifications</h2>
            <p>
              We specialize in anime wall art, fine art poster prints, canvas sets, and related collectibles. We strive to present color accuracy, paper quality (300 GSM archival fine art paper), and sizing options accurately. However, actual physical print colors may slightly vary due to individual monitor calibrations and printing batch finishes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Pricing & Payments</h2>
            <p>
              All prices listed on the Website are in Indian Rupees (INR) and are inclusive of applicable taxes. We accept payments via UPI, Debit/Credit Cards, and Netbanking through our verified payment gateway partner (Razorpay), as well as Cash on Delivery (COD) where available.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Order Acceptance & Fulfillment</h2>
            <p>
              Receipt of an order confirmation does not signify our final acceptance of your order. We reserve the right at any time after receiving your order to accept or decline it for reasons including inventory unavailability, incorrect pricing errors, or suspicion of fraudulent activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Intellectual Property</h2>
            <p>
              All branding, logos, site graphics, interface design, and custom digital mockups on this website are the intellectual property of BAKA. Unauthorized reproduction or commercial redistribution is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Limitation of Liability</h2>
            <p>
              BAKA will not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use our products or delivery carrier delays beyond our reasonable control.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
