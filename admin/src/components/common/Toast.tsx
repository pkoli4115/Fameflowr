// FILE: src/components/common/Toast.tsx
// =============================
import React, { createContext, useContext, useState } from "react";

type Toast = { id: number; message: string; variant?: "success" | "error" };
const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3000);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2">
        {items.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-2 text-sm shadow ${t.variant === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white"}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};