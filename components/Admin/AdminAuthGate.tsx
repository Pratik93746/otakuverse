'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
  Loader2,
  UserCheck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface AdminAuthGateProps {
  currentSession?: any;
  callbackUrl?: string;
  pageTitle?: string;
}

export function AdminAuthGate({
  currentSession,
  callbackUrl = '/admin',
  pageTitle = 'Store Management Dashboard',
}: AdminAuthGateProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<'gojo' | 'staff'>('gojo');
  const [manualPassword, setManualPassword] = useState('');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPassword.trim()) {
      toast.error('Please enter the admin password.');
      return;
    }
    setLoading(true);
    const email = selectedAdmin === 'gojo' ? 'gojo@otakuverse.com' : 'admin@otakuverse.in';
    const name = selectedAdmin === 'gojo' ? 'Gojo Satoru' : 'Otakuverse Staff';

    try {
      const { signInWithFirebaseEmail } = await import('@/lib/firebase');
      const userCredential = await signInWithFirebaseEmail(email, manualPassword);
      const firebaseUid = userCredential.user?.uid;

      if (!firebaseUid) throw new Error('Firebase authentication failed');

      const res = await signIn('credentials', {
        email,
        name,
        authType: 'firebase',
        firebaseUid,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        toast.error('Invalid admin credentials.');
      } else {
        toast.success(`Access granted! Welcome to ${pageTitle} ⚡`);
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Authentication failed. Please verify admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0912] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-[#12111E]/90 border border-purple-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-2xl relative z-10"
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

        {/* Security Badge & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-widest mb-3">
            <Lock className="w-3 h-3 text-purple-400" />
            <span>Restricted Access Control</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
            {pageTitle}
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            This sector is restricted to verified store managers. Enter your administrator credentials below.
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
              Select Administrator Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedAdmin('gojo')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  selectedAdmin === 'gojo'
                    ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                    : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${selectedAdmin === 'gojo' ? 'text-purple-400' : 'opacity-0'}`} />
                <span>Gojo Satoru</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAdmin('staff')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  selectedAdmin === 'staff'
                    ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                    : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${selectedAdmin === 'staff' ? 'text-purple-400' : 'opacity-0'}`} />
                <span>Otakuverse Staff</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={manualPassword}
                onChange={(e) => setManualPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500 focus:bg-white/[0.08] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-3 text-xs font-heading font-black tracking-widest uppercase text-white transition-all shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating Admin...</span>
              </>
            ) : (
              <>
                <span>Enter Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Otakuverse Storefront</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
