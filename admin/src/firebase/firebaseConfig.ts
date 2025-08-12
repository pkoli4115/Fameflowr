// FILE: src/firebase/firebaseConfig.ts
import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { getStorage } from "firebase/storage";

/**
 * Prefer environment variables (Vite) and fall back to current hard-coded values.
 * Replace the fallback values once your .env files are in place.
 *
 * In Vite, define:
 *  VITE_FIREBASE_API_KEY
 *  VITE_FIREBASE_AUTH_DOMAIN
 *  VITE_FIREBASE_PROJECT_ID
 *  VITE_FIREBASE_STORAGE_BUCKET
 *  VITE_FIREBASE_MSG_SENDER_ID
 *  VITE_FIREBASE_APP_ID
 *  (optional) VITE_FIREBASE_MEASUREMENT_ID
 */
const envConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // optional
};

// --- Fallback to your current config if env vars are missing ---
const fallbackConfig: FirebaseOptions = {
  apiKey: "AIzaSyCSMShYiEsDuW4Nuk0k2qV3_xhGhwJEOW4",
  authDomain: "fameflowr-217f9.firebaseapp.com",
  projectId: "fameflowr-217f9",
  storageBucket: "fameflowr-217f9.appspot.com",
  messagingSenderId: "292930303272",
  appId: "1:292930303272:web:ff58322ffc6232105e8c1d",
  measurementId: "G-PYMXMKM3CC",
};

function pickConfig(): FirebaseOptions {
  // If all required envs are present, use envConfig; otherwise fallback
  const required = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"] as const;
  const hasAll =
    envConfig &&
    required.every((k) => typeof (envConfig as any)[k] === "string" && ((envConfig as any)[k] as string).length > 0);
  return hasAll ? envConfig : fallbackConfig;
}

export const firebaseConfig = pickConfig();

// --- Initialize ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- Dev-only console helpers (guarded) ---
declare global {
  interface Window {
    ffAuth?: ReturnType<typeof getAuth>;
    ffDb?: ReturnType<typeof getFirestore>;
    ffDoc?: typeof doc;
    ffGetDoc?: typeof getDoc;
    ffUpdateDoc?: typeof updateDoc;
    ffSignIn?: (email: string, password: string) => Promise<any>;
    ffOnAuth?: (cb: (u: any) => void) => void;
  }
}

if (typeof window !== "undefined" && import.meta.env && import.meta.env.DEV) {
  window.ffAuth = auth;
  window.ffDb = db;
  window.ffDoc = doc;
  window.ffGetDoc = getDoc;
  window.ffUpdateDoc = updateDoc;
  window.ffSignIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
  window.ffOnAuth = (cb: (u: any) => void) => onAuthStateChanged(auth, cb);
}

// --- Exports used across the app ---
export { app, db, auth, storage };
