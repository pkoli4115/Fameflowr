// FILE: src/components/common/ConfirmDialog.tsx
// =============================
import React from "react";

export default function ConfirmDialog({ open, title, message, onCancel, onConfirm }: {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-4 text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">Confirm</button>
        </div>
      </div>
    </div>
  );
}
