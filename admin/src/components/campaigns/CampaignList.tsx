import React, { useEffect, useMemo, useState } from "react";
import {
  Campaign,
  CampaignCounts,
  CampaignListQuery,
  NewCampaignInput,
  UpdateCampaignInput,
} from "../../types/campaign";
import {
  createCampaign,
  deleteCampaign,
  fetchCampaigns,
  getCountsSafe,
  updateCampaign,
  setPublished,
} from "../../firebase/campaignApi";

import CampaignToolbar from "./CampaignToolbar";
import CampaignRow from "./CampaignRow";
import CampaignForm from "./CampaignForm";
import CampaignCountsView from "./CampaignCounts";
import ParticipantDrawer from "./ParticipantDrawer";
import ConfirmDialog from "../common/ConfirmDialog";
import { usePersistedState } from "../../hooks/usePersistedState";

export default function CampaignList() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<CampaignCounts | null>(null);

  // Persisted filters & view
  const [search, setSearch] = usePersistedState("c_search", "");
  const [status, setStatus] = usePersistedState<CampaignListQuery["status"]>("c_status", "all");
  const [visibility, setVisibility] = usePersistedState<CampaignListQuery["visibility"]>("c_visibility", "all");
  const [category, setCategory] = usePersistedState<string | "all">("c_category", "all");
  const [view, setView] = usePersistedState<"list" | "grid">("c_view", "list");

  const [cursor, setCursor] = useState<any | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Campaign | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCampaignId, setDrawerCampaignId] = useState<string | null>(null);

  // Track publish/unpublish in-flight (per id) so UI can disable correctly
  const [pendingPubIds, setPendingPubIds] = useState<Set<string>>(new Set());

  const pageSize = 20;

  const onReset = () => {
    setSearch("");
    setStatus("all");
    setVisibility("all");
    setCategory("all");
  };

  async function load(reset = true) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCampaigns({
        search,
        status,
        visibility,
        category,
        pageSize,
        cursor: reset ? null : cursor,
        orderBy: "createdAt",
        orderDir: "desc",
      });
      setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
      setCursor(res.nextCursor);
    } catch (e: any) {
      setError(e?.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  async function loadCounts() {
    try {
      const c = await getCountsSafe();
      setCounts(c);
    } catch (e) {
      console.warn("[Campaigns] loadCounts failed", e);
      setCounts(null);
    }
  }

  useEffect(() => {
    load(true);
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(true), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, visibility, category]);

  const onCreateClick = () => {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  };

  const onEdit = (c: Campaign) => {
    setFormMode("edit");
    setEditing(c);
    setFormOpen(true);
  };

  const onDeleteClick = (c: Campaign) => {
    setPendingDelete(c);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCampaign(pendingDelete.id);
      await Promise.all([load(true), loadCounts()]);
    } finally {
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  const onSubmit = async (data: NewCampaignInput | UpdateCampaignInput) => {
    if (formMode === "create") {
      await createCampaign(data as NewCampaignInput, "admin"); // replace with real auth uid
    } else if (formMode === "edit" && editing) {
      await updateCampaign(editing.id, data as UpdateCampaignInput);
    }
    setFormOpen(false);
    await Promise.all([load(true), loadCounts()]);
  };

  // Publish/Unpublish handler with optimistic UI + in-flight guard
  const onPublish = async (c: Campaign) => {
    const wantPublish = c.status !== "active"; // draft/scheduled -> publish; active -> unpublish

    if (pendingPubIds.has(c.id)) return;
    setPendingPubIds((s) => new Set(s).add(c.id));

    // optimistic update
    const prevItems = items;
    const nextStatus = wantPublish ? "active" : "draft";
    setItems((arr) => arr.map((it) => (it.id === c.id ? { ...it, status: nextStatus } : it)));

    try {
      await setPublished(c.id, wantPublish);
      // refresh counts in background (no UI block)
      loadCounts();
    } catch (e) {
      console.warn("setPublished failed", e);
      // revert optimistic change
      setItems(prevItems);
    } finally {
      setPendingPubIds((s) => {
        const n = new Set(s);
        n.delete(c.id);
        return n;
      });
    }
  };

  const openParticipants = (c: Campaign) => {
    setDrawerCampaignId(c.id);
    setDrawerOpen(true);
  };

  // quick helper to know if a row is pending publish/unpublish
  const isPending = (id: string) => pendingPubIds.has(id);

  return (
    <div className="space-y-4">
      <CampaignCountsView counts={counts} />

      <CampaignToolbar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        visibility={visibility}
        onVisibility={setVisibility}
        category={category}
        onCategory={setCategory}
        onCreate={onCreateClick}
        view={view}
        onView={setView}
        onReset={onReset}
      />

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className={view === "grid" ? "grid grid-cols-1 gap-2 md:grid-cols-2" : "space-y-2"}>
        {items.map((c) => (
          <div key={c.id} className={view === "grid" ? "rounded-xl border p-3" : ""}>
            {view === "grid" ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-gray-500">{c.category || "general"}</div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    <span className="mr-2 rounded-full bg-gray-100 px-2 py-0.5 capitalize">{c.status}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 capitalize">{c.visibility}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPublish(c)}
                    disabled={c.status === "completed" || c.status === "archived" || isPending(c.id)}
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
                    title={
                      c.status === "completed" || c.status === "archived"
                        ? "Completed/archived campaigns cannot be published"
                        : c.status === "active"
                        ? "Unpublish"
                        : "Publish"
                    }
                  >
                    {isPending(c.id) ? "..." : c.status === "active" ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => onEdit(c)} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100">
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteClick(c)}
                    className="rounded-lg border px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => openParticipants(c)}
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100"
                  >
                    Participants
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="flex-1">
                  <CampaignRow item={c} onEdit={onEdit} onDelete={onDeleteClick} onPublish={onPublish} />
                </div>
                <div className="ml-2 hidden md:block">
                  <button
                    onClick={() => openParticipants(c)}
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100"
                  >
                    Participants
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center">
        <button
          disabled={!cursor || loading}
          onClick={() => load(false)}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {cursor ? (loading ? "Loading..." : "Load More") : "No more results"}
        </button>
      </div>

      <CampaignForm
        open={formOpen}
        mode={formMode}
        initial={editing}
        onCancel={() => setFormOpen(false)}
        onSubmit={onSubmit}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${pendingDelete?.title}"? This cannot be undone.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirmDelete}
      />

      <ParticipantDrawer open={drawerOpen} campaignId={drawerCampaignId} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
