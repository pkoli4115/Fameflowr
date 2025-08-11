// src/pages/Campaigns.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Campaign, computeStatus, getCampaignServerCounts } from "../firebase/campaignApi";
import { useCampaigns } from "../hooks/useCampaigns";
import CampaignFilters from "../components/campaigns/CampaignFilters";
import CampaignStats from "../components/campaigns/CampaignStats";
import CampaignList from "../components/campaigns/CampaignList";
import CampaignForm from "../components/campaigns/CampaignForm";

const CampaignsPage: React.FC = () => {
  const {
    items, loading, error, hasMore, loadMore,
    setFilters, filters, onCreate, onUpdate, onDelete, onTogglePublish
  } = useCampaigns({
    status: "all",
    category: "all",
    visibility: "all",
    search: "",
  });

  const [editing, setEditing] = useState<Campaign | null>(null);
  const [isOpen, setOpen] = useState(false);

  // --- server-side counts across ALL docs ---
  const [counts, setCounts] = useState({ total: 0, active: 0, scheduled: 0, ended: 0, draft: 0 });
  const refreshCounts = useCallback(async () => {
    const s = await getCampaignServerCounts();
    setCounts({ total: s.total, active: s.active, scheduled: s.scheduled, ended: s.ended, draft: s.draft });
  }, []);
  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  // local sums for reach/clicks/likes (first page only; can extend later)
  const sums = useMemo(() => {
    return items.reduce((acc, c) => {
      acc.reach += c.reach ?? 0;
      acc.clicks += c.clicks ?? 0;
      acc.likes += c.likes ?? 0;
      return acc;
    }, { reach: 0, clicks: 0, likes: 0 });
  }, [items]);

  const handleCreate = async (data: any) => { await onCreate(data); setOpen(false); refreshCounts(); };
  const handleUpdate = async (id: string, data: any) => { await onUpdate(id, data); setEditing(null); setOpen(false); refreshCounts(); };
  const handleDelete = async (id: string) => { await onDelete(id); refreshCounts(); };
  const handleToggle = async (id: string, next: boolean) => { await onTogglePublish(id, next); refreshCounts(); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90">
          New Campaign
        </button>
      </div>

      <CampaignFilters value={filters} onChange={setFilters} />

      <CampaignStats stats={{
        total: counts.total,
        active: counts.active,
        scheduled: counts.scheduled,
        ended: counts.ended,
        draft: counts.draft,
        reach: sums.reach,
        clicks: sums.clicks,
        likes: sums.likes,
      }} />

      {error && <div className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3">{error}</div>}

      {/* Use list layout instead of 3-column grid */}
      <CampaignList
        items={items}
        loading={loading}
        view="list"
        onEdit={(c) => { setEditing(c); setOpen(true); }}
        onDelete={(c) => handleDelete(c.id)}
        onTogglePublish={(c, next) => handleToggle(c.id, next)}
      />

      <div className="flex justify-center">
        {hasMore && (
          <button disabled={loading} onClick={loadMore} className="mt-2 px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60">
            {loading ? "Loading..." : "Load more"}
          </button>
        )}
      </div>

      {isOpen && (
        <CampaignForm
          open={isOpen}
          onClose={() => { setOpen(false); setEditing(null); }}
          editing={editing}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
};

export default CampaignsPage;
