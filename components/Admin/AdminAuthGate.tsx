'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  Lock,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Mail,
  KeyRound,
  ShieldCheck,
  HelpCircle,
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
  const [resettingPassword, setResettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      toast.error('Please enter both admin email and password.');
      return;
    }

    setLoading(true);
    try {
      const { signInWithFirebaseEmail } = await import('@/lib/firebase');
      let idToken: string | undefined = undefined;

      try {
        const userCredential = await signInWithFirebaseEmail(cleanEmail, password);
        idToken = await userCredential.user?.getIdToken();
      } catch (fbErr: any) {
        console.warn('Firebase client login notice, falling back to server credentials check:', fbErr?.message);
      }

      const res = await signIn('credentials', {
        email: cleanEmail,
        password,
        idToken,
        authType: 'firebase',
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        toast.error('Invalid credentials or this account lacks administrator access.');
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

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Please enter your admin email address first.');
      return;
    }

    setResettingPassword(true);
    try {
      const { sendFirebasePasswordReset } = await import('@/lib/firebase');
      await sendFirebasePasswordReset(cleanEmail);
      toast.success('Password reset link sent to your email! Please check your inbox.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setResettingPassword(false);
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
        className="w-full max-w-lg bg-[#12111E]/95 border border-purple-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-2xl relative z-10"
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

        {/* Security Badge & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-widest mb-3">
            <Lock className="w-3 h-3 text-purple-400" />
            <span>Authorized Manager Access</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
            {pageTitle}
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Welcome to your store control panel. Enter your store administrator credentials to manage products, orders, and sales.
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="storeowner@yourdomain.com"
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500 focus:bg-white/[0.08] transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] uppercase tracking-wider text-gray-400">
                Admin Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resettingPassword}
                className="text-[11px] text-purple-400 hover:text-purple-300 hover:underline transition-colors cursor-pointer"
              >
                {resettingPassword ? 'Sending link...' : 'Forgot password?'}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500 focus:bg-white/[0.08] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-3 text-xs font-heading font-black tracking-widest uppercase text-white transition-all shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Enter Store Admin</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Help Notice */}
        <div className="mt-6 p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-[11px] text-gray-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Only emails configured with store administrator rights in your environment can access this portal.
          </span>
        </div>

        {/* Back Link */}
        <div className="mt-5 text-center">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Live Storefront</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
