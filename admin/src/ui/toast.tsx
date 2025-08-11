import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastCtx = {
  push: (kind: ToastKind, message: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const idRef = useRef(0);
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setItems(prev => [...prev, { id, kind, message }]);
    // auto-dismiss after 2.2s
    setTimeout(() => remove(id), 2200);
  }, [remove]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {items.map(t => (
          <div
            key={t.id}
            className={[
              "rounded-lg px-4 py-2 shadow-lg text-sm text-white",
              t.kind === "success" ? "bg-emerald-600" :
              t.kind === "error"   ? "bg-rose-600"    :
                                     "bg-slate-700"
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider />");
  return ctx;
}

// Optional imperative helpers
export const toast = {
  ref: { push: (_k: ToastKind, _m: string) => {} } as ToastCtx,
  success(msg: string) { this.ref.push("success", msg); },
  error(msg: string)   { this.ref.push("error", msg); },
  info(msg: string)    { this.ref.push("info", msg); },
};

// Wire the imperative helpers to the provider at runtime
export const ToastBridge: React.FC = () => {
  const { push } = useToast();
  useEffect(() => { toast.ref.push = push; }, [push]);
  return null;
};
