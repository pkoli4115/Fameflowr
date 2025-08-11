// src/components/campaigns/CampaignForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Campaign, CampaignCategory, CampaignVisibility } from "../../firebase/campaignApi";

type Props = {
  open: boolean;
  onClose: () => void;
  editing: Campaign | null;
  onCreate: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any) => Promise<void>;
};

const categories: CampaignCategory[] = ["Brand", "UGC", "Contest", "Influencer", "Awareness", "Other"];
const visibilities: CampaignVisibility[] = ["public", "private"];

const emptyForm = {
  title: "",
  description: "",
  coverUrl: "",
  category: "Brand" as CampaignCategory,
  visibility: "public" as CampaignVisibility,
  startDate: "",
  endDate: "",
  budget: "",
  isPublished: false,
};

const CampaignForm: React.FC<Props> = ({ open, onClose, editing, onCreate, onUpdate }) => {
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const isEdit = !!editing;

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title ?? "",
        description: editing.description ?? "",
        coverUrl: editing.coverUrl ?? "",
        category: editing.category,
        visibility: editing.visibility,
        startDate: editing.startDate?.slice(0, 16) ?? "",
        endDate: editing.endDate?.slice(0, 16) ?? "",
        budget: editing.budget?.toString() ?? "",
        isPublished: editing.isPublished ?? false,
      });
    } else {
      setForm({ ...emptyForm });
    }
  }, [editing]);

  const isValid = useMemo(() => {
    if (!form.title.trim()) return false;
    if (!form.startDate || !form.endDate) return false;
    const start = Date.parse(form.startDate);
    const end = Date.parse(form.endDate);
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    if (start >= end) return false;
    return true;
  }, [form]);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };
      if (isEdit && editing) {
        await onUpdate(editing.id, payload);
      } else {
        await onCreate(payload);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit campaign" : "New campaign"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm">Title</span>
            <input
              className="w-full rounded-lg border p-2"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Summer UGC Contest"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm">Category</span>
            <select
              className="w-full rounded-lg border p-2"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CampaignCategory }))}
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm">Description</span>
            <textarea
              className="w-full rounded-lg border p-2"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe goals, rules, deliverables..."
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm">Start</span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border p-2"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm">End</span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border p-2"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm">Visibility</span>
            <select
              className="w-full rounded-lg border p-2"
              value={form.visibility}
              onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value as CampaignVisibility }))}
            >
              {visibilities.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm">Cover URL</span>
            <input
              className="w-full rounded-lg border p-2"
              value={form.coverUrl}
              onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm">Budget (optional)</span>
            <input
              className="w-full rounded-lg border p-2"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              placeholder="10000"
              inputMode="numeric"
            />
          </label>

          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
            />
            <span className="text-sm">Publish immediately</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">Cancel</button>
          <button
            disabled={!isValid || saving}
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create campaign"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignForm;
