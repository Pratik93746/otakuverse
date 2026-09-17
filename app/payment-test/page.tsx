'use client';

import { useState } from 'react';
import { RazorpayCheckoutButton } from '@/components/RazorpayCheckoutButton';
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PaymentTestPage() {
  const [amountRupees, setAmountRupees] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>('Test Collector');
  const [customerEmail, setCustomerEmail] = useState<string>('collector@example.com');
  const [customerPhone, setCustomerPhone] = useState<string>('9876543210');
  const [verificationResult, setVerificationResult] = useState<{
    order_id: string;
    payment_id: string;
    signature: string;
  } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleSuccess = (res: {
    order_id: string;
    payment_id: string;
    signature: string;
  }) => {
    setVerificationResult(res);
    setLastError(null);
  };

  const handleError = (err: any) => {
    const message = typeof err === 'string' ? err : err?.message || 'Payment failed';
    setLastError(message);
  };

  const handleReset = () => {
    setVerificationResult(null);
    setLastError(null);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-wider text-red-500 font-mono">
              RAZORPAY STANDARD CHECKOUT
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live Test Environment (Testnet Gateway)
            </p>
          </div>
          <Link
            href="/shop"
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Store
          </Link>
        </div>

        {/* Configuration Overview */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 mb-6 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-500">Key ID:</span>
            <span className="font-mono text-zinc-300">
              {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'Configured via .env'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Currency:</span>
            <span className="font-mono text-zinc-300">INR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Order Endpoint:</span>
            <span className="font-mono text-zinc-300">POST /api/create-order</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Verify Endpoint:</span>
            <span className="font-mono text-zinc-300">POST /api/verify-payment</span>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Amount (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">
                ₹
              </span>
              <input
                type="number"
                min={1}
                value={amountRupees}
                onChange={(e) => setAmountRupees(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-8 pr-4 text-white font-mono focus:outline-none focus:border-red-500 text-sm"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Minimum 1 INR (100 paise required by Razorpay)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Customer Email
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Customer Phone
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Razorpay Standard Checkout Button */}
        <div className="mb-6">
          <RazorpayCheckoutButton
            amountInRupees={amountRupees}
            name="Otakuverse Checkout Test"
            description={`Test Payment of ₹${amountRupees}`}
            prefill={{
              name: customerName,
              email: customerEmail,
              contact: customerPhone,
            }}
            notes={{
              testMode: 'true',
              source: 'payment-test-page',
            }}
            onSuccess={handleSuccess}
            onError={handleError}
            buttonText={`Pay ₹${amountRupees} with Razorpay`}
            className="w-full py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 cursor-pointer text-sm"
          />
        </div>

        {/* Result Display */}
        {verificationResult && (
          <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-4 mb-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Payment Verified Successfully!</span>
            </div>
            <div className="font-mono space-y-1 text-[11px] text-zinc-300 break-all">
              <p>
                <span className="text-zinc-500">Order ID:</span>{' '}
                {verificationResult.order_id}
              </p>
              <p>
                <span className="text-zinc-500">Payment ID:</span>{' '}
                {verificationResult.payment_id}
              </p>
              <p>
                <span className="text-zinc-500">HMAC Signature:</span>{' '}
                {verificationResult.signature}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="mt-3 inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Test Another Payment
            </button>
          </div>
        )}

        {lastError && !verificationResult && (
          <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 mb-4 text-xs space-y-1 text-rose-300">
            <div className="flex items-center gap-2 font-bold mb-1">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Payment / Verification Notice</span>
            </div>
            <p className="text-zinc-300 text-[11px]">{lastError}</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>Secured with Razorpay Standard 256-bit SSL & HMAC SHA256</span>
        </div>
      </div>
    </div>
  );
}
