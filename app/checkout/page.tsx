'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCartStore } from '@/store/cart';
import { useSession } from 'next-auth/react';
import { fetchWithAuth } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronRight,
  Loader2,
  ArrowLeft,
  User,
  MapPin,
  Truck,
  CreditCard,
  ShieldCheck,
  Plus,
  Building,
  Phone,
  Mail,
  Lock,
  Tag,
  Sparkles,
  PackageCheck,
  ShoppingBag,
  Navigation,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

const steps = [
  { id: 'customer', label: 'Customer', icon: User },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'payment', label: 'Payment', icon: CreditCard },
];

interface AddressForm {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const indianStates = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const isValidIndianPhone = (phone: string): boolean => {
  const clean = (phone || '').replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(clean) && !/^([0-9])\1{9}$/.test(clean);
};

export const isValidIndianPincode = (pincode: string): boolean => {
  const clean = (pincode || '').replace(/\D/g, '');
  return /^[1-9]\d{5}$/.test(clean);
};

export const isValidLocation = (line1: string, city: string): boolean => {
  return (line1 || '').trim().length >= 5 && (city || '').trim().length >= 2;
};

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const { items, getSubtotal, clearCart } = useCartStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<AddressForm[]>([]);
  const [selectedSavedAddrIndex, setSelectedSavedAddrIndex] = useState<number | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [saveForFuture, setSaveForFuture] = useState(true);

  // Current location & pincode validation states
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState<{
    loading: boolean;
    valid: boolean | null;
    message: string;
  }>({ loading: false, valid: null, message: '' });

  const [customerInfo, setCustomerInfo] = useState({
    email: session?.user?.email ?? '',
    firstName: session?.user?.name ? session.user.name.split(' ')[0] : '',
    lastName: session?.user?.name ? session.user.name.split(' ').slice(1).join(' ') : '',
    phone: '',
  });

  const [address, setAddress] = useState<AddressForm>({
    name: session?.user?.name ?? '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: 'Delhi',
    pincode: '',
  });

