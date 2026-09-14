'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
import {
  signUpWithFirebaseEmail,
  signInWithFirebaseGoogle,
  isFirebaseConfigured,
} from '@/lib/firebase';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!agreeTerms) {
      toast.error('Please accept the Terms of Service to continue');
      return;
    }

    setLoading(true);
    try {
      let firebaseUid: string | undefined = undefined;

      // Register with Firebase if configured
      if (isFirebaseConfigured) {
        try {
          const userCredential = await signUpWithFirebaseEmail(email, password, name);
          firebaseUid = userCredential.user?.uid;
        } catch (fbErr: any) {
          console.warn('Firebase registration notice:', fbErr.message);
        }
      }

      const res = await signIn('credentials', {
        email,
        password,
        name,
        authType: firebaseUid ? 'firebase' : undefined,
        firebaseUid,
        redirect: false,
      });

      if (res?.error) {
        toast.error('Could not complete registration. Please try logging in.');
      } else {
        toast.success(`Welcome to OTAKUVERSE, ${name}! 🎌`);
        router.push('/');
        router.refresh();
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setFirebaseLoading(true);
    try {
      if (!isFirebaseConfigured) {
        toast(() => (
          <div className="text-xs">
            <p className="font-bold mb-1">🔥 Firebase Notice</p>
            <p className="text-gray-300">
              Add your Firebase credentials in <code className="text-amber-300">.env.local</code> to enable live Firebase Google authentication.
            </p>
          </div>
        ), { duration: 4000 });
      }

      const result = await signInWithFirebaseGoogle();
      const fbUser = result.user;

      if (fbUser && fbUser.email) {
        const res = await signIn('credentials', {
          email: fbUser.email,
          name: fbUser.displayName || name || fbUser.email.split('@')[0],
          authType: 'firebase',
          firebaseUid: fbUser.uid,
          redirect: false,
        });

        if (res?.error) {
          toast.error('Failed to create account with Google.');
        } else {
          toast.success(`Welcome to OTAKUVERSE, ${fbUser.displayName || 'Hunter'}! 🎌`);
          router.push('/');
          router.refresh();
        }
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        toast.error(err?.message || 'Google registration failed.');
      }
    } finally {
      setFirebaseLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col justify-between relative overflow-hidden py-8 px-4 sm:px-6">
      {/* Subtle Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 25%, rgba(230, 51, 41, 0.22) 0%, transparent 70%)',
        }}
      />

      {/* Subtle Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Header Logo */}
      <div className="relative z-10 text-center">
        <Link href="/" className="inline-block group">
          <Image
            src="/custom/baka_logo.png"
            alt="BAKA"
            width={220}
            height={64}
            className="h-12 sm:h-15 w-auto object-contain mx-auto transition-all duration-300 group-hover:brightness-125 group-hover:drop-shadow-[0_0_14px_rgba(239,68,68,0.7)]"
            priority
          />
        </Link>
      </div>

      {/* Centered Professional Signup Card */}
      <main className="relative z-10 w-full max-w-md mx-auto my-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-white/[0.1] bg-[#12111A]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/80"
        >
          {/* Card Title */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold tracking-widest uppercase rounded-full mb-2">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              FIREBASE AUTHENTICITY // 登録
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-wider uppercase text-white">
              CREATE ACCOUNT
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Join the hunter club for member discounts, 3D drops & authentic figures
            </p>
          </div>

          {/* Google Firebase Quick Auth */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={firebaseLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:scale-[1.01] cursor-pointer disabled:opacity-60 mb-4"
          >
            {firebaseLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-900" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign Up with Google (Firebase)</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Or With Email
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-red focus:bg-white/[0.07] focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-red focus:bg-white/[0.07] focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-red focus:bg-white/[0.07] focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-0.5"
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-0.5">
              <label className="flex items-start gap-2 text-xs text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-700 bg-white/5 text-brand-red focus:ring-0 accent-brand-red"
                />
                <span>
                  I agree to OTAKUVERSE&apos;s{' '}
                  <Link href="/terms" className="text-white hover:underline">Terms</Link> &{' '}
                  <Link href="/privacy" className="text-white hover:underline">Privacy Policy</Link>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || firebaseLoading}
              className="w-full rounded-xl bg-brand-red hover:bg-brand-red-dark py-3 text-sm font-heading font-black tracking-widest uppercase text-white transition-all duration-200 shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 mt-2 hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Firebase Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Redirect */}
          <div className="mt-5 text-center text-xs text-gray-400 pt-3 border-t border-white/[0.08]">
            <span>Already have an account? </span>
            <Link
              href="/login"
              className="text-white font-bold hover:text-brand-red transition-colors underline underline-offset-4 ml-1"
            >
              Sign In
            </Link>
          </div>
        </motion.div>

        {/* Security & Trust Assurance */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5 text-amber-400/90 font-medium">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Firebase Verified Auth
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            Official Figures
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[11px] text-gray-600">
        © 2026 OTAKUVERSE — Authentic Anime Collectibles & Statues
      </footer>
    </div>
  );
}
