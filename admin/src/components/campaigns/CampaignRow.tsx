import React, { useMemo, useState } from "react";
import type { Campaign } from "../../types/campaign";
import { fmtDate } from "../../utils/format";
import { setPublished } from "../../firebase/campaignApi";

export default function CampaignRow({
  item,
  onEdit,
  onDelete,
  onPublish, // will be called after successful toggle
}: {
  item: Campaign;
  onEdit: (c: Campaign) => void;
  onDelete: (c: Campaign) => void;
  onPublish: (c: Campaign) => void;
}) {
  const [status, setStatus] = useState<Campaign["status"]>(item.status);
  const [pending, setPending] = useState(false);

  const isActive = status === "active";
  const isLocked = status === "completed" || status === "archived";
  const publishLabel = isActive ? "Unpublish" : "Publish";

  const nextPublished = useMemo(() => !isActive, [isActive]);

  const handlePublishToggle = async () => {
    if (isLocked || pending) return;
    setPending(true);

    try {
      // optimistic UI
      setStatus(nextPublished ? "active" : "draft");

      // write to Firestore
      await setPublished(item.id, nextPublished);

      // allow parent to refresh list or show toast
      onPublish?.({ ...item, status: nextPublished ? "active" : "draft" });
    } catch (e) {
      // revert on failure
      setStatus(item.status);
      console.error("Publish toggle failed:", e);
      // (optional) surface a toast here if you have one
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{item.title}</div>
        <div className="text-xs text-gray-500">{item.category || "general"}</div>
        <div className="mt-1 text-[11px] text-gray-500">
          <span className="mr-2 rounded-full bg-gray-100 px-2 py-0.5 capitalize">{status}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 capitalize">{item.visibility}</span>
        </div>
      </div>

      <div className="hidden shrink-0 text-right md:block">
        <div className="text-xs text-gray-500">
          Start: {fmtDate(item.startAt)}
          <br />
          End: {fmtDate(item.endAt)}
        </div>
      </div>

      <div className="ml-3 flex shrink-0 gap-2">
        <button
          onClick={handlePublishToggle}
          disabled={isLocked || pending}
          className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
          title={
            isLocked
              ? "Completed/archived campaigns cannot be published"
              : publishLabel
          }
        >
          {pending ? "..." : publishLabel}
        </button>

        <button
          onClick={() => onEdit(item)}
          className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100"
          disabled={pending}
        >
          Edit
        </button>

        <button
          onClick={() => onDelete(item)}
          className="rounded-lg border px-3 py-1 text-sm text-red-600 hover:bg-red-50"
          disabled={pending}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
