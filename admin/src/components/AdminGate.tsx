import React, { useEffect, useState } from "react";
import { auth } from "../firebase/firebaseConfig";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";
import AdminLoginModal from "./AdminLoginModal";

type Props = { children: React.ReactNode };

const AdminGate: React.FC<Props> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setError(null);

      if (!u) {
        setNeedsLogin(true);
        setChecking(false);
        return;
      }

      try {
        // Refresh ID token to pull latest custom claims
        await u.getIdToken(true);
        const t = await u.getIdTokenResult();
        const claims = t.claims as any;

        const isAdmin =
          claims.admin === true ||
          claims.role === "admin" ||
          claims.role === "superadmin" ||
          // Optional fallback allowlist while you migrate claims:
          ["youremail@example.com"].includes(u.email || "");

        if (!isAdmin) {
          await signOut(auth);
          setError("You are not authorized to access the admin panel.");
          setNeedsLogin(true);
          setChecking(false);
          return;
        }

        setNeedsLogin(false);
        setChecking(false);
      } catch (e: any) {
        setError(e?.message || "Failed to verify admin permissions.");
        setNeedsLogin(true);
        setChecking(false);
      }
    });

    return () => unsub();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged continues the flow
    } catch (e: any) {
      setError(e?.message || "Login failed");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setNeedsLogin(true);
  };

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center text-gray-500">
        Checking permissions…
      </div>
    );
  }

  if (needsLogin) {
    return <AdminLoginModal onLogin={handleLogin} error={error || undefined} />;
  }

  return (
    <div className="min-h-screen">
      <div className="p-2 text-right text-sm text-gray-500">
        {user?.email} ·{" "}
        <button onClick={handleLogout} className="underline">
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
};

export default AdminGate;
