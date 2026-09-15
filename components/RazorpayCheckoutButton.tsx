'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface RazorpayCheckoutButtonProps {
  amountInPaise?: number;
  amountInRupees?: number;
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  onSuccess?: (verificationResult: {
    order_id: string;
    payment_id: string;
    signature: string;
  }) => void;
  onError?: (error: Error | string) => void;
  className?: string;
  buttonText?: string;
}

export function RazorpayCheckoutButton({
  amountInPaise,
  amountInRupees = 100,
  currency = 'INR',
  name = 'BAKA STYLE',
  description = 'Anime Collectibles Purchase',
  prefill,
  notes,
  onSuccess,
  onError,
  className,
  buttonText = 'Pay with Razorpay',
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const finalAmountInPaise =
    amountInPaise !== undefined ? amountInPaise : Math.round(amountInRupees * 100);

  const handleCheckout = async () => {
    if (finalAmountInPaise < 100) {
      toast.error('Minimum amount must be at least ₹1 (100 paise)');
      return;
    }

    setLoading(true);

    try {
      // 1. Call Backend to create Razorpay Order
      const createRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmountInPaise,
          currency,
          notes,
        }),
      });

      const orderData = await createRes.json();

      if (!createRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || 'Failed to initialize Razorpay order');
      }

      // 2. Ensure checkout.js is loaded
      const launchModal = () => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TcDWGoTSYCyd2A',
          amount: orderData.amount,
          currency: orderData.currency || currency,
          name,
          description,
          order_id: orderData.order_id,
          prefill: {
            name: prefill?.name || '',
            email: prefill?.email || '',
            contact: prefill?.contact || '',
          },
          theme: {
            color: '#E63329',
          },
          modal: {
            ondismiss: () => {
              toast('Payment window closed by user', { icon: '⚠️' });
              setLoading(false);
              onError?.('Payment window closed');
            },
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // 3. Send payment details to verify endpoint
              const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();

              if (verifyRes.ok && verifyData.success) {
                toast.success('Payment verified successfully!', { icon: '🎉' });
                onSuccess?.({
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                });
              } else {
                const msg = verifyData.error || 'Payment signature verification failed';
                toast.error(msg);
                onError?.(msg);
              }
            } catch (vErr: any) {
              const msg = vErr?.message || 'Verification network error';
              toast.error(msg);
              onError?.(msg);
            } finally {
              setLoading(false);
            }
          },
        };

        const rzp = new (window as any).Razorpay(options);

        // Handle failure events
        rzp.on('payment.failed', (failResp: any) => {
          console.error('Razorpay payment failed:', failResp.error);
          const errDesc =
            failResp.error?.description || 'Payment was declined or failed. Please try again.';
          toast.error(errDesc);
          onError?.(errDesc);
          setLoading(false);
        });

        rzp.open();
      };

      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        launchModal();
        return;
      }

      // Dynamically load script if not yet present
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        existingScript.addEventListener('load', launchModal);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = launchModal;
      script.onerror = () => {
        toast.error('Unable to load Razorpay checkout script. Please check your connection.');
        setLoading(false);
        onError?.('Script load error');
      };
      document.body.appendChild(script);
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err?.message || 'Failed to initiate payment');
      setLoading(false);
      onError?.(err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading}
      className={
        className ||
        'btn-primary w-full py-3.5 px-6 flex items-center justify-center gap-2 font-heading tracking-wider uppercase text-sm font-bold shadow-md hover:shadow-lg transition-all'
      }
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>INITIALIZING SECURE PAYMENT...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          <span>{buttonText}</span>
          <ShieldCheck className="w-4 h-4 ml-1 opacity-80" />
        </>
      )}
    </button>
  );
}
