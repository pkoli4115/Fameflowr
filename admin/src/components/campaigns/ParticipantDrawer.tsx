// FILE: src/components/campaigns/ParticipantDrawer.tsx
// =============================
import React, { useEffect, useState } from "react";
import { listParticipants, type Participant } from "../../firebase/campaignApi";
import { fmtDate } from "../../utils/format";

export default function ParticipantDrawer({ open, campaignId, onClose }: { open: boolean; campaignId: string | null; onClose: () => void; }) {
  const [items, setItems] = useState<Participant[]>([]);
  useEffect(() => {
    if (open && campaignId) {
      listParticipants(campaignId).then(setItems).catch(() => setItems([]));
    }
  }, [open, campaignId]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-full max-w-md bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Participants</h3>
          <button onClick={onClose} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">Close</button>
        </div>
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="rounded-xl border p-3">
              <div className="font-medium">{p.displayName}</div>
              <div className="text-xs text-gray-500">{p.email || "—"}</div>
              <div className="text-xs text-gray-500">Joined: {fmtDate(p.joinedAt)}</div>
              <div className="text-xs">Status: {p.status}</div>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-gray-500">No participants.</div>}
        </div>
      </div>
      <div className="flex-1 bg-black/30" onClick={onClose} />
    </div>
  );
}
