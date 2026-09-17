'use client';

import { useCartStore } from '@/store/cart';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getSubtotal } = useCartStore();
  const { requireAuth } = useRequireAuth();
  const subtotal = getSubtotal();
  // Free delivery on all orders
  const shipping = 0;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <ShoppingBag className="w-20 h-20 text-gray-200 mb-6" />
        <h1 className="font-heading text-4xl tracking-wider mb-3">YOUR BAG IS EMPTY</h1>
        <p className="text-gray-500 mb-8">Add some epic figures to your collection!</p>
        <Link href="/shop" className="btn-primary px-8 py-4">
          START SHOPPING
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-6">
        <div className="container-wide">
          <h1 className="font-heading text-4xl tracking-widest uppercase">YOUR BAG</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="container-wide py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white border border-gray-100 p-4 flex gap-4"
                >
                  <Link href={`/product/${item.slug}`} className="w-24 h-28 bg-gray-50 flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} width={96} height={112} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                    )}
                  </Link>

                  <div className="flex-1">
                    <Link href={`/product/${item.slug}`} className="font-semibold text-gray-900 hover:text-brand-red transition-colors text-sm">
                      {item.name}
                    </Link>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold text-brand-red">{formatPrice(item.price)}</span>
                      {item.compareAtPrice && item.compareAtPrice > item.price && (
                        <span className="text-sm text-gray-400 line-through">{formatPrice(item.compareAtPrice)}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-gray-200">
                        <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-10 h-8 flex items-center justify-center text-sm font-semibold border-x border-gray-200">
                          {item.quantity}
                        </span>
                        <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                        <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <Link href="/shop" className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-red transition-colors mt-4">
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Link>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-100 p-6 sticky top-24">
              <h2 className="font-heading text-xl tracking-wider uppercase mb-5">ORDER SUMMARY</h2>

              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-semibold">
                    {shipping === 0 ? <span className="text-green-600">FREE</span> : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GST (18%)</span>
                  <span className="font-semibold">{formatPrice(tax)}</span>
                </div>
                <p className="text-xs text-green-600 bg-green-50 p-2.5 font-semibold flex items-center gap-1.5">
                  <span>🎉</span>
                  <span>FREE Delivery applied to this order!</span>
                </p>
                <div className="border-t border-gray-100 pt-3 flex justify-between text-base">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-brand-red">{formatPrice(total)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={(e) => {
                  if (!requireAuth(undefined, '/checkout')) {
                    e.preventDefault();
                  }
                }}
                className="btn-primary w-full justify-center py-4 text-base"
              >
                PROCEED TO CHECKOUT
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">Secure checkout · Multiple payment options</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
