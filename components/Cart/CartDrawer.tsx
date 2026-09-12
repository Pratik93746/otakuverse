'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import { useRequireAuth } from '@/lib/useRequireAuth';

export function CartDrawer() {
  const { isOpen, items, closeCart, removeItem, updateQuantity, getSubtotal } = useCartStore();
  const { requireAuth } = useRequireAuth();
  const subtotal = getSubtotal();

  const handleCheckout = (e: React.MouseEvent) => {
    if (!requireAuth(undefined, '/checkout')) {
      e.preventDefault();
      closeCart();
    } else {
      closeCart();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5" />
                <span className="font-heading text-xl tracking-widest uppercase">
                  Your Bag
                </span>
                {items.length > 0 && (
                  <span className="w-5 h-5 bg-brand-red text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {items.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto py-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <ShoppingBag className="w-16 h-16 text-gray-200" />
                  <p className="font-heading text-2xl tracking-wider text-gray-400">
                    YOUR BAG IS EMPTY
                  </p>
                  <p className="text-sm text-gray-400">
                    Add some epic figures to your collection!
                  </p>
                  <button
                    onClick={closeCart}
                    className="btn-primary mt-2"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <motion.div
                      key={item.productId}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-4 p-4"
                    >
                      {/* Image */}
                      <Link
                        href={`/product/${item.slug}`}
                        onClick={closeCart}
                        className="w-20 h-24 bg-gray-100 flex-shrink-0 overflow-hidden"
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={80}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                        )}
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={closeCart}
                          className="text-sm font-semibold text-gray-900 hover:text-brand-red transition-colors line-clamp-2"
                        >
                          {item.name}
                        </Link>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-brand-red">
                            {formatPrice(item.price)}
                          </span>
                          {item.compareAtPrice && item.compareAtPrice > item.price && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(item.compareAtPrice)}
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-gray-200">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 h-8 flex items-center justify-center text-sm font-semibold border-x border-gray-200">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Subtotal</span>
                  <span className="text-lg font-bold">{formatPrice(subtotal)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Shipping and taxes calculated at checkout.
                </p>

                {/* Buttons */}
                <div className="space-y-2">
                  <Link
                    href="/checkout"
                    onClick={handleCheckout}
                    className="btn-primary w-full justify-center text-base py-4"
                  >
                    Checkout
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="btn-secondary w-full justify-center"
                  >
                    View Cart
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
