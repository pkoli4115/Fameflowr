// src/firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCSMShYiEsDuW4Nuk0k2qV3_xhGhwJEOW4",
  authDomain: "fameflowr-217f9.firebaseapp.com",
  projectId: "fameflowr-217f9",
  storageBucket: "fameflowr-217f9.appspot.com",
  messagingSenderId: "292930303272",
  appId: "1:292930303272:web:ff58322ffc6232105e8c1d",
  measurementId: "G-PYMXMKM3CC",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ---- dev-only console helpers (remove for production) ----
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

window.ffAuth = auth;
window.ffDb = db;
window.ffDoc = doc;
window.ffGetDoc = getDoc;
window.ffUpdateDoc = updateDoc;
window.ffSignIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);
window.ffOnAuth = (cb: (u: any) => void) => onAuthStateChanged(auth, cb);
// ----------------------------------------------------------

export { app, db, auth };
