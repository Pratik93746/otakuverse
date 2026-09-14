'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

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
    state: 'Maharashtra',
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

  const handleSelectSavedAddress = (index: number) => {
    setSelectedSavedAddrIndex(index);
    setAddress(savedAddresses[index]);
    setShowNewAddressForm(false);
  };

  const placeOrder = async () => {
    if (!address.pincode || !/^\d{6}$/.test(address.pincode.trim())) {
      toast.error('Please provide a valid 6-digit Indian PIN code');
      setStep(1);
      return;
    }

    if (!address.name || !address.phone || !address.line1 || !address.city) {
      toast.error('Please fill in all required delivery address fields');
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
      } else if (paymentMethod === 'razorpay' && data.razorpayOrderId) {
        await loadRazorpay(data);
      } else if (data.orderNumber) {
        clearCart();
        setOrderId(data.orderNumber);
        setStep(4);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = async (orderData: { razorpayOrderId: string; orderNumber: string }) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);

    script.onload = () => {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: total * 100,
        currency: 'INR',
        name: 'OTAKUVERSE',
        description: 'Anime Collectibles Order',
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: address.name,
          email: customerInfo.email,
          contact: address.phone,
        },
        theme: { color: '#E63329' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await fetchWithAuth('/api/orders/verify-payment', {
              method: 'POST',
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                orderNumber: orderData.orderNumber,
              }),
            });
            clearCart();
            setOrderId(orderData.orderNumber);
            setStep(4);
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
      };
      const rzp = new (window as typeof window & { Razorpay: new (opts: unknown) => { open(): void } }).Razorpay(options);
      rzp.open();
    };
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
            Thank you for ordering with OTAKUVERSE. Your authentic anime collectible is being carefully packaged with collector protection!
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
      {/* Checkout Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="container-wide py-3.5 flex items-center justify-between">
          <Link href="/" className="font-heading text-2xl tracking-[0.18em] text-gray-900 hover:text-brand-red transition-colors">
            OTAKUVERSE
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Mobile Number <span className="text-brand-red">*</span>
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3.5 bg-gray-100 border border-r-0 border-gray-300 text-xs font-bold text-gray-600 rounded-l-sm">
                          +91
                        </span>
                        <input
                          className="input-base w-full rounded-l-none"
                          placeholder="9876543210"
                          type="tel"
                          maxLength={10}
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value.replace(/\D/g, '') })}
                          required
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Used for courier dispatch notifications and OTP verification
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 mt-6 flex justify-end">
                    <button
                      onClick={() => setStep(1)}
                      disabled={!customerInfo.email || !customerInfo.firstName || !customerInfo.phone}
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
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="w-4 h-4 text-brand-red" />
                        <h3 className="font-heading text-lg tracking-wider uppercase text-gray-900">
                          Address Details
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Recipient Full Name <span className="text-brand-red">*</span>
                          </label>
                          <input
                            className="input-base w-full bg-white"
                            placeholder="Full name"
                            value={address.name}
                            onChange={(e) => {
                              setSelectedSavedAddrIndex(null);
                              setAddress({ ...address, name: e.target.value });
                            }}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            Contact Phone Number <span className="text-brand-red">*</span>
                          </label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 text-xs font-bold text-gray-600 rounded-l-sm">
                              +91
                            </span>
                            <input
                              className="input-base w-full bg-white rounded-l-none"
                              placeholder="10-digit mobile number"
                              type="tel"
                              maxLength={10}
                              value={address.phone}
                              onChange={(e) => {
                                setSelectedSavedAddrIndex(null);
                                setAddress({ ...address, phone: e.target.value.replace(/\D/g, '') });
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Street Address / House No. / Flat <span className="text-brand-red">*</span>
                        </label>
                        <input
                          className="input-base w-full bg-white"
                          placeholder="e.g. Flat 402, Sakura Residency, MG Road"
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
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            City / District <span className="text-brand-red">*</span>
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
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                            PIN Code (6 Digits) <span className="text-brand-red">*</span>
                          </label>
                          <div className="relative">
                            <input
                              className="input-base w-full bg-white font-mono"
                              placeholder="e.g. 400001"
                              maxLength={6}
                              value={address.pincode}
                              onChange={(e) => {
                                setSelectedSavedAddrIndex(null);
                                setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') });
                              }}
                              required
                            />
                            {address.pincode.length === 6 && (
                              <Check className="w-4 h-4 text-green-600 absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
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
                      onClick={() => setStep(2)}
                      disabled={!address.name || !address.phone || !address.line1 || !address.city || address.pincode.length !== 6}
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
                          <span>Processing Order...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>PLACE ORDER — {formatPrice(total)}</span>
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
