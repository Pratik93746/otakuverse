import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | BAKA Posters & Art',
  description: 'Privacy Policy and data protection terms for BAKA online store.',
};

export default function PrivacyPolicyPage() {
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
          <Shield className="w-5 h-5 text-brand-red" />
          <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Legal Compliance</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-wide mb-6">
          Privacy Policy
        </h1>
        <p className="text-xs text-gray-400 mb-8 font-mono">Last Updated: October 2026</p>

        <div className="prose prose-sm text-gray-700 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Overview</h2>
            <p>
              BAKA (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) values your trust and is committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you visit our website or purchase our anime posters and art merchandise.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Contact Information:</strong> Full name, phone number, and email address.</li>
              <li><strong>Delivery Information:</strong> Physical street address, city, state, postal PIN code, and delivery preferences.</li>
              <li><strong>Transaction Data:</strong> Order receipts, payment method (UPI, Cards, Netbanking via Razorpay), and transaction references. <em>Note: We never store your full card number, CVV, or banking passwords.</em></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. How We Use Your Information</h2>
            <p>
              Your information is exclusively utilized for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Processing and delivering your art poster orders.</li>
              <li>Sending automated order confirmations and courier tracking links.</li>
              <li>Providing responsive customer support via WhatsApp or email.</li>
              <li>Fraud prevention and payment gateway regulatory compliance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Third-Party Services & Payment Security</h2>
            <p>
              We partner with trusted payment gateways (Razorpay) and verified Indian logistics carriers (such as Delhivery, BlueDart, Shiprocket). All electronic transactions are secured using 256-bit SSL encryption. We do not sell or lease your personal information to third-party advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Data Retention & Your Rights</h2>
            <p>
              You have the right to request access to the personal data we hold about you, or ask for your account and contact details to be updated or removed. To exercise these rights, please contact our support team.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Contact Us</h2>
            <p>
              If you have any questions regarding this Privacy Policy, please write to us via our <Link href="/contact" className="text-brand-red underline">Contact Page</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