  const [deliveryMethod, setDeliveryMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const subtotal = mounted ? getSubtotal() : 0;
  const shippingCost = deliveryMethod === 'express' ? 149 : subtotal > 999 ? 0 : 79;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shippingCost + tax - discount;

  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      toast.error('Please sign in to complete your checkout!', {
        icon: '🔐',
        style: {
          borderLeft: '4px solid #E63329',
          background: '#12111A',
          color: '#FFFFFF',
        },
      });
      router.push('/login?callbackUrl=/checkout');
    }
  }, [mounted, status, router]);

  useEffect(() => {
    if (mounted && items.length === 0 && step !== 4 && status === 'authenticated') {
      router.push('/cart');
    }
  }, [mounted, items.length, router, step, status]);

  useEffect(() => {
    if (session?.user?.email) {
      setCustomerInfo((prev) => ({
        ...prev,
        email: prev.email || session.user.email || '',
        firstName: prev.firstName || (session.user.name ? session.user.name.split(' ')[0] : ''),
        lastName: prev.lastName || (session.user.name ? session.user.name.split(' ').slice(1).join(' ') : ''),
      }));
    }
  }, [session]);

  // Fetch saved addresses from API/MongoDB
  useEffect(() => {
    if (session?.user) {
      fetchWithAuth('/api/addresses')
        .then((res) => res.json())
        .then((data) => {
          if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
            const formatted: AddressForm[] = data.addresses.map((a: any) => ({
              name: a.fullName || a.name || '',
              phone: a.phone || '',
              line1: a.addressLine1 || a.line1 || '',
              line2: a.addressLine2 || a.line2 || '',
              city: a.city || '',
              state: a.state || 'Maharashtra',
              pincode: a.pinCode || a.pincode || '',
            }));
            setSavedAddresses(formatted);
            if (formatted[0]) {
              setSelectedSavedAddrIndex(0);
              setAddress(formatted[0]);
              setShowNewAddressForm(false);
            }
          } else {
            setShowNewAddressForm(true);
          }
        })
        .catch(() => {
          setShowNewAddressForm(true);
        });
    } else {
      setShowNewAddressForm(true);
    }
  }, [session]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, orderTotal: subtotal }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiscount(data.discount);
        toast.success(`Coupon applied! You save ${formatPrice(data.discount)}`);
      } else {
        toast.error(data.error ?? 'Invalid coupon');
      }
    } catch {
      toast.error('Failed to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const verifyPincode = async (code: string) => {
    const clean = (code || '').replace(/\D/g, '');
    if (!/^[1-9]\d{5}$/.test(clean)) {
      setPincodeStatus({ loading: false, valid: false, message: 'Must be a 6-digit Indian PIN (e.g. 110001)' });
      return;
    }

    setPincodeStatus({ loading: true, valid: null, message: 'Checking PIN code with postal database...' });
    try {
      const res = await fetch(`/api/pincode/${clean}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setPincodeStatus({
          loading: false,
          valid: true,
          message: data.message || `Verified: ${data.city || ''}, ${data.state || ''}`,
        });

        // Auto-fill City & State if available and improve state matching
        setAddress((prev) => {
          const nextCity = prev.city.trim() ? prev.city : (data.city || data.district || '');
          let nextState = prev.state;
          if (data.state) {
            const matched = indianStates.find(
              (s) => s.toLowerCase() === data.state.toLowerCase()
            ) || indianStates.find(
              (s) => s.toLowerCase().includes(data.state.toLowerCase()) || data.state.toLowerCase().includes(s.toLowerCase())
            );
            if (matched) nextState = matched;
          }
          return {
            ...prev,
            pincode: clean,
            city: nextCity || prev.city,
            state: nextState,
          };
        });
      } else {
        setPincodeStatus({
          loading: false,
          valid: false,
          message: data.message || 'Invalid Indian PIN code',
        });
      }
    } catch {
      setPincodeStatus({
        loading: false,
        valid: true,
        message: 'Valid 6-digit PIN code format',
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Location service is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    const toastId = toast.loading('Detecting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`);
          const data = await res.json();

          if (res.ok && data.success && data.address) {
            const geo = data.address;

            // Match state against Indian states list
            let matchedState = address.state;
            if (geo.state) {
              const found = indianStates.find(
                (s) => s.toLowerCase() === geo.state.toLowerCase()
              ) || indianStates.find(
                (s) => s.toLowerCase().includes(geo.state.toLowerCase()) || geo.state.toLowerCase().includes(s.toLowerCase())
              );
              if (found) matchedState = found;
            }

            setAddress((prev) => ({
              ...prev,
              line1: geo.line1 || prev.line1,
              city: geo.city || prev.city,
              state: matchedState,
              pincode: geo.pincode || prev.pincode,
            }));

            setSelectedSavedAddrIndex(null);
            setShowNewAddressForm(true);

            toast.success(
              `Location auto-detected: ${geo.city || 'Detected'}, ${matchedState}!`,
              { id: toastId }
            );

            if (geo.pincode && /^[1-9]\d{5}$/.test(geo.pincode)) {
              verifyPincode(geo.pincode);
            }
          } else {
            toast.error('Could not determine exact street address. Please type it in manually.', {
              id: toastId,
            });
          }
        } catch {
          toast.error('Failed to geocode location. Please fill manually.', { id: toastId });
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        setDetectingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission was denied. Please fill in your address manually.', {
            id: toastId,
          });
        } else if (error.code === error.TIMEOUT) {
          toast.error('Location request timed out. Please fill in your address manually.', {
            id: toastId,
          });
        } else {
          toast.error('Unable to fetch GPS location. Please fill in manually.', {
            id: toastId,
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSelectSavedAddress = (index: number) => {
    setSelectedSavedAddrIndex(index);
    setAddress(savedAddresses[index]);
    setShowNewAddressForm(false);
    if (savedAddresses[index]?.pincode) {
      verifyPincode(savedAddresses[index].pincode);
    }
  };

  const placeOrder = async () => {
    const contactPhone = customerInfo.phone || address.phone;
    if (!isValidIndianPhone(contactPhone)) {
      toast.error('Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      setStep(0);
      return;
    }

    if (!isValidIndianPincode(address.pincode)) {
      toast.error('Please provide a valid 6-digit Indian PIN code (e.g. 110001, 400001)');
      setStep(1);
      return;
    }

    if (!isValidLocation(address.line1, address.city)) {
      toast.error('Please fill in a valid street address (min 5 characters) and city (min 2 characters)');
      setStep(1);
      return;
    }

    if (!address.name || !address.name.trim()) {
      toast.error('Recipient name is required');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            slug: i.slug,
            image: i.image,
            quantity: i.quantity,
            price: i.price,
          })),
          address,
          customerName: `${customerInfo.firstName} ${customerInfo.lastName}`.trim() || address.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone || address.phone,
          deliveryMethod,
          paymentMethod,
          couponCode: discount > 0 ? couponCode : undefined,
          subtotal,
          shipping: shippingCost,
          tax,
          discount,
          total,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Order failed');

      if (paymentMethod === 'cod') {
        clearCart();
        setOrderId(data.orderNumber);
        setStep(4);
        setLoading(false);
      } else if (paymentMethod === 'razorpay') {
        if (!data.razorpayOrderId) {
          throw new Error('Payment gateway order ID was not received. Please try again.');
        }
        await loadRazorpay(data);
      } else if (data.orderNumber) {
        clearCart();
        setOrderId(data.orderNumber);
        setStep(4);
        setLoading(false);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order. Please try again.');
      setLoading(false);
    }
  };

  const loadRazorpay = async (orderData: {
    razorpayOrderId: string;
    orderNumber: string;
    razorpayKeyId?: string;
  }) => {
    const launchModal = () => {
      const options = {
        key: orderData.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TcDWGoTSYCyd2A',
        amount: Math.round(total * 100),
        currency: 'INR',
        name: 'BAKA STYLE',
        description: `Anime Figures Order #${orderData.orderNumber}`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: address.name || `${customerInfo.firstName} ${customerInfo.lastName}`.trim() || 'Collector',
          email: customerInfo.email,
          contact: address.phone || customerInfo.phone,
        },
        theme: { color: '#E63329' },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled or closed.', { icon: '⚠️' });
            setLoading(false);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetchWithAuth('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderNumber: orderData.orderNumber,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              clearCart();
              setOrderId(orderData.orderNumber);
              setStep(4);
              toast.success('Payment verified successfully! Order placed.', { icon: '🎉' });
            } else {
              toast.error(verifyData.error || 'Payment signature mismatch. Please contact support.');
            }
          } catch (err: any) {
            console.error('Verification error:', err);
            toast.error('Payment verification request failed. Please check your network.');
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        console.error('Razorpay payment failed:', response.error);
        toast.error(response.error?.description || 'Payment failed. Please try another method.');
        setLoading(false);
      });
      rzp.open();
    };

    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      launchModal();
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      // Script tag exists; poll for window.Razorpay in case it's finishing initialization
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (typeof window !== 'undefined' && (window as any).Razorpay) {
          clearInterval(checkInterval);
          launchModal();
        } else if (attempts > 25) {
          clearInterval(checkInterval);
          toast.error('Payment gateway timed out. Please refresh the page.');
          setLoading(false);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      launchModal();
    };
    script.onerror = () => {
      toast.error('Failed to load Razorpay payment gateway. Please check your connection.');
      setLoading(false);
    };
    document.body.appendChild(script);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Loading Checkout...
          </span>
        </div>
      </div>
    );
  }

  // Step 4: Order Confirmed
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-gray-200 p-8 sm:p-12 text-center max-w-lg w-full shadow-lg rounded-sm"
        >
          <div className="w-20 h-20 bg-green-50 border-2 border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <Check className="w-10 h-10" />
          </div>
          <span className="inline-block bg-green-100 text-green-800 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3">
            Payment Verified & Confirmed
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl tracking-wider mb-2">
            ORDER CONFIRMED!
          </h1>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Thank you for ordering with BAKA. Your authentic anime collectible is being carefully packaged with collector protection!
          </p>

          <div className="bg-gray-50 border border-gray-200 p-4 mb-6 text-left space-y-2 rounded-sm text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 uppercase tracking-wider">Order ID</span>
              <span className="font-mono font-bold text-gray-900 text-sm">#{orderId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 uppercase tracking-wider">Estimated Delivery</span>
              <span className="font-semibold text-gray-900">
                {deliveryMethod === 'express' ? '2–3 Business Days' : '4–7 Business Days'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 uppercase tracking-wider">Delivering To</span>
              <span className="font-medium text-gray-800 truncate max-w-[200px]">{address.name} ({address.city})</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/account/orders" className="btn-primary w-full justify-center py-3.5 text-xs tracking-wider">
              Track Your Order
            </Link>
            <Link href="/shop" className="btn-ghost border border-gray-200 w-full justify-center py-3 text-xs tracking-wider">
              Continue Shopping
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/80 text-gray-900">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {/* Checkout Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="container-wide py-3.5 flex items-center justify-between">
          <Link href="/" className="font-heading text-2xl tracking-[0.18em] text-gray-900 hover:text-brand-red transition-colors">
            BAKA
          </Link>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-1 sm:gap-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isPast = i < step;
              const isCurrent = i === step;

              return (
                <div key={s.id} className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => isPast && setStep(i)}
                    disabled={!isPast}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-brand-red text-white shadow-xs'
                        : isPast
                        ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isPast ? (
                      <Check className="w-3.5 h-3.5 text-green-700" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline-block">{s.label}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-green-600" />
            <span>256-Bit SSL Secured</span>
          </div>
        </div>
      </header>

      <div className="container-wide py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Column (8 cols) */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {/* ============================================================
                  STEP 0: CUSTOMER INFORMATION
                  ============================================================ */}
              {step === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="bg-white border border-gray-200 p-6 sm:p-8 shadow-xs rounded-sm"
                >
                  <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full bg-brand-red text-white flex items-center justify-center text-xs font-bold">1</span>
                        <h2 className="font-heading text-2xl tracking-wider uppercase">
                          CUSTOMER INFORMATION
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500">
                        We&apos;ll send order status updates and delivery tracking to this contact.
                      </p>
                    </div>
                    {session?.user && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-sm font-semibold">
                        <Sparkles className="w-3 h-3" /> Logged In
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Email Address <span className="text-brand-red">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          className="input-base pl-10 w-full"
                          placeholder="your.email@domain.com"
                          type="email"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          First Name <span className="text-brand-red">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            className="input-base pl-10 w-full"
                            placeholder="e.g. Satoru"
                            value={customerInfo.firstName}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          Last Name <span className="text-brand-red">*</span>
                        </label>
                        <input
                          className="input-base w-full"
                          placeholder="e.g. Gojo"
                          value={customerInfo.lastName}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
                        <span>Mobile Number <span className="text-brand-red">*</span></span>
                        {customerInfo.phone && (
                          isValidIndianPhone(customerInfo.phone) ? (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Valid 10-digit number
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-red-500">
                              Must be 10 digits starting with 6, 7, 8, or 9
                            </span>
                          )
                        )}
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3.5 bg-gray-100 border border-r-0 border-gray-300 text-xs font-bold text-gray-600 rounded-l-sm">
                          +91
                        </span>
                        <input
                          className={`input-base w-full rounded-l-none ${
                            customerInfo.phone && !isValidIndianPhone(customerInfo.phone)
                              ? 'border-red-400 focus:border-red-500'
                              : customerInfo.phone && isValidIndianPhone(customerInfo.phone)
                              ? 'border-emerald-400 focus:border-emerald-500'
                              : ''
                          }`}
                          placeholder="10-digit mobile number (e.g. 9876543210)"
                          type="tel"
                          maxLength={10}
                          value={customerInfo.phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setCustomerInfo({ ...customerInfo, phone: val });
                            if (!address.phone) {
                              setAddress((prev) => ({ ...prev, phone: val }));
                            }
                          }}
                          required
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Used for courier dispatch notifications and OTP verification (10 digits starting with 6, 7, 8, or 9)
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        if (!isValidIndianPhone(customerInfo.phone)) {
                          toast.error('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
                          return;
                        }
                        setStep(1);
                      }}
                      disabled={!customerInfo.email || !customerInfo.firstName || !isValidIndianPhone(customerInfo.phone)}
                      className="btn-primary px-8 py-3 text-xs tracking-wider font-bold disabled:opacity-50 flex items-center gap-2"
                    >
                      <span>Continue to Address</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ============================================================
                  STEP 1: SHIPPING ADDRESS
                  ============================================================ */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="bg-white border border-gray-200 p-6 sm:p-8 shadow-xs rounded-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-gray-100 mb-6 gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full bg-brand-red text-white flex items-center justify-center text-xs font-bold">2</span>
                        <h2 className="font-heading text-2xl tracking-wider uppercase">
                          DELIVERY ADDRESS
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500">
                        Where should we dispatch your figures?
                      </p>
                    </div>

                    {savedAddresses.length > 0 && (
                      <button
                        onClick={() => {
                          setShowNewAddressForm(!showNewAddressForm);
                          if (!showNewAddressForm) setSelectedSavedAddrIndex(null);
                        }}
                        className="btn-ghost border border-gray-300 text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5 text-brand-red" />
                        <span>{showNewAddressForm ? 'Select Saved Address' : 'Add New Address'}</span>
                      </button>
                    )}
                  </div>

                  {/* Saved Addresses Picker */}
                  {savedAddresses.length > 0 && !showNewAddressForm && (
                    <div className="mb-6 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Choose Saved Delivery Location
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {savedAddresses.map((sa, idx) => {
                          const isSelected = selectedSavedAddrIndex === idx;
                          return (
                            <div
                              key={idx}
                              onClick={() => handleSelectSavedAddress(idx)}
                              className={`p-4 border-2 rounded-sm cursor-pointer transition-all relative ${
                                isSelected
                                  ? 'border-brand-red bg-red-50/40 shadow-xs'
                                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                  <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-red' : 'text-gray-400'}`} />
                                  {sa.name}
                                </span>
                                {isSelected && (
                                  <span className="w-4 h-4 rounded-full bg-brand-red text-white flex items-center justify-center text-[10px]">
                                    <Check className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                                {sa.line1}{sa.line2 ? `, ${sa.line2}` : ''}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 font-medium">
                                {sa.city}, {sa.state} — <span className="font-bold text-gray-800">{sa.pincode}</span>
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono mt-1.5 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" /> +91 {sa.phone}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual / New Address Form */}
                  {(showNewAddressForm || savedAddresses.length === 0) && (
                    <div className="space-y-4 bg-gray-50/60 p-5 border border-gray-200 rounded-sm mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200/80 mb-2">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-brand-red" />
                          <h3 className="font-heading text-lg tracking-wider uppercase text-gray-900">
                            Delivery Address
                          </h3>
                        </div>

                        {/* Use Current Location Button */}
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={detectingLocation}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded shadow-xs hover:shadow transition-all disabled:opacity-60 cursor-pointer self-start sm:self-auto group"
                          title="Auto-detect and fill your current location via GPS"
                        >
                          {detectingLocation ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Navigation className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          )}
                          <span>{detectingLocation ? 'Detecting GPS...' : 'Use Current Location'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Recipient Full Name <span className="text-brand-red">*</span>
                          </label>
                          <input
                            className="input-base w-full bg-white"
                            placeholder="Full name (e.g. Satoru Gojo)"
                            value={address.name}
                            onChange={(e) => {
                              setSelectedSavedAddrIndex(null);
                              setAddress({ ...address, name: e.target.value });
                            }}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center justify-between">
                            <span>Contact Phone <span className="text-brand-red">*</span></span>
                            {address.phone && (
                              isValidIndianPhone(address.phone) ? (
                                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-red-500">
                                  10 digits (6-9 start)
                                </span>
                              )
                            )}
                          </label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 text-xs font-bold text-gray-600 rounded-l-sm">
                              +91
                            </span>
                            <input
                              className={`input-base w-full bg-white rounded-l-none ${
                                address.phone && !isValidIndianPhone(address.phone)
                                  ? 'border-red-400 focus:border-red-500'
                                  : address.phone && isValidIndianPhone(address.phone)
                                  ? 'border-emerald-400 focus:border-emerald-500'
                                  : ''
                              }`}
                              placeholder="10-digit mobile number"
                              type="tel"
                              maxLength={10}
                              value={address.phone}
                              onChange={(e) => {
                                setSelectedSavedAddrIndex(null);
                                setAddress({ ...address, phone: e.target.value.replace(/\D/g, '').slice(0, 10) });
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center justify-between">
                          <span>Street Address / House No. / Flat <span className="text-brand-red">*</span></span>
                          {address.line1 && address.line1.trim().length < 5 && (
                            <span className="text-[10px] font-medium text-amber-600">
                              Min 5 characters ({address.line1.trim().length}/5)
                            </span>
                          )}
                        </label>
                        <input
                          className={`input-base w-full bg-white ${
                            address.line1 && address.line1.trim().length < 5 ? 'border-amber-300' : ''
                          }`}
                          placeholder="e.g. Flat 402, Sakura Residency, MG Road (min 5 characters)"
                          value={address.line1}
                          onChange={(e) => {
                            setSelectedSavedAddrIndex(null);
                            setAddress({ ...address, line1: e.target.value });
                          }}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Apartment, Suite, Landmark (Optional)
                        </label>
                        <input
                          className="input-base w-full bg-white"
                          placeholder="e.g. Near Anime Guild / Metro Pillar 12"
                          value={address.line2}
                          onChange={(e) => {
                            setSelectedSavedAddrIndex(null);
                            setAddress({ ...address, line2: e.target.value });
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center justify-between">
                            <span>City / District <span className="text-brand-red">*</span></span>
                            {address.city && address.city.trim().length < 2 && (
                              <span className="text-[10px] text-amber-600">Min 2 characters</span>
                            )}
                          </label>
                          <input
                            className="input-base w-full bg-white"
                            placeholder="e.g. Mumbai, Bengaluru, Delhi"
                            value={address.city}
                            onChange={(e) => {
                              setSelectedSavedAddrIndex(null);
                              setAddress({ ...address, city: e.target.value });
                            }}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center justify-between">
                            <span>PIN Code (6 Digits) <span className="text-brand-red">*</span></span>
                            {pincodeStatus.loading && (
                              <span className="text-[10px] font-medium text-blue-600 flex items-center gap-1">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Verifying...
                              </span>
                            )}
                            {!pincodeStatus.loading && pincodeStatus.valid === true && (
                              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Valid PIN
                              </span>
                            )}
                            {!pincodeStatus.loading && pincodeStatus.valid === false && (
                              <span className="text-[10px] font-semibold text-red-500">
                                Invalid PIN Code
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <input
                              className={`input-base w-full bg-white font-mono ${
                                pincodeStatus.valid === false
                                  ? 'border-red-400 focus:border-red-500'
                                  : pincodeStatus.valid === true
                                  ? 'border-emerald-400 focus:border-emerald-500'
                                  : ''
                              }`}
                              placeholder="e.g. 400001 (6 digits)"
                              maxLength={6}
                              value={address.pincode}
                              onChange={(e) => {
                                setSelectedSavedAddrIndex(null);
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setAddress({ ...address, pincode: val });
                                if (val.length === 6) {
                                  verifyPincode(val);
                                } else if (val.length > 0) {
                                  setPincodeStatus({ loading: false, valid: null, message: '' });
                                }
                              }}
                              required
                            />
                            {pincodeStatus.valid === true && (
                              <Check className="w-4 h-4 text-green-600 absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          {pincodeStatus.message && (
                            <p
                              className={`text-[11px] mt-1 font-medium ${
                                pincodeStatus.valid === false
                                  ? 'text-red-500'
                                  : pincodeStatus.valid === true
                                  ? 'text-emerald-600'
                                  : 'text-gray-500'
                              }`}
                            >
                              {pincodeStatus.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                          State / Territory <span className="text-brand-red">*</span>
                        </label>
                        <select
                          className="input-base w-full bg-white"
                          value={address.state}
                          onChange={(e) => {
                            setSelectedSavedAddrIndex(null);
                            setAddress({ ...address, state: e.target.value });
                          }}
                        >
                          {indianStates.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-2 pt-2 cursor-pointer text-xs text-gray-700 select-none">
                        <input
                          type="checkbox"
                          checked={saveForFuture}
                          onChange={(e) => setSaveForFuture(e.target.checked)}
                          className="w-4 h-4 accent-brand-red rounded"
                        />
                        <span>Save this delivery address to my collector profile</span>
                      </label>
                    </div>
                  )}

                  <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => setStep(0)}
                      className="btn-ghost border border-gray-300 px-5 py-2.5 flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      onClick={() => {
                        if (!address.name || !address.name.trim()) {
                          toast.error('Please enter the recipient full name');
                          return;
                        }
                        if (!isValidIndianPhone(address.phone)) {
                          toast.error('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
                          return;
                        }
                        if (!address.line1 || address.line1.trim().length < 5) {
                          toast.error('Please enter a valid street address (minimum 5 characters)');
                          return;
                        }
                        if (!address.city || address.city.trim().length < 2) {
                          toast.error('Please enter a valid city or district');
                          return;
                        }
                        if (!isValidIndianPincode(address.pincode)) {
                          toast.error('Please enter a valid 6-digit Indian postal PIN code');
                          return;
                        }
                        if (pincodeStatus.valid === false) {
                          toast.error('Please enter a recognized Indian postal PIN code');
                          return;
                        }
                        setStep(2);
                      }}
                      disabled={
                        !address.name.trim() ||
                        !isValidIndianPhone(address.phone) ||
                        address.line1.trim().length < 5 ||
                        address.city.trim().length < 2 ||
                        !isValidIndianPincode(address.pincode) ||
                        pincodeStatus.valid === false
                      }
                      className="btn-primary px-8 py-3 text-xs font-bold tracking-wider disabled:opacity-50 flex items-center gap-2"
                    >
                      <span>Continue to Delivery</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ============================================================
                  STEP 2: DELIVERY METHOD
                  ============================================================ */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="bg-white border border-gray-200 p-6 sm:p-8 shadow-xs rounded-sm"
                >
                  <div className="pb-5 border-b border-gray-100 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-brand-red text-white flex items-center justify-center text-xs font-bold">3</span>
                      <h2 className="font-heading text-2xl tracking-wider uppercase">
                        CHOOSE DELIVERY SPEED
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500">
                      All figures ship in tamper-proof collector foam packaging with box protection.
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    {[
                      {
                        id: 'standard',
                        label: 'Standard Collector Delivery',
                        desc: 'Delivers in 4–7 business days with standard protective wrapping.',
                        price: subtotal > 999 ? 0 : 79,
                        badge: subtotal > 999 ? 'FREE' : undefined,
                      },
                      {
                        id: 'express',
                        label: 'Express Priority Air Dispatch',
                        desc: 'Delivers in 2–3 business days with double-reinforced bubble padding.',
                        price: 149,
                        badge: 'FASTEST',
                      },
                    ].map((option) => {
                      const isSelected = deliveryMethod === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`flex items-start gap-4 p-4 sm:p-5 border-2 rounded-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'border-brand-red bg-red-50/40 shadow-xs'
                              : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="delivery"
                            value={option.id}
                            checked={isSelected}
                            onChange={() => setDeliveryMethod(option.id)}
                            className="accent-brand-red w-4 h-4 mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900 text-sm">{option.label}</span>
                              {option.badge && (
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-sm ${
                                  option.badge === 'FREE' ? 'bg-green-100 text-green-800' : 'bg-brand-red text-white'
                                }`}>
                                  {option.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">{option.desc}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm text-gray-900">
                              {option.price === 0 ? <span className="text-green-600">FREE</span> : formatPrice(option.price)}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Packaging Promise Card */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm flex items-center gap-3 text-xs text-gray-700">
                    <PackageCheck className="w-5 h-5 text-brand-red flex-shrink-0" />
                    <p>
                      <strong>Mint-Condition Box Guarantee:</strong> Every collectible is individually inspected, cushioned, and sealed to ensure box perfection upon arrival.
                    </p>
                  </div>

                  <div className="pt-6 border-t border-gray-100 mt-6 flex items-center justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="btn-ghost border border-gray-300 px-5 py-2.5 flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="btn-primary px-8 py-3 text-xs font-bold tracking-wider flex items-center gap-2"
                    >
                      <span>Continue to Payment</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ============================================================
                  STEP 3: PAYMENT
                  ============================================================ */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="bg-white border border-gray-200 p-6 sm:p-8 shadow-xs rounded-sm"
                >
                  <div className="pb-5 border-b border-gray-100 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-brand-red text-white flex items-center justify-center text-xs font-bold">4</span>
                      <h2 className="font-heading text-2xl tracking-wider uppercase">
                        SELECT PAYMENT METHOD
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500">
                      Safe, instant, and encrypted transactions powered by Razorpay.
                    </p>
                  </div>

                  {/* Coupon Box */}
                  <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-sm">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      <Tag className="w-3.5 h-3.5 text-brand-red" />
                      <span>Have a Promo or Collector Coupon?</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="input-base flex-1 bg-white uppercase font-mono text-xs"
                        placeholder="ENTER COUPON (e.g. OTAKU10)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode}
                        className="btn-primary px-5 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'APPLY'}
                      </button>
                    </div>
                    {discount > 0 && (
                      <p className="text-xs text-green-600 mt-2 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Coupon applied! You saved {formatPrice(discount)}
                      </p>
                    )}
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-3.5 mb-6">
                    {[
                      {
                        id: 'razorpay',
                        label: 'Pay Online via Razorpay',
                        desc: 'Instant checkout supporting UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking & Wallets.',
                        badge: 'RECOMMENDED',
                      },
                      {
                        id: 'cod',
                        label: 'Cash on Delivery (COD)',
                        desc: 'Pay cash to courier upon figure arrival at your doorstep.',
                      },
                    ].map((option) => {
                      const isSelected = paymentMethod === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`flex items-start gap-4 p-4 sm:p-5 border-2 rounded-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'border-brand-red bg-red-50/40 shadow-xs'
                              : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value={option.id}
                            checked={isSelected}
                            onChange={() => setPaymentMethod(option.id)}
                            className="accent-brand-red w-4 h-4 mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900 text-sm">{option.label}</span>
                              {option.badge && (
                                <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase px-2 py-0.2 rounded-sm">
                                  {option.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">{option.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Delivery Address Summary Bar */}
                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-sm mb-6 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Delivering To</span>
                      <span className="font-semibold text-gray-900">{address.name}</span>
                      <span className="text-gray-500 ml-1">({address.city}, {address.pincode})</span>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-brand-red hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="btn-ghost border border-gray-300 px-5 py-3 flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      onClick={placeOrder}
                      disabled={loading}
                      className="btn-primary px-8 py-3.5 flex-1 justify-center text-sm font-bold tracking-wider shadow-md flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>
                            {paymentMethod === 'razorpay' ? 'Opening Payment Gateway...' : 'Processing Order...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>
                            {paymentMethod === 'razorpay' ? 'PAY WITH RAZORPAY — ' : 'PLACE ORDER — '}
                            {formatPrice(total)}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sticky Order Summary Sidebar (4 cols) */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-gray-200 p-5 sm:p-6 sticky top-20 shadow-xs rounded-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-brand-red" />
                  <h3 className="font-heading text-lg tracking-wider uppercase text-gray-900">
                    ORDER SUMMARY
                  </h3>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {items.reduce((sum, i) => sum + i.quantity, 0)} Items
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.productId} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                    <div className="w-12 h-14 bg-gray-50 border border-gray-200 relative overflow-hidden flex-shrink-0 rounded-xs">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-300">
                          OTV
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-gray-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Qty: {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <span className="font-bold text-xs text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Ledger Breakdown */}
              <div className="space-y-2.5 text-xs border-t border-gray-100 pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery ({deliveryMethod})</span>
                  <span>
                    {shippingCost === 0 ? (
                      <span className="text-green-600 font-bold">FREE</span>
                    ) : (
                      formatPrice(shippingCost)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%)</span>
                  <span className="font-medium text-gray-900">{formatPrice(tax)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-3 border-t border-gray-200">
                  <span>Total Amount</span>
                  <span className="text-brand-red text-base">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="bg-gray-50 p-3.5 border border-gray-200 rounded-sm space-y-2 text-[11px] text-gray-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>100% Genuine Licensed Figures</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Encrypted Bank-Grade Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-brand-red flex-shrink-0" />
                  <span>Box Mint Condition Foam Packaging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
