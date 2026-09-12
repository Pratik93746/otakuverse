'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Zap,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  signInWithFirebaseGoogle,
  signInWithFirebaseEmail,
} from '@/lib/firebase';

/* ──────────────────────────────────────────────
   Element & Character Themes
   ────────────────────────────────────────────── */
const ELEMENT_THEMES = {
  domain: {
    id: 'domain',
    name: 'Infinite Void',
    color: '#00F5D4',
    secondary: '#A855F7',
    glow: 'rgba(0, 245, 212, 0.45)',
    btnGradient: 'from-cyan-400 to-purple-600',
  },
  saiyan: {
    id: 'saiyan',
    name: 'Ultra Instinct',
    color: '#FFD000',
    secondary: '#FF8C00',
    glow: 'rgba(255, 208, 0, 0.45)',
    btnGradient: 'from-amber-400 to-yellow-600',
  },
  nika: {
    id: 'nika',
    name: 'Sun God Nika',
    color: '#FF1E56',
    secondary: '#FF6B8B',
    glow: 'rgba(255, 30, 86, 0.45)',
    btnGradient: 'from-rose-500 to-red-600',
  },
  flame: {
    id: 'flame',
    name: 'Hinokami Sun Dance',
    color: '#FF5100',
    secondary: '#FFB703',
    glow: 'rgba(255, 81, 0, 0.45)',
    btnGradient: 'from-orange-500 to-amber-600',
  },
  santoryu: {
    id: 'santoryu',
    name: 'Santoryu Secret',
    color: '#00E676',
    secondary: '#00E5FF',
    glow: 'rgba(0, 230, 118, 0.45)',
    btnGradient: 'from-emerald-400 to-teal-700',
  },
};

type ElementKey = keyof typeof ELEMENT_THEMES;

interface AnimeCharacterData {
  id: string;
  name: string;
  companionName: string;
  kanji: string;
  kanjiTag: string;
  watermarkQuote: string;
  franchise: string;
  image: string;
  quote: string;
  theme: ElementKey;
  dialogues: {
    idle: string;
    email: string;
    passwordHidden: string;
    passwordShown: string;
    hoverSubmit: string;
    loading: string;
  };
}

