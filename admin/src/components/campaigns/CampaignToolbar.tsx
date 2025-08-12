// FILE: src/components/campaigns/CampaignToolbar.tsx (enhanced)
// =============================
// Replace existing file content with this version to add Reset + View toggle
import React from "react";
import { CampaignListQuery } from "../../types/campaign";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  status: CampaignListQuery["status"];
  onStatus: (v: CampaignListQuery["status"]) => void;
  visibility: CampaignListQuery["visibility"];
  onVisibility: (v: CampaignListQuery["visibility"]) => void;
  category: string | "all";
  onCategory: (v: string | "all") => void;
  onCreate: () => void;
  view: "list" | "grid";
  onView: (v: "list" | "grid") => void;
  onReset: () => void;
}

export default function CampaignToolbar({ search, onSearch, status, onStatus, visibility, onVisibility, category, onCategory, onCreate, view, onView, onReset }: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <input
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-64 rounded-lg border px-3 py-2"
        />
        <select className="rounded-lg border px-2 py-2" value={status || "all"} onChange={(e) => onStatus(e.target.value as any)}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select className="rounded-lg border px-2 py-2" value={visibility || "all"} onChange={(e) => onVisibility(e.target.value as any)}>
          <option value="all">All Visibility</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <input
          placeholder="Category (or All)"
          value={category === "all" ? "" : category}
          onChange={(e) => onCategory(e.target.value ? e.target.value : "all")}
          className="w-56 rounded-lg border px-3 py-2"
        />
        <button onClick={onReset} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Reset</button>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onView(view === "list" ? "grid" : "list")} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">{view === "list" ? "Grid" : "List"} View</button>
        <button onClick={onCreate} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">New Campaign</button>
      </div>
    </div>
  );
}
