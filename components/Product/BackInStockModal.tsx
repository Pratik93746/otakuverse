'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface BackInStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productSlug: string;
}

export function BackInStockModal({
  isOpen,
  onClose,
  productName,
  productSlug,
}: BackInStockModalProps) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      toast.error('Please enter your email or phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/notify-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: emailOrPhone.trim(),
          productName,
          productSlug,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success('Alert set! We will notify you immediately when restocked.');
      } else {
        toast.error('Failed to set notification. Please try again.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white border border-gray-200 w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Top red accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-brand-red" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!submitted ? (
            <div>
              <div className="flex items-center gap-2 mb-2 text-brand-red">
                <Bell className="w-5 h-5" />
                <span className="text-xs font-black tracking-widest uppercase">RESTOCK RADAR</span>
              </div>

              <h3 className="font-heading text-2xl tracking-wide uppercase mb-2">
                GET NOTIFIED WHEN RESTOCKED
              </h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                Be the first in line for <span className="font-semibold text-gray-800">{productName}</span>. 
                We will send you a priority alert as soon as fresh units arrive from Japan.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-600 mb-1.5">
                    Email or WhatsApp Number
                  </label>
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="e.g. collector@baka.style or 9876543210"
                    className="w-full px-4 py-3 border border-gray-200 text-sm outline-none focus:border-brand-red transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> SETTING ALERT...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> NOTIFY ME FIRST
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-heading text-xl uppercase mb-2">YOU&apos;RE ON THE VIP LIST</h4>
              <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto">
                We have registered your restock alert for <strong className="text-gray-800">{productName}</strong>.
              </p>
              <button onClick={onClose} className="btn-dark px-6 py-2.5 text-xs">
                CLOSE
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
