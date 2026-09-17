'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { api } from '../utils/api';

/**
 * Dynamically loads the external Razorpay checkout script if not already present.
 */
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }

    if (window.Razorpay) {
      return resolve(true);
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Production-grade CheckoutButton component.
 * Integrates Razorpay modal with zero-trust backend order creation and cryptographic verification.
 *
 * @param {Object} props
 * @param {Array<{ productId: string, quantity: number }>} props.items - Cart items to purchase
 * @param {string} [props.className] - Additional Tailwind or CSS classes
 * @param {string} [props.buttonText] - Custom button label
 * @param {boolean} [props.disabled] - External disabled flag
 */
export default function CheckoutButton({
  items = [],
  className = '',
  buttonText = 'Proceed to Secure Checkout',
  disabled = false
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert('Please sign in to your account to proceed with checkout.');
      router.push('/login?redirect=/checkout');
      return;
    }

    if (!items || items.length === 0) {
      alert('Your cart is empty. Please add items before checking out.');
      return;
    }

    setLoading(true);

    try {
      // 1. Ensure Razorpay checkout script is loaded
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Unable to connect to Razorpay payment gateway. Please check your network.');
      }

      // 2. Request backend to calculate zero-trust total and generate Razorpay order
      const payload = {
        items: items.map((item) => ({
          productId: item.productId || item._id || item.id,
          quantity: item.quantity || 1
        }))
      };

      const orderData = await api.post('/api/payment/create-order', payload);

      if (!orderData || !orderData.orderId || !orderData.keyId) {
        throw new Error(orderData?.message || 'Failed to initialize order on server.');
      }

      const { orderId, amount, currency, keyId } = orderData;

      // 3. Configure Razorpay modal options
      const options = {
        key: keyId,
        amount: amount,
        currency: currency || 'INR',
        name: 'Anime E-Commerce',
        description: 'Official Collectibles & Apparel',
        order_id: orderId,
        prefill: {
          name: currentUser.displayName || '',
          email: currentUser.email || '',
          contact: currentUser.phoneNumber || ''
        },
        theme: {
          color: '#E50914'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            console.log('[Razorpay] Payment checkout cancelled by user.');
          }
        },
        handler: async (response) => {
          try {
            // 4. Send payment signatures to backend for cryptographic HMAC-SHA256 verification
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };

            const verificationResult = await api.post('/api/payment/verify-payment', verifyPayload);

            if (verificationResult?.success) {
              const confirmedOrderId = verificationResult.orderId || orderId;
              router.push(`/order-success?orderId=${encodeURIComponent(confirmedOrderId)}`);
            } else {
              throw new Error(verificationResult?.message || 'Payment signature verification failed.');
            }
          } catch (verifyError) {
            console.error('[Payment Verification Error]', verifyError);
            alert(`Payment verification error: ${verifyError.message || 'Transaction could not be validated.'}`);
            setLoading(false);
          }
        }
      };

      // 5. Instantiate and present Razorpay modal
      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (failureResponse) => {
        console.error('[Razorpay Payment Failed]', failureResponse.error);
        alert(`Payment failed: ${failureResponse.error.description || failureResponse.error.reason}`);
        setLoading(false);
      });

      razorpayInstance.open();
    } catch (error) {
      console.error('[Checkout Initiation Error]', error);
      alert(error.message || 'An unexpected error occurred while starting checkout.');
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold tracking-wider uppercase text-white transition-all duration-200 bg-red-600 rounded-lg shadow-lg hover:bg-red-700 hover:shadow-red-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Processing Order...
        </span>
      ) : (
        buttonText
      )}
    </button>
  );
}
