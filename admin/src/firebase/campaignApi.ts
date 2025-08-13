import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  limit as qLimit,
  orderBy as qOrderBy,
  query as q,
  startAfter as qStartAfter,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getCountFromServer } from "firebase/firestore";
import { db, app } from "../firebase/firebaseConfig";
import { uploadWithProgress } from "../utils/upload";
import { computeStatus, isoNow } from "../utils/date";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref as sref, deleteObject } from "firebase/storage";

// —— Types
import type {
  Campaign,
  CampaignCounts,
  CampaignListQuery,
  NewCampaignInput,
  PagedResult,
  Participant,
  UpdateCampaignInput,
  CampaignVisibility,
  CampaignStatus,
  CampaignCategory,
} from "../types/campaign";

// —— Re-exports
export type {
  Campaign,
  CampaignCounts,
  CampaignListQuery,
  NewCampaignInput,
  PagedResult,
  Participant,
  UpdateCampaignInput,
  CampaignVisibility,
  CampaignStatus,
  CampaignCategory,
} from "../types/campaign";
export { computeStatus } from "../utils/date";

const COLL = "campaigns";

// ---------- helpers ----------
function normalizeToIso(v: any): string | undefined {
  if (!v && v !== 0) return undefined;
  if (v && typeof v === "object" && typeof v.toDate === "function") {
    const d = v.toDate();
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v.toISOString();
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

function mapDoc(d: any): Campaign {
  const data = d.data();
  const startIso = normalizeToIso(data.startAt);
  const endIso = normalizeToIso(data.endAt);
  const createdIso = normalizeToIso(data.createdAt) ?? isoNow();
  const updatedIso = normalizeToIso(data.updatedAt) ?? isoNow();

  return {
    id: d.id,
    title: data.title,
    description: data.description,
    category: data.category,
    visibility: (data.visibility ?? "public") as CampaignVisibility,
    status: (data.status ?? computeStatus(startIso, endIso)) as CampaignStatus,
    coverImageUrl: data.coverImageUrl,
    startAt: startIso,
    endAt: endIso,
    createdAt: createdIso,
    updatedAt: updatedIso,
    createdByUid: data.createdByUid ?? "",
  } as Campaign;
}

// -------------------------------------
// Core API
// -------------------------------------
export async function fetchCampaigns(params: CampaignListQuery): Promise<PagedResult<Campaign>> {
  const {
    search = "",
    status = "all",
    visibility = "all",
    category = "all",
    pageSize = 20,
    cursor = null,
    orderBy = "createdAt",  // caller can pass "createdAtTs"; we auto-fallback below
    orderDir = "desc",
  } = params;

  const colRef = collection(db, COLL);
  const clauses: any[] = [];

  if (status !== "all") clauses.push(where("status", "==", status));
  if (visibility !== "all") clauses.push(where("visibility", "==", visibility));
  if (category !== "all") clauses.push(where("category", "==", category));

  // Try the requested order field first, then fall back to common fields
  const orderCandidates = Array.from(
    new Set([orderBy, "lastUpdated", "updatedAt", "createdAtTs", "createdAt", "__name__"])
  );

  let snap: any = null;
  for (const field of orderCandidates) {
    try {
      let qref = q(colRef, ...clauses, qOrderBy(field as any, orderDir as any), qLimit(pageSize));
      if (cursor) qref = q(colRef, ...clauses, qOrderBy(field as any, orderDir as any), qStartAfter(cursor), qLimit(pageSize));

      snap = await getDocs(qref);

      // If we got some docs, or we tried an explicit fallback field, accept it
      if (snap.docs.length > 0 || field !== orderBy) break;

      // If first attempt returned 0 and there are no filters, try next fallback
      if (!cursor && clauses.length === 0) continue;
      break;
    } catch {
      // Index errors / bad field types: try next candidate
      continue;
    }
  }

  if (!snap) {
    // Extreme fallback: read collection and slice locally (safe for small sets)
    const all = await getDocs(colRef);
    const items = all.docs.slice(0, pageSize).map(mapDoc);
    return { items, nextCursor: null };
  }

  let items = snap.docs.map(mapDoc);

  if (search.trim()) {
    const s = search.trim().toLowerCase();
    items = items.filter(
      (c) => c.title?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s)
    );
  }

  const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  return { items, nextCursor };
}

export async function fetchCampaignById(id: string): Promise<Campaign | null> {
  const ref = doc(db, COLL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapDoc(snap);
}

export async function getCounts(): Promise<CampaignCounts> {
  const colRef = collection(db, COLL);
  const total = (await getCountFromServer(q(colRef))).data().count;
  const statuses: CampaignStatus[] = ["draft", "scheduled", "active", "completed", "archived"];

  const results = await Promise.all(
    statuses.map(async (st) => (await getCountFromServer(q(colRef, where("status", "==", st)))).data().count)
  );

  return {
    total,
    draft: results[0] || 0,
    scheduled: results[1] || 0,
    active: results[2] || 0,
    completed: results[3] || 0,
    archived: results[4] || 0,
  };
}

export async function getCountsSafe(): Promise<CampaignCounts> {
  const snap = await getDocs(collection(db, COLL));
  let total = 0,
    draft = 0,
    scheduled = 0,
    active = 0,
    completed = 0,
    archived = 0;

  snap.forEach((docSnap) => {
    total += 1;
    const st = (docSnap.data()?.status ?? "draft") as CampaignStatus;
    if (st === "draft") draft += 1;
    else if (st === "scheduled") scheduled += 1;
    else if (st === "active") active += 1;
    else if (st === "completed") completed += 1;
    else if (st === "archived") archived += 1;
  });

  return { total, draft, scheduled, active, completed, archived };
}

export async function createCampaign(
  input: NewCampaignInput,
  currentUid?: string,
  onUploadProgress?: (p: number) => void
): Promise<string> {
  const uid = currentUid ?? "admin";
  const colRef = collection(db, COLL);
  let coverImageUrl = input.coverImageUrl;
  let coverImagePath = (input as any).coverImagePath as string | undefined;

  if (!coverImageUrl && input.coverImageFile) {
    const path = `${COLL}/${Date.now()}_${input.coverImageFile.name}`;
    coverImageUrl = await uploadWithProgress(path, input.coverImageFile, onUploadProgress);
    coverImagePath = path;
  }

  const nowIso = isoNow();
  const computed = computeStatus(input.startAt, input.endAt);
  const docRef = await addDoc(colRef, {
    title: input.title,
    description: input.description ?? "",
    category: input.category ?? "general",
    visibility: input.visibility ?? "public",
    status: input.status ?? computed,
    coverImageUrl: coverImageUrl ?? "",
    coverImagePath: coverImagePath ?? "",
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdByUid: uid,
    createdAtTs: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCampaign(
  id: string,
  input: UpdateCampaignInput,
  onUploadProgress?: (p: number) => void
): Promise<void> {
  const ref = doc(db, COLL, id);
  const data: any = { updatedAt: isoNow() };

  if (typeof input.title === "string") data.title = input.title;
  if (typeof input.description === "string") data.description = input.description;
  if (typeof input.category === "string") data.category = input.category;
  if (typeof input.visibility === "string") data.visibility = input.visibility;
  if (typeof input.status === "string") data.status = input.status;
  if (typeof input.startAt !== "undefined") data.startAt = input.startAt ?? null;
  if (typeof input.endAt !== "undefined") data.endAt = input.endAt ?? null;

  if (!input.coverImageUrl && input.coverImageFile) {
    const path = `${COLL}/${Date.now()}_${input.coverImageFile.name}`;
    data.coverImageUrl = await uploadWithProgress(path, input.coverImageFile, onUploadProgress);
    data.coverImagePath = path;
  } else if (typeof input.coverImageUrl === "string") {
    data.coverImageUrl = input.coverImageUrl;
  }

  if (!input.status && ("startAt" in data || "endAt" in data)) {
    data.status = computeStatus(normalizeToIso(data.startAt), normalizeToIso(data.endAt));
  }

  await updateDoc(ref, data);
}

// ---- Deep delete helpers ----
async function deleteSubcollection(collPath: string) {
  const snap = await getDocs(collection(db, collPath));
  if (snap.empty) return;
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Deletes a campaign completely:
 * 1) Tries callable Admin recursive delete (hard delete)
 * 2) Falls back to client deep delete (known subcollections + doc)
 */
export async function deleteCampaign(id: string): Promise<void> {
  const USE_FN =
    (import.meta as any)?.env?.VITE_USE_FN_RECURSIVE_DELETE === "true";
  const REGION =
    (import.meta as any)?.env?.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";

  if (USE_FN) {
    try {
      const fns = getFunctions(app, REGION);
      const hardDelete = httpsCallable(fns, "hardDeleteCampaignFn");
      await hardDelete({ campaignId: id });
      return;
    } catch {
      // fall through to client deep delete
    }
  }

  const docRef = doc(db, COLL, id);

  // Best-effort storage cleanup if we saved a path
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data: any = snap.data();
      const coverImagePath: string | undefined = data?.coverImagePath;
      if (coverImagePath) {
        try {
          await deleteObject(sref(getStorage(app), coverImagePath));
        } catch {}
      }
    }
  } catch {}

  // Delete known subcollections
  try {
    await deleteSubcollection(`${COLL}/${id}/participants`);
  } catch {}

  // Finally delete the campaign document
  await deleteDoc(docRef);
}

// Participants
export async function listParticipants(campaignId: string): Promise<Participant[]> {
  const colRef = collection(db, `${COLL}/${campaignId}/participants`);
  const snap = await getDocs(colRef);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      uid: data.uid,
      displayName: data.displayName || "",
      email: data.email || "",
      joinedAt: normalizeToIso(data.joinedAt) ?? "",
      status: (data.status || "pending") as Participant["status"],
    };
  });
}

