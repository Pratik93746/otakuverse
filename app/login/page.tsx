'use client';

import { safeRedirectPath } from '@/lib/safe-redirect';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  signInWithFirebaseEmail,
  signInWithFirebaseGoogle,
  sendFirebasePasswordReset,
} from '@/lib/firebase';

/* ──────────────────────────────────────────────
   3D Sitting Character Perched on Credential Card
   ────────────────────────────────────────────── */
function SittingAnimeCharacter({
  inputState,
}: {
  inputState: 'idle' | 'email' | 'password' | 'hover-submit';
}) {
  return (
    <div className="absolute -top-20 sm:-top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none flex flex-col items-center">
      {/* Dynamic 3D Character Container */}
      <motion.div
        animate={
          inputState === 'hover-submit'
            ? { y: [-2, 2, -2], scale: 1.05 }
            : inputState === 'email'
            ? { y: [-1, 1, -1], rotate: [-1, 1, -1] }
            : { y: [-2, 2, -2] }
        }
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-28 h-28 sm:w-32 sm:h-32"
      >
        {/* Glow Aura behind Sitting Character */}
        <motion.div
          animate={{
            scale: inputState === 'hover-submit' ? [1, 1.25, 1] : [1, 1.1, 1],
            opacity: inputState === 'hover-submit' ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full blur-xl pointer-events-none"
          style={{
            background:
              inputState === 'hover-submit'
                ? 'radial-gradient(circle, rgba(230,51,41,0.6) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)',
          }}
        />

        {/* 3D Character Sitting Art (Sukuna on Throne / Perched Guardian) */}
        <div className="relative w-full h-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
          <Image
            src="/custom/sukuna_collectors_3d.png"
            alt="Perched Anime Guardian"
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>

        {/* Dynamic Eye / Aura Glint based on input */}
        {inputState === 'hover-submit' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0.8, 1, 0.8], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-red-500/30 blur-md pointer-events-none"
          />
        )}
      </motion.div>

      {/* Shadow Cast onto the top edge of the card */}
      <div className="w-24 h-2.5 bg-black/70 rounded-full blur-sm -mt-2" />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeRedirectPath(searchParams.get('callbackUrl'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [inputState, setInputState] = useState<'idle' | 'email' | 'password' | 'hover-submit'>('idle');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let idToken: string | undefined = undefined;
      let firebaseDisplayName: string | undefined = undefined;

      // Authenticate directly with Firebase
      try {
        const userCredential = await signInWithFirebaseEmail(cleanEmail, password);
        idToken = await userCredential.user?.getIdToken();
        firebaseDisplayName = userCredential.user?.displayName || cleanEmail.split('@')[0];
      } catch (fbErr: any) {
        // If client-side network failed (e.g. adblocker, Safari privacy, firewall, or Vercel domain restriction),
        // don't abort immediately — fall through to server-side NextAuth which calls Firebase REST API directly.
        if (fbErr?.code === 'auth/network-request-failed') {
          console.warn('⚠️ Client Firebase network failed; falling back to server-side authentication...');
        } else {
          let msg = 'Authentication failed. Please check your credentials.';
          if (
            fbErr?.code === 'auth/user-not-found' ||
            fbErr?.code === 'auth/invalid-credential' ||
            fbErr?.message?.includes('user-not-found') ||
            fbErr?.message?.includes('invalid-credential')
          ) {
            msg = 'This email is not registered or incorrect password.';
          } else if (fbErr?.code === 'auth/wrong-password') {
            msg = 'Incorrect password. Please try again.';
          } else if (fbErr?.code === 'auth/invalid-email') {
            msg = 'Invalid email address format.';
          } else if (fbErr?.code === 'auth/too-many-requests') {
            msg = 'Too many failed attempts. Please reset your password or try again later.';
          } else if (fbErr?.message) {
            msg = fbErr.message;
          }

          setErrorMessage(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }
      }

      // Establish verified session with NextAuth (uses server fallback if idToken is missing)
      const res = await signIn('credentials', {
        email: cleanEmail,
        password,
        name: firebaseDisplayName,
        authType: 'firebase',
        idToken,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        const errorMsg = 'Invalid email or password. Please check your credentials.';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      } else {
        setErrorMessage(null);
        toast.success('Access Granted! Welcome to BAKA 🎌');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      const errorMsg = 'Something went wrong. Please try again.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }
    setResetLoading(true);
    try {
      await sendFirebasePasswordReset(resetEmail.trim());
      toast.success('Password reset link sent to your email! ✉️');
      setForgotPasswordOpen(false);
      setResetEmail('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send reset email. Verify your email address.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithFirebaseGoogle();
      const fbUser = result.user;
      if (fbUser?.email) {
        const idToken = await fbUser.getIdToken();
        const res = await signIn('credentials', {
          email: fbUser.email,
          name: fbUser.displayName || fbUser.email.split('@')[0],
          authType: 'firebase',
          firebaseUid: fbUser.uid,
          idToken,
          redirect: false,
          callbackUrl,
        });
        if (res?.error) {
          toast.error('Failed to establish session with Google.');
        } else {
          toast.success(`Access Granted! Welcome ${fbUser.displayName || 'Hunter'} 🎌`);
          router.push(callbackUrl);
          router.refresh();
        }
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        const msg = err?.message || 'Google sign in failed. Please try again.';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white flex flex-col justify-between relative overflow-hidden py-6 px-4 sm:px-6">
      {/* ──────────────────────────────────────────────
          3D Watermark Figures in Background
          ────────────────────────────────────────────── */}
      <div className="hidden lg:block absolute -left-12 top-1/2 -translate-y-1/2 w-80 h-[480px] pointer-events-none select-none z-0 opacity-15">
        <Image
          src="/catalog/dragon-ball/item-001.png"
          alt="3D Figure Watermark Left"
          fill
          className="object-contain filter grayscale contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#07070B]/50 to-[#07070B]" />
      </div>

      <div className="hidden lg:block absolute -right-12 top-1/2 -translate-y-1/2 w-80 h-[480px] pointer-events-none select-none z-0 opacity-15">
        <Image
          src="/custom/tanjiro_new_arrival_3d.jpg"
          alt="3D Figure Watermark Right"
          fill
          className="object-contain filter grayscale contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#07070B]/50 to-[#07070B]" />
      </div>

      {/* Large Japanese Kanji Background Watermark */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 opacity-[0.035] overflow-hidden">
        <span className="font-heading text-[220px] sm:text-[320px] font-black text-white tracking-tighter whitespace-nowrap">
          領域展開
        </span>
      </div>

      {/* Ambient Radial Lighting */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 30%, rgba(230, 51, 41, 0.25) 0%, rgba(123, 47, 190, 0.12) 50%, transparent 80%)',
        }}
      />

      {/* Subtle Geometric Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header Logo */}
      <div className="relative z-10 text-center pt-3 sm:pt-6">
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

      {/* Centered Credential Card with Sitting Character */}
      <main className="relative z-10 w-full max-w-[430px] mx-auto my-auto pt-24 pb-4">
        <div className="relative">
          {/* 3D Sitting Character on top edge */}
          <SittingAnimeCharacter inputState={inputState} />

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-white/[0.12] bg-[#111019]/95 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl shadow-black relative z-10 overflow-hidden"
          >
            {/* Top Border Red Accent Glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-80" />

            {/* Card Header */}
            <div className="text-center mb-5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/10 border border-red-600/30 text-red-400 text-[10px] font-bold tracking-widest uppercase rounded-full mb-2">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                HUNTER PORTAL // 認証
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-wider uppercase text-white">
                SIGN IN
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Enter your credentials to access your collection
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Error Alert Banner */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 shadow-md"
                >
                  <span className="text-red-400 font-bold text-sm leading-none mt-0.5">✕</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-red-300">Authentication Error</p>
                    <p className="text-[11px] text-red-200/90 leading-tight mt-0.5">{errorMessage}</p>
                  </div>
                </motion.div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-gray-300 mb-1.5">
                  Hunter ID / Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setInputState('email')}
                    onBlur={() => setInputState('idle')}
                    required
                    placeholder="hunter@example.com"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-red focus:bg-white/[0.08] focus:ring-1 focus:ring-brand-red/50 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold tracking-wider uppercase text-gray-300">
                    Secret Jutsu / Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-xs text-gray-400 hover:text-brand-red transition-colors cursor-pointer"
                  >
                    Forgot secret?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setInputState('password')}
                    onBlur={() => setInputState('idle')}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-red focus:bg-white/[0.08] focus:ring-1 focus:ring-brand-red/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-0.5 cursor-pointer"
                    aria-label="Toggle password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-700 bg-white/5 text-brand-red focus:ring-0 accent-brand-red"
                  />
                  <span>Stay logged in on this device</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                onMouseEnter={() => setInputState('hover-submit')}
                onMouseLeave={() => setInputState('idle')}
                className="w-full rounded-xl bg-brand-red hover:bg-brand-red-dark py-3 text-sm font-heading font-black tracking-widest uppercase text-white transition-all duration-200 shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 mt-2 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 mt-2"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center text-xs text-gray-400">
              <span>New to BAKA? </span>
              <Link
                href="/signup"
                className="text-white font-bold hover:text-brand-red transition-colors underline underline-offset-4 ml-1"
              >
                Create Hunter Account
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Security Assurance */}
        <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            256-Bit Encrypted Portal
          </span>
          <span>•</span>
          <span>100% Official Figures</span>
        </div>
      </main>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {forgotPasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-[#111019] border border-white/10 p-6 shadow-2xl relative text-white"
            >
              <h3 className="font-heading text-lg font-bold uppercase tracking-wider mb-1">
                Reset Secret Password
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Enter your registered email address and we will send you a secure password reset link.
              </p>

              <form onSubmit={handlePasswordReset} className="space-y-3">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="hunter@example.com"
                  required
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-red transition-all"
                />

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 rounded-xl bg-brand-red text-white text-xs font-heading font-black tracking-wider uppercase flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[11px] text-gray-600 py-2">
        © 2026 BAKA — Authentic Anime Collectibles & Statues
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070B] flex items-center justify-center text-white text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