const animeCharacters: AnimeCharacterData[] = [
  {
    id: 'gojo',
    name: 'SATORU GOJO',
    companionName: 'Chibi Gojo',
    kanji: '天上天下唯我独尊',
    kanjiTag: '無量空処',
    watermarkQuote: 'THROUGHOUT HEAVEN AND EARTH, I ALONE AM THE HONORED ONE',
    franchise: 'Jujutsu Kaisen',
    image: '/catalog/jujutsu-kaisen/item-001.jpg',
    quote: '"Throughout Heaven and Earth, I alone am the honored one."',
    theme: 'domain',
    dialogues: {
      idle: "Welcome back! Don't worry, I'm the strongest! 🤞",
      email: 'Scanning your Special Grade Sorcerer ID... 📜',
      passwordHidden: 'Infinity barrier activated! No peeking! 🙈',
      passwordShown: 'Six Eyes activated! Everything is visible! 👁️✨',
      hoverSubmit: 'DOMAIN EXPANSION: INFINITE VOID! 🌀⚡',
      loading: 'Opening Cursed Energy Portal... 💫',
    },
  },
  {
    id: 'goku',
    name: 'GOKU ULTRA INSTINCT',
    companionName: 'Chibi Goku',
    kanji: '限界突破 神の領域',
    kanjiTag: '身勝手の極意',
    watermarkQuote: 'I WILL NEVER GIVE UP! BREAK THROUGH ALL LIMITS!',
    franchise: 'Dragon Ball Super',
    image: '/catalog/dragon-ball/item-001.png',
    quote: '"I will never give up! Break through all limits!"',
    theme: 'saiyan',
    dialogues: {
      idle: "Hey, I'm Goku! Ready to power up your collection? 🥋",
      email: 'Locating your Saiyan Power Level... 📟',
      passwordHidden: 'Instant Transmission defense! Secret locked! 🙈',
      passwordShown: 'Super Saiyan God aura! Password unlocked! ⚡✨',
      hoverSubmit: '100x KAMEHAMEHA ENERGY READY! 🔥💥',
      loading: 'Gathering Spirit Bomb energy... 🌟',
    },
  },
  {
    id: 'luffy',
    name: 'MONKEY D. LUFFY (GEAR 5)',
    companionName: 'Chibi Luffy',
    kanji: '解放のドラム 太陽神',
    kanjiTag: '太陽の神ニカ',
    watermarkQuote: 'THE DRUMS OF LIBERATION! I CAN DO EVERYTHING I EVER WANTED!',
    franchise: 'One Piece',
    image: '/catalog/one-piece/item-001.jpg',
    quote: '"I can do everything I ever wanted! The Drums of Liberation!"',
    theme: 'nika',
    dialogues: {
      idle: "Ahoy! Let's set sail for the Grand Line figures! 🍖",
      email: 'Checking your Straw Hat Pirate bounty... 🗺️',
      passwordHidden: 'Gomu Gomu defense! No peeking allowed! 🙈',
      passwordShown: 'Observation Haki active! Password revealed! 👁️✨',
      hoverSubmit: 'GEAR 5TH: DRUMS OF LIBERATION! 🥁⚡',
      loading: 'Launching Thousand Sunny into the Verse... ⛵',
    },
  },
  {
    id: 'tanjiro',
    name: 'TANJIRO KAMADO',
    companionName: 'Chibi Tanjiro',
    kanji: '心を燃やせ 太陽呼吸',
    kanjiTag: 'ヒノカミ神楽',
    watermarkQuote: 'SET YOUR HEART ABLAZE! NEVER LET YOUR SPIRIT WAVER!',
    franchise: 'Demon Slayer',
    image: '/catalog/demon-slayer/item-001.jpg',
    quote: '"Set your heart ablaze! Never let your spirit waver!"',
    theme: 'flame',
    dialogues: {
      idle: 'Welcome, Demon Slayer! Keep your heart ablaze! ⚔️',
      email: 'Opening your Demon Slayer Corps Scroll... 📜',
      passwordHidden: 'Total Concentration Breathing: Guard Up! 🙈',
      passwordShown: 'Transparent World active! Secret unlocked! 👁️✨',
      hoverSubmit: 'HINOKAMI KAGURA: SUN DRAGON DANCE! 🐉🔥',
      loading: 'Total Concentration: Constant Active... 🗡️',
    },
  },
  {
    id: 'zoro',
    name: 'RORONOA ZORO',
    companionName: 'Chibi Zoro',
    kanji: '三千世界 閻魔覇気',
    kanjiTag: '三刀流奥義',
    watermarkQuote: 'THREE THOUSAND WORLDS! HE WHO LEAVES HIS PAST BEHIND IS A COWARD!',
    franchise: 'One Piece',
    image: '/catalog/one-piece/item-002.jpg',
    quote: '"If I die here, then I’m a man that could only make it this far."',
    theme: 'santoryu',
    dialogues: {
      idle: "Where are we? Don't get lost on the way in! 🗡️",
      email: 'Checking your swordsman credentials... 📜',
      passwordHidden: 'Santoryu guard up! Eyes closed! 🙈',
      passwordShown: 'King of Hell Dragon gaze! Unlocked! 👁️✨',
      hoverSubmit: 'THREE THOUSAND WORLDS: FULL STRIKE! ⚔️🌪️',
      loading: 'Cutting through the portal dimension... 🗡️',
    },
  },
];

/* ──────────────────────────────────────────────
   Floating Spiritual Energy / Aura Petals
   ────────────────────────────────────────────── */