// Aggregated metrics (/stats/campaigns)
export async function getAggregatedMetrics(): Promise<{
  total?: number; reach?: number; clicks?: number; likes?: number;
}> {
  const ref = doc(db, "stats", "campaigns");

  // Force a fresh read to avoid stale cache after deletes/updates
  let snap;
  try {
    snap = await getDocFromServer(ref);
  } catch {
    snap = await getDoc(ref);
  }

  if (!snap.exists()) return {};
  const d: any = snap.data();
  return {
    total: Number((d.totalCount ?? d.total) || 0),
    reach: Number(d.reach || 0),
    clicks: Number(d.clicks || 0),
    likes: Number(d.likes || 0),
  };
}

// -------------------------------------
// Publish / Unpublish with safe callable fallback
// -------------------------------------
export async function setPublished(id: string, publish: boolean): Promise<void> {
  const USE_FN =
    (import.meta as any)?.env?.VITE_USE_FN_TOGGLE_PUBLISH === "true";
  const REGION =
    (import.meta as any)?.env?.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";

  if (USE_FN) {
    try {
      const fns = getFunctions(app, REGION);
      const toggle = httpsCallable(fns, "togglePublish");
      await toggle({ campaignId: id, publish });
      return;
    } catch {}
  }

  const ref = doc(db, COLL, id);
  const updates: any = {
    status: publish ? "active" : "draft",
    updatedAt: serverTimestamp(),
  };

  if (publish) {
    const snap = await getDoc(ref);
    const hasStart = snap.exists() && !!(snap.data() as any)?.startAt;
    if (!hasStart) updates.startAt = serverTimestamp();
  }

  await updateDoc(ref, updates);
}

export async function publishCampaign(id: string): Promise<void> {
  return setPublished(id, true);
}
export async function unpublishCampaign(id: string): Promise<void> {
  return setPublished(id, false);
}
