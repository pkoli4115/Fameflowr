import React, { useEffect, useState } from "react";
import { listParticipants, Participant } from "../../firebase/campaignApi";

type Props = {
  campaignId: string;
  open: boolean;
  onClose: () => void;
};

const ParticipantList: React.FC<Props> = ({ campaignId, open, onClose }) => {
  const [items, setItems] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const res: Participant[] = await listParticipants(campaignId);
        setItems(res);
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow w-[720px] max-w-[95vw]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Participants</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="py-10 text-center">Loading…</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-gray-600">No participants yet.</div>
          ) : (
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">UID</th>
                    <th className="py-2 pr-4">Joined At</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-2 pr-4">{p.displayName || "—"}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{p.uid}</td>
                      <td className="py-2 pr-4">
                        {p.joinedAt ? new Date(p.joinedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ParticipantList;