function SpiritualPetals({ color }: { color: string }) {
  const petals = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    left: `${(i * 6.5 + 2) % 100}%`,
    delay: (i * 0.6) % 5,
    duration: 6 + (i % 4) * 2,
    size: 8 + (i % 5) * 3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {petals.map((p) => (
        <motion.div
          key={p.id}
          className="absolute opacity-40 pointer-events-none"
          style={{ left: p.left, top: '-5%', width: p.size, height: p.size * 1.4 }}
          animate={{
            y: ['0vh', '110vh'],
            x: [0, (p.id % 2 === 0 ? 30 : -30), 0],
            rotateZ: [0, 360],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <svg viewBox="0 0 30 40" className="w-full h-full drop-shadow-md">
            <path d="M15 0 C25 10, 30 25, 15 40 C0 25, 5 10, 15 0 Z" fill={color} opacity="0.85" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Dynamic Chibi Anime Mascot Component
   ────────────────────────────────────────────── */
function ChibiGuardian({
  state,
  character,
  theme,
}: {
  state: string;
  character: AnimeCharacterData;
  theme: typeof ELEMENT_THEMES[ElementKey];
}) {
  const getDialogue = () => {
    switch (state) {
      case 'email':
        return character.dialogues.email;
      case 'password-hidden':
        return character.dialogues.passwordHidden;
      case 'password-shown':
        return character.dialogues.passwordShown;
      case 'hover-submit':
        return character.dialogues.hoverSubmit;
      case 'loading':
        return character.dialogues.loading;
      default:
        return character.dialogues.idle;
    }
  };

  return (
    <div className="relative flex items-center gap-3 p-3 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md mb-4 shadow-lg group transition-all duration-300">
      <motion.div
        animate={{
          scale: state === 'hover-submit' ? [1, 1.3, 1.1] : [1, 1.15, 1],
          opacity: state === 'hover-submit' ? [0.6, 1, 0.7] : [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute -left-1 -top-1 w-14 h-14 rounded-full blur-xl pointer-events-none"
        style={{ backgroundColor: theme.color }}
      />

      <motion.div
        animate={
          state === 'hover-submit'
            ? { y: [-2, 2, -2], rotate: [-2, 2, -2], scale: 1.08 }
            : state === 'password-hidden'
              ? { y: [0, 2, 0], scale: 0.96 }
              : { y: [-2, 2, -2] }
        }
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-11 h-11 flex-shrink-0 cursor-pointer"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          {state === 'hover-submit' && (
            <motion.path
              animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              d="M50 5 L60 25 L85 20 L70 45 L95 60 L65 70 L75 95 L50 80 L25 95 L35 70 L5 60 L30 45 L15 20 L40 25 Z"
              fill={theme.secondary}
              opacity="0.5"
            />
          )}
          <circle cx="50" cy="52" r="32" fill="#FFE0BD" />
          <path d="M20 45 C15 25, 25 10, 35 18 C42 8, 58 8, 65 18 C75 10, 85 25, 80 45 C75 35, 60 30, 50 32 C40 30, 25 35, 20 45 Z" fill={theme.color} />
          <rect x="24" y="32" width="52" height="12" rx="3" fill="#1E293B" />
          <rect x="42" y="34" width="16" height="8" rx="2" fill="#E2E8F0" />
          <circle cx="50" cy="38" r="2" fill="#0F172A" />
          {state === 'password-hidden' ? (
            <>
              <ellipse cx="38" cy="56" rx="5" ry="2" fill="#F43F5E" opacity="0.6" />
              <ellipse cx="62" cy="56" rx="5" ry="2" fill="#F43F5E" opacity="0.6" />
              <circle cx="36" cy="50" r="9" fill="#FFCD9E" stroke="#E28743" strokeWidth="1.5" />
              <circle cx="64" cy="50" r="9" fill="#FFCD9E" stroke="#E28743" strokeWidth="1.5" />
            </>
          ) : state === 'password-shown' ? (
            <>
              <circle cx="38" cy="50" r="8" fill="#DC2626" />
              <circle cx="38" cy="50" r="4" fill="#000" />
              <circle cx="38" cy="48" r="1.5" fill="#FFF" />
              <circle cx="62" cy="50" r="8" fill="#DC2626" />
              <circle cx="62" cy="50" r="4" fill="#000" />
              <circle cx="62" cy="48" r="1.5" fill="#FFF" />
            </>
          ) : (
            <>
              <ellipse cx="38" cy="50" rx="5" ry="7" fill="#1E1B4B" />
              <circle cx="36" cy="47" r="2.5" fill="#FFFFFF" />
              <ellipse cx="62" cy="50" rx="5" ry="7" fill="#1E1B4B" />
              <circle cx="60" cy="47" r="2.5" fill="#FFFFFF" />
              <ellipse cx="32" cy="57" rx="3.5" ry="2" fill="#FB7185" opacity="0.7" />
              <ellipse cx="68" cy="57" rx="3.5" ry="2" fill="#FB7185" opacity="0.7" />
            </>
          )}
          <path d={state === 'hover-submit' ? 'M44 65 Q50 72 56 65 Z' : 'M46 63 Q50 68 54 63'} stroke="#000" strokeWidth="1.5" fill={state === 'hover-submit' ? '#DC2626' : 'none'} />
        </svg>
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/90">
            {character.companionName}
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase transition-colors"
            style={{
              borderColor: `${theme.color}50`,
              color: theme.color,
              backgroundColor: `${theme.color}15`,
            }}
          >
            {character.kanjiTag}
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={`${character.id}-${state}`}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            className="text-xs text-gray-300 font-medium truncate"
          >
            {getDialogue()}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function PowerLevelGauge({ email, password, theme }: { email: string; password: string; theme: typeof ELEMENT_THEMES[ElementKey] }) {
  const emailScore = email.length > 5 && email.includes('@') ? 45 : Math.min(email.length * 3, 30);
  const passScore = password.length >= 6 ? 55 : password.length * 8;
  const powerLevel = Math.min(emailScore + passScore, 100);
  const isOver9000 = powerLevel >= 95;

  return (
    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-gray-400 font-bold tracking-wider uppercase text-[10px]">
          <Zap className="w-3.5 h-3.5" style={{ color: theme.color }} />
          Chakra Resonance:
        </span>
        <span className="font-black font-mono tracking-widest text-xs" style={{ color: isOver9000 ? theme.secondary : theme.color }}>
          {isOver9000 ? 'OVER 9000+ ⚡' : `${powerLevel * 90} CP`}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden relative border border-white/5">
        <motion.div className="h-full rounded-full transition-all duration-300" style={{ width: `${powerLevel}%`, background: `linear-gradient(90deg, ${theme.color}, ${theme.secondary})`, boxShadow: `0 0 10px ${theme.color}` }} />
      </div>
    </div>
  );
}

function OlderLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  const [chibiState, setChibiState] = useState<'idle' | 'email' | 'password-hidden' | 'password-shown' | 'hover-submit' | 'loading'>('idle');

  const currentChar = animeCharacters[activeCharIdx] ?? animeCharacters[0];
  const currentTheme = ELEMENT_THEMES[currentChar.theme];

  const handleCharSelect = (idx: number) => {
    setActiveCharIdx(idx);
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;
    setLoading(true);
    setChibiState('loading');

    try {
      let firebaseUid: string | undefined = undefined;
      let firebaseDisplayName: string | undefined = undefined;

      try {
        const userCredential = await signInWithFirebaseEmail(cleanEmail, password);
        firebaseUid = userCredential.user?.uid;
        firebaseDisplayName = userCredential.user?.displayName || cleanEmail.split('@')[0];
      } catch (fbErr: any) {
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
          msg = 'Too many failed attempts. Try resetting your password.';
        } else if (fbErr?.message) {
          msg = fbErr.message;
        }

        setErrorMessage(msg);
        toast.error(msg);
        setChibiState('idle');
        setLoading(false);
        return;
      }

      const res = await signIn('credentials', {
        email: cleanEmail,
        password,
        name: firebaseDisplayName,
        authType: 'firebase',
        firebaseUid,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        const errorMsg = 'Invalid email or password.';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setChibiState('idle');
      } else {
        setErrorMessage(null);
        toast.success(`Access Granted! Welcome ${currentChar.name} fan 🎌`);
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      const errorMsg = 'Error signing in. Please try again.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      setChibiState('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithFirebaseGoogle();
      const fbUser = result.user;
      if (fbUser?.email) {
        const res = await signIn('credentials', {
          email: fbUser.email,
          name: fbUser.displayName || fbUser.email.split('@')[0],
          authType: 'firebase',
          firebaseUid: fbUser.uid,
          redirect: false,
          callbackUrl,
        });
        if (res?.error) {
          toast.error('Failed to authenticate with Google.');
        } else {
          toast.success(`Welcome to the Realm, ${fbUser.displayName || 'Hunter'}! 🎌`);
          router.push(callbackUrl);
          router.refresh();
        }
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        toast.error(err?.message || 'Google sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-700">
      {/* Dynamic Background Ambient Lighting */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse 75% 65% at 30% 40%, ${currentTheme.glow} 0%, rgba(0,0,0,0) 70%)`,
        }}
      />

      {/* Dynamic Spiritual Petals */}
      <SpiritualPetals color={currentTheme.color} />

      {/* Subtle Grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ──────────────────────────────────────────────
          COMPACT MINIMALIST HEADER
          ────────────────────────────────────────────── */}
      <header className="relative z-20 container-wide py-2.5 sm:py-3 flex items-center justify-between border-b border-white/[0.04]">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-heading text-xl sm:text-2xl tracking-[0.18em] uppercase text-white font-black group-hover:text-brand-red transition-colors">
            OTAKUVERSE
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors"
            style={{
              borderColor: `${currentTheme.color}50`,
              color: currentTheme.color,
              backgroundColor: `${currentTheme.color}15`,
            }}
          >
            {currentChar.kanjiTag}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="text-xs font-bold uppercase transition-colors hover:underline"
            style={{ color: currentTheme.color }}
          >
            Clean Mode (V2) →
          </Link>
        </div>
      </header>

      {/* ──────────────────────────────────────────────
          MAIN STAGE: COMPACT & ANDROID-COMPATIBLE CONTAINER (MOVED HIGHER)
          ────────────────────────────────────────────── */}
      <main className="relative z-10 container-wide pt-1 pb-4 sm:pt-2 sm:pb-6 flex-1 flex items-center justify-center px-3 sm:px-6 -translate-y-2 sm:-translate-y-6">
        <div
          className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border bg-black/25 backdrop-blur-md overflow-hidden shadow-2xl transition-all duration-500"
          style={{
            borderColor: `${currentTheme.color}60`,
            boxShadow: `0 16px 40px -10px ${currentTheme.glow}`,
          }}
        >
          {/* ──────────────────────────────────────────────
              MOBILE / ANDROID TOP CHARACTER PREVIEW & SWITCHER (< lg)
              ────────────────────────────────────────────── */}
          <div className="lg:hidden p-4 border-b border-white/[0.08] bg-black/30">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="relative w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 bg-black/60 shadow-md"
                style={{ borderColor: currentTheme.color }}
              >
                <Image
                  src={currentChar.image}
                  alt={currentChar.name}
                  fill
                  className="object-cover object-top"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">
                    {currentChar.franchise}
                  </span>
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase"
                    style={{
                      borderColor: `${currentTheme.color}50`,
                      color: currentTheme.color,
                      backgroundColor: `${currentTheme.color}15`,
                    }}
                  >
                    ★ {currentChar.kanjiTag}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-black uppercase text-white truncate">
                  {currentChar.name}
                </h3>
                <p className="text-[11px] text-gray-300 italic truncate">
                  {currentChar.quote}
                </p>
              </div>
            </div>

            {/* Mobile Touch-Friendly Character Switcher */}
            <div className="grid grid-cols-5 gap-1.5">
              {animeCharacters.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => handleCharSelect(i)}
                  className={`relative rounded-lg overflow-hidden aspect-square border transition-all active:scale-95 cursor-pointer min-h-[44px] ${i === activeCharIdx
                    ? 'ring-2 scale-105 shadow-md'
                    : 'border-white/10 opacity-60'
                    }`}
                  style={{
                    borderColor: i === activeCharIdx ? currentTheme.color : undefined,
                    boxShadow: i === activeCharIdx ? `0 0 10px ${currentTheme.color}80` : undefined,
                  }}
                  aria-label={`Select ${c.name}`}
                >
                  <Image src={c.image} alt={c.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[7px] font-black uppercase text-center text-white truncate">
                    {c.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ──────────────────────────────────────────────
              DESKTOP LEFT STAGE: 3D HOLOGRAPHIC COLLECTOR CARD (>= lg)
              ────────────────────────────────────────────── */}
          <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 relative flex-col justify-between p-5 xl:p-6 border-r border-white/[0.08] bg-transparent overflow-hidden">
            {/* Ambient Background Glow inside card container */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-500"
              style={{
                background: `radial-gradient(ellipse 90% 90% at 50% 50%, ${currentTheme.glow} 0%, transparent 75%)`,
              }}
            />

            {/* Card Header Tag */}
            <div className="relative z-10 flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.color }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-200 truncate">
                  {currentChar.franchise}
                </span>
              </div>
              <span
                className="text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider transition-colors"
                style={{
                  borderColor: `${currentTheme.color}50`,
                  color: currentTheme.color,
                  backgroundColor: `${currentTheme.color}15`,
                }}
              >
                ★ {currentChar.kanjiTag}
              </span>
            </div>

            {/* 3D Prominent Holographic Card (Compact & Best Fit) */}
            <div className="relative z-10 my-auto flex justify-center py-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentChar.id}
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="w-full max-w-[340px] rounded-2xl border-2 p-3 bg-gradient-to-b from-[#181724]/70 to-[#0A0912]/75 backdrop-blur-md shadow-xl relative overflow-hidden group"
                  style={{
                    borderColor: `${currentTheme.color}70`,
                    boxShadow: `0 12px 30px -8px ${currentTheme.glow}, 0 0 20px -4px ${currentTheme.color}35`,
                  }}
                >
                  {/* Holographic Shimmer Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent pointer-events-none" />

                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[10px] font-black tracking-wider uppercase text-white/90 truncate">
                      {currentChar.franchise}
                    </span>
                    <span
                      className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{
                        backgroundColor: `${currentTheme.color}20`,
                        color: currentTheme.color,
                        border: `1px solid ${currentTheme.color}50`,
                      }}
                    >
                      {currentChar.kanjiTag}
                    </span>
                  </div>

                  {/* Best Fit Character Image Frame */}
                  <div className="relative h-44 sm:h-48 xl:h-52 w-full rounded-xl overflow-hidden border border-white/10 bg-black/80 shadow-inner flex items-center justify-center">
                    <Image
                      src={currentChar.image}
                      alt={currentChar.name}
                      fill
                      className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

                    {/* Kanji Watermark inside image frame */}
                    <div className="absolute top-2 right-2 pointer-events-none opacity-25">
                      <span className="font-heading text-3xl font-black text-white">{currentChar.kanji.split(' ')[0]}</span>
                    </div>

                    {/* Character Name banner */}
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                      <p
                        className="text-[8px] font-black uppercase tracking-widest"
                        style={{ color: currentTheme.color }}
                      >
                        SSR COLLECTOR EDITION
                      </p>
                      <h3 className="font-heading text-lg sm:text-xl font-black uppercase text-white tracking-wider truncate">
                        {currentChar.name}
                      </h3>
                    </div>
                  </div>

                  {/* Signature Dialogue Box */}
                  <div className="p-2 mt-2 rounded-lg bg-black/60 border border-white/10 shadow-sm">
                    <p
                      className="text-[9px] font-black uppercase tracking-wider mb-0.5"
                      style={{ color: currentTheme.color }}
                    >
                      Battle Cry // 台詞:
                    </p>
                    <p className="text-[11px] text-gray-200 italic font-serif leading-snug line-clamp-2">
                      {currentChar.quote}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Desktop Bottom Character Selector Row */}
            <div className="relative z-10 mt-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-400" /> Switch Guardian:
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {animeCharacters.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => handleCharSelect(i)}
                    className={`relative rounded-xl overflow-hidden aspect-square border transition-all duration-200 cursor-pointer ${i === activeCharIdx
                      ? 'ring-2 scale-105 shadow-lg'
                      : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                      }`}
                    style={{
                      borderColor: i === activeCharIdx ? currentTheme.color : undefined,
                      boxShadow: i === activeCharIdx ? `0 0 10px ${currentTheme.color}80` : undefined,
                    }}
                  >
                    <Image src={c.image} alt={c.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="absolute bottom-1 left-0.5 right-0.5 text-[7px] font-black uppercase text-center text-white truncate">
                      {c.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────
              RIGHT STAGE: DYNAMIC LOGIN FORM
              ────────────────────────────────────────────── */}
          <div className="lg:col-span-7 xl:col-span-7 p-4 sm:p-6 xl:p-8 flex flex-col justify-between">
            <div>
              <div className="mb-3">
                <span
                  className="text-[11px] font-black tracking-[0.2em] uppercase transition-colors"
                  style={{ color: currentTheme.color }}
                >
                  DOMAIN ACCESS // 認証
                </span>
                <h1 className="font-heading text-xl sm:text-2xl font-black tracking-widest uppercase mt-0.5 text-white">
                  HUNTER SIGN IN
                </h1>
              </div>

              {/* Dynamic Chibi Mascot synced to selected character */}
              <ChibiGuardian
                state={chibiState}
                character={currentChar}
                theme={currentTheme}
              />

              {/* Dynamic Power Level Gauge */}
              <PowerLevelGauge email={email} password={password} theme={currentTheme} />

              {/* Visible Credential Fill Area Card */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[#0F0E1A]/90 border border-white/[0.12] shadow-xl backdrop-blur-md">
                {/* Google Sign In via Firebase */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-2 px-3 rounded-xl bg-white hover:bg-gray-100 text-gray-900 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:scale-[1.01] cursor-pointer disabled:opacity-60 mb-3"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google (Firebase)</span>
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Or Character ID</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-2 shadow-md"
                    >
                      <span className="text-red-400 font-bold text-xs mt-0.5">✕</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[11px] text-red-300">Access Denied</p>
                        <p className="text-[10px] text-red-200/90 leading-tight">{errorMessage}</p>
                      </div>
                    </motion.div>
                  )}
                  <div>
                    <label className="block text-xs font-bold tracking-wider uppercase text-gray-200 mb-1 flex items-center justify-between">
                      <span>Hunter ID / Email</span>
                      <span className="text-[10px] text-gray-400 lowercase">required</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setChibiState('email')}
                        onBlur={() => setChibiState('idle')}
                        required
                        placeholder="hunter@otakuverse.com"
                        className="w-full bg-[#181726] border-2 border-white/20 hover:border-white/30 rounded-xl px-10 py-2.5 sm:py-3 text-sm text-white placeholder-gray-400 outline-none transition-all shadow-inner font-medium focus:bg-[#1E1D30] min-h-[44px]"
                        style={{
                          borderColor: chibiState === 'email' ? currentTheme.color : undefined,
                          boxShadow: chibiState === 'email' ? `0 0 12px ${currentTheme.color}35` : undefined,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider uppercase text-gray-200 mb-1 flex items-center justify-between">
                      <span>Secret Jutsu / Password</span>
                      <span className="text-[10px] text-gray-400 lowercase">required</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setChibiState(showPassword ? 'password-shown' : 'password-hidden')}
                        onBlur={() => setChibiState('idle')}
                        required
                        placeholder="••••••••••••"
                        className="w-full bg-[#181726] border-2 border-white/20 hover:border-white/30 rounded-xl px-10 py-2.5 sm:py-3 text-sm text-white placeholder-gray-400 outline-none transition-all shadow-inner font-medium focus:bg-[#1E1D30] min-h-[44px]"
                        style={{
                          borderColor: (chibiState === 'password-shown' || chibiState === 'password-hidden') ? currentTheme.color : undefined,
                          boxShadow: (chibiState === 'password-shown' || chibiState === 'password-hidden') ? `0 0 12px ${currentTheme.color}35` : undefined,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = !showPassword;
                          setShowPassword(next);
                          setChibiState(next ? 'password-shown' : 'password-hidden');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                        aria-label="Toggle Password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button Synced to Character Theme */}
                  <button
                    type="submit"
                    disabled={loading}
                    onMouseEnter={() => setChibiState('hover-submit')}
                    onMouseLeave={() => setChibiState('idle')}
                    className={`w-full rounded-xl py-3 font-heading text-sm sm:text-base font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-lg bg-gradient-to-r ${currentTheme.btnGradient} hover:opacity-95 hover:scale-[1.01] min-h-[46px]`}
                    style={{
                      boxShadow: `0 8px 25px -4px ${currentTheme.glow}`,
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Unlocking Portal...
                      </>
                    ) : (
                      <>
                        Enter Otakuverse <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-center text-xs text-gray-500 flex items-center justify-between">
              <span>New Hunter? <Link href="/signup" className="text-white font-bold hover:underline" style={{ color: currentTheme.color }}>Create Account</Link></span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> Secure
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Compact Bottom Footer */}
      <footer className="relative z-10 text-center text-[10px] text-gray-600 py-1.5">
        © 2026 OTAKUVERSE — Tokyo to India Authentic Figures
      </footer>
    </div>
  );
}

export default function OlderLoginFullPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070B] flex items-center justify-center text-white">
          <div className="flex items-center gap-2 font-heading tracking-widest text-sm uppercase">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Loading Realm...</span>
          </div>
        </div>
      }
    >
      <OlderLoginContent />
    </Suspense>
  );
}
