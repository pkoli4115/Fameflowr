// src/components/campaigns/CampaignFilters.tsx
import React from "react";
import { CampaignCategory, CampaignVisibility } from "../../firebase/campaignApi";

type Value = {
  search?: string;
  status?: "all" | "draft" | "scheduled" | "active" | "ended";
  category?: CampaignCategory | "all";
  visibility?: CampaignVisibility | "all";
};

type Props = {
  value: Value;
  onChange: (v: Value) => void;
};

const CampaignFilters: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="rounded-xl border p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
      <input
        className="rounded-lg border p-2 md:col-span-2"
        placeholder="Search title or description..."
        value={value.search ?? ""}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
      />

      <select
        className="rounded-lg border p-2"
        value={value.status ?? "all"}
        onChange={(e) => onChange({ ...value, status: e.target.value as Value["status"] })}
      >
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="scheduled">Scheduled</option>
        <option value="active">Active</option>
        <option value="ended">Ended</option>
      </select>

      <select
        className="rounded-lg border p-2"
        value={value.category ?? "all"}
        onChange={(e) => onChange({ ...value, category: e.target.value as Value["category"] })}
      >
        <option value="all">All categories</option>
        <option value="Brand">Brand</option>
        <option value="UGC">UGC</option>
        <option value="Contest">Contest</option>
        <option value="Influencer">Influencer</option>
        <option value="Awareness">Awareness</option>
        <option value="Other">Other</option>
      </select>

      <select
        className="rounded-lg border p-2"
        value={value.visibility ?? "all"}
        onChange={(e) => onChange({ ...value, visibility: e.target.value as Value["visibility"] })}
      >
        <option value="all">All visibility</option>
        <option value="public">Public</option>
        <option value="private">Private</option>
      </select>
    </div>
  );
};

export default CampaignFilters;
