import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  User as FirebaseUser,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAxbMtQKuTqUOndhEfkykmYmidgBTSjjME',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'otakuverse-5fa52.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'otakuverse-5fa52',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'otakuverse-5fa52.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '495727630855',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:495727630855:web:cd337658ae5d14e37468a2',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-DFCP1CPCCN',
};

export const isFirebaseConfigured = true;

let app: FirebaseApp;
let auth: Auth;
let googleProvider: GoogleAuthProvider;
let analytics: Analytics | null = null;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firebase Analytics on client-side only
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((err) => {
    console.debug('Firebase Analytics initialization skipped:', err);
  });
}

export { app, auth, googleProvider, analytics, onAuthStateChanged, signInAnonymously, RecaptchaVerifier };
export type { FirebaseUser, ConfirmationResult };

/**
 * Sign in anonymously to ensure every guest collector has an authentic Firebase UID
 */
export async function signInFirebaseAnonymously() {
  if (!auth) return null;
  return await signInAnonymously(auth);
}

/**
 * Sign in with Firebase Email & Password
 */
export async function signInWithFirebaseEmail(email: string, pass: string) {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  return await signInWithEmailAndPassword(auth, email, pass);
}

/**
 * Register a new user with Firebase Email, Password & Display Name
 */
export async function signUpWithFirebaseEmail(email: string, pass: string, displayName?: string) {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential;
}

/**
 * Sign in with Google Popup using Firebase
 */
export async function signInWithFirebaseGoogle() {
  if (!auth || !googleProvider) throw new Error('Firebase Google Auth is not initialized');
  return await signInWithPopup(auth, googleProvider);
}

/**
 * Setup reCAPTCHA verifier for Phone Auth
 */
export function setupRecaptcha(containerId: string) {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - allow signInWithPhoneNumber
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired, please retry verification.');
    },
  });
}

/**
 * Send Phone OTP using Firebase Phone Auth
 */
export async function sendFirebasePhoneOTP(phoneNumber: string, appVerifier: RecaptchaVerifier) {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

/**
 * Send password reset email via Firebase
 */
export async function sendFirebasePasswordReset(email: string) {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  return await sendPasswordResetEmail(auth, email);
}

/**
 * Sign out from Firebase
 */
export async function signOutFirebase() {
  if (!auth) return;
  return await firebaseSignOut(auth);
}
