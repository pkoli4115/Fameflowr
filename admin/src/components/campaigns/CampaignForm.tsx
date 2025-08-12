import React, { useEffect, useMemo, useState } from "react";
import type { Campaign, NewCampaignInput, UpdateCampaignInput } from "../../types/campaign";

// ---- helpers: datetime-local <-> ISO (Z) ----
// <input type="datetime-local"> expects "YYYY-MM-DDTHH:MM" in the user's local time (no timezone).
// We convert between that and ISO strings (UTC, with Z) for Firestore.
function toLocalInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // local components
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInputValue(localStr?: string): string | undefined {
  if (!localStr) return undefined;
  // Treat the string as local time and convert to ISO in UTC (Z)
  const d = new Date(localStr);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial: Campaign | null;
  onCancel: () => void;
  onSubmit: (data: NewCampaignInput | UpdateCampaignInput) => Promise<void> | void;
};

export default function CampaignForm({ open, mode, initial, onCancel, onSubmit }: Props) {
  const isEdit = mode === "edit";

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const [visibility, setVisibility] = useState<"public" | "private">(initial?.visibility ?? "public");
  const [status, setStatus] = useState<"draft" | "scheduled" | "active" | "completed" | "archived">(
    initial?.status ?? "draft"
  );

  const [startLocal, setStartLocal] = useState<string>(toLocalInputValue(initial?.startAt ?? undefined));
  const [endLocal, setEndLocal] = useState<string>(toLocalInputValue(initial?.endAt ?? undefined));
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Reset when dialog opens with a different item
  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setCategory(initial?.category ?? "general");
    setVisibility(initial?.visibility ?? "public");
    setStatus(initial?.status ?? "draft");
    setStartLocal(toLocalInputValue(initial?.startAt ?? undefined));
    setEndLocal(toLocalInputValue(initial?.endAt ?? undefined));
    setCoverFile(null);
  }, [open, initial]);

  const disabled = useMemo(() => !title.trim(), [title]);

  const handleSubmit = async () => {
    const payload: NewCampaignInput | UpdateCampaignInput = {
      title: title.trim(),
      description: description.trim(),
      category: category || "general",
      visibility,
      status,
      startAt: fromLocalInputValue(startLocal),
      endAt: fromLocalInputValue(endLocal),
    };

    if (coverFile) (payload as NewCampaignInput).coverImageFile = coverFile;

    await onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit Campaign" : "New Campaign"}</h2>
          <button className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50" onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Title</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Campaign title"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-600">Description</label>
            <textarea
              className="h-28 w-full rounded-lg border px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the campaign…"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Category</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="general">general</option>
                <option value="other">other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">Visibility</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
              >
                <option value="public">public</option>
                <option value="private">private</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">Status</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm capitalize"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="active">active</option>
                <option value="completed">completed</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Start (date & time)</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Saved as UTC ISO (e.g., 2025-09-10T00:00:00Z)
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">End (date & time)</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-600">Cover Image</label>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onCancel}>
            Cancel
          </button>
          <button
            disabled={disabled}
            className="rounded-lg bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
            onClick={() => void handleSubmit()}
          >
            {isEdit ? "Save Changes" : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
