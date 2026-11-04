import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions (FAQ) | BAKA Posters',
  description: 'Everything you need to know about paper quality, sizes, framing, shipping, and returns.',
};

const faqs = [
  {
    q: 'What paper quality do you use for your posters?',
    a: 'All our prints are produced on 300 GSM Archival Fine Art Matte Paper. It is thick, non-reflective, and printed using 12-color pigment inks that do not fade over time.',
  },
  {
    q: 'What sizes are available?',
    a: 'We offer standard sizes: A4 (8.3 x 11.7 inches), A3 (11.7 x 16.5 inches), 12 x 18 inches, and 24 x 36 inches large statement posters. Custom sizes can also be requested via WhatsApp support.',
  },
  {
    q: 'Do posters come with frames?',
    a: 'We offer both Unframed (rolled in protective hard tubes) and Framed options (matte black wooden frames or gallery-wrapped canvas). You can select your preference on the product page.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Orders are dispatched within 24–48 hours. Metro deliveries arrive in 3–4 business days; other regions across India typically arrive in 4–7 business days.',
  },
  {
    q: 'What if my poster arrives damaged?',
    a: 'We provide an unconditional 100% Free Replacement Guarantee! Simply send a photo of the damaged package and poster to our WhatsApp support within 48 hours of delivery.',
  },
  {
    q: 'Can I pay via Cash on Delivery (COD)?',
    a: 'Yes, Cash on Delivery is available for most serviceable pin codes across India, in addition to online UPI, Debit/Credit Card, and Netbanking via Razorpay.',
  },
];

export default function FAQPage() {
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
          <HelpCircle className="w-5 h-5 text-brand-red" />
          <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Customer Support</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-wide mb-6">
          Frequently Asked Questions
        </h1>

        <div className="space-y-6 divide-y divide-gray-100">
          {faqs.map((f, i) => (
            <div key={i} className={i === 0 ? '' : 'pt-6'}>
              <h3 className="font-bold text-base text-gray-900 mb-2">{f.q}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-50 border border-gray-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm text-gray-900">Still have a question?</h4>
            <p className="text-xs text-gray-500 mt-0.5">Our support team is available on WhatsApp 6 days a week.</p>
          </div>
          <Link href="/contact" className="btn-primary text-xs py-2.5 px-5">
            Contact Support →
          </Link>
        </div>
      </div>
    </div>
  );
}
