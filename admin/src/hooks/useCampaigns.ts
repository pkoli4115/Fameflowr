import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Campaign,
  CampaignFilters,
  ListPage,
  createCampaign,
  deleteCampaign,
  listCampaignsPage,
  setPublished,
  updateCampaign,
} from "../firebase/campaignApi";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

type PagingState = {
  pages: ListPage[];
  loading: boolean;
  error?: string;
  pageSize: number;
};

export function useCampaigns(initialFilters: CampaignFilters = {}) {
  const [filters, setFilters] = useState<CampaignFilters>(initialFilters);
  const [{ pages, loading, error, pageSize }, setState] = useState<PagingState>({
    pages: [],
    loading: false,
    error: undefined,
    pageSize: 12,
  });

  // refs to avoid re-creating callbacks on every state change
  const filtersRef = useRef(filters);
  const pagesRef = useRef(pages);

  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { pagesRef.current = pages; }, [pages]);

  const items = useMemo(() => pages.flatMap((p) => p.items), [pages]);
  const hasMore = !!(pages.length && pages[pages.length - 1].nextCursor);

  // ---- Core loader: takes cursor as an ARG (no closure deps on pages/currentCursor)
  const loadPage = useCallback(async (reset: boolean, cursor?: QueryDocumentSnapshot<DocumentData> | null) => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const res = await listCampaignsPage(
        filtersRef.current,
        pageSize,
        reset ? null : cursor ?? (pagesRef.current.length ? pagesRef.current[pagesRef.current.length - 1].nextCursor : null)
      );
      setState((s) => ({
        ...s,
        loading: false,
        pages: reset ? [res] : [...s.pages, res],
      }));
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e?.message ?? "Failed to load campaigns" }));
    }
  }, [pageSize]);

  const resetAndReload = useCallback(() => {
    setState((s) => ({ ...s, pages: [] }));
    queueMicrotask(() => loadPage(true, null));
  }, [loadPage]);

  const loadMore = useCallback(() => {
    const cursor = pagesRef.current.length ? pagesRef.current[pagesRef.current.length - 1].nextCursor : null;
    if (!cursor) return;
    return loadPage(false, cursor);
  }, [loadPage]);

  // Initial load once
  useEffect(() => { loadPage(true, null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Debounce ONLY when filters change (stable resetAndReload)
  useEffect(() => {
    const t = setTimeout(() => { resetAndReload(); }, 250);
    return () => clearTimeout(t);
  }, [filters, resetAndReload]);

  // CRUD actions – all finish with a stable reset
  const onCreate = useCallback(async (data: any) => { await createCampaign(data); resetAndReload(); }, [resetAndReload]);
  const onUpdate = useCallback(async (id: string, data: any) => { await updateCampaign(id, data); resetAndReload(); }, [resetAndReload]);
  const onDelete = useCallback(async (id: string) => { await deleteCampaign(id); resetAndReload(); }, [resetAndReload]);
  const onTogglePublish = useCallback(async (id: string, next: boolean) => { await setPublished(id, next); resetAndReload(); }, [resetAndReload]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    setFilters,
    filters,
    onCreate,
    onUpdate,
    onDelete,
    onTogglePublish,
  };
}
