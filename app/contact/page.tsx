import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us | BAKA Posters & Art',
  description: 'Get in touch with BAKA support team for order inquiries and custom poster prints.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-narrow bg-white p-8 sm:p-12 border border-gray-200 rounded-sm shadow-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
        </Link>

        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-wide mb-2">
          Contact Customer Care
        </h1>
        <p className="text-xs text-gray-500 mb-8">
          We are here to assist with order tracking, custom poster requests, framing questions, and business inquiries.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">WhatsApp Support</p>
              <p className="text-xs text-gray-500 mt-0.5">Quick assistance for order tracking & questions</p>
              <a
                href="https://wa.me/919871452380?text=Hi%20BAKA!%20I%20have%20an%20inquiry%20regarding%20my%20poster%20order."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-semibold text-emerald-600 hover:underline mt-2"
              >
                Chat on WhatsApp (+91 9871452380) →
              </a>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-red-100 text-brand-red flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Email Support</p>
              <p className="text-xs text-gray-500 mt-0.5">For corporate, wholesale & bulk art orders</p>
              <a
                href="mailto:support@baka.style"
                className="inline-block text-xs font-semibold text-brand-red hover:underline mt-2 font-mono"
              >
                support@baka.style →
              </a>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Operating Hours</p>
              <p className="text-xs text-gray-500 mt-0.5">Monday to Saturday: 10:00 AM – 7:00 PM IST</p>
              <p className="text-[11px] text-gray-400 mt-1">Sundays & National Holidays: Closed</p>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Studio & Fulfillment</p>
              <p className="text-xs text-gray-500 mt-0.5">New Delhi, Delhi NCR, India (110001)</p>
              <p className="text-[11px] text-gray-400 mt-1">Pan-India Express Dispatch Center</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-900 text-white rounded-xl">
          <h2 className="font-heading text-lg uppercase tracking-wide mb-1">Looking for custom poster prints?</h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Have high-resolution anime art, digital commissions, or manga chapters you want custom printed on 300 GSM fine art paper? Reach out on WhatsApp with your high-res file link for instant assistance!
          </p>
        </div>
      </div>
    </div>
  );
}
