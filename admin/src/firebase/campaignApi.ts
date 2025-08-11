// src/firebase/campaignApi.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  DocumentData,
  QueryDocumentSnapshot,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/** ===== Types ===== */
export type CampaignVisibility = "public" | "private";
export type CampaignStatus = "draft" | "scheduled" | "active" | "ended";
export type CampaignCategory =
  | "Brand"
  | "UGC"
  | "Contest"
  | "Influencer"
  | "Awareness"
  | "Other";

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  category: CampaignCategory;
  visibility: CampaignVisibility;
  startDate: string; // ISO
  endDate: string; // ISO
  budget?: number;
  isPublished: boolean;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  participantsCount?: number;
  clicks?: number;
  likes?: number;
  reach?: number;
}

export type NewCampaignInput = Omit<
  Campaign,
  "id" | "createdAt" | "updatedAt" | "participantsCount"
>;
export type UpdateCampaignInput = Partial<
  Omit<Campaign, "id" | "createdAt" | "updatedAt">
>;

export interface Participant {
  id: string;
  uid: string;
  displayName?: string;
  joinedAt?: string; // ISO
}

/** ===== Helpers ===== */
const COLL = "campaigns";
const toIso = (d: Date | number) => new Date(d).toISOString();

/** Accept Timestamp | string | undefined and return ISO string or "" */
const toIsoFromAny = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (v?.toDate) return toIso(v.toDate());
  return "";
};

const fromDoc = (snap: QueryDocumentSnapshot<DocumentData>): Campaign => {
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title ?? "",
    description: data.description ?? "",
    coverUrl: data.coverUrl ?? "",
    category: (data.category ?? "Other") as CampaignCategory,
    visibility: (data.visibility ?? "public") as CampaignVisibility,
    // accept Timestamp | string | undefined; also tolerate legacy start/end field names
    startDate: toIsoFromAny(data.startDate ?? data.start ?? null),
    endDate: toIsoFromAny(data.endDate ?? data.end ?? null),
    budget: typeof data.budget === "number" ? data.budget : undefined,
    isPublished: !!data.isPublished,
    createdAt: toIsoFromAny(data.createdAt),
    updatedAt: toIsoFromAny(data.updatedAt),
    participantsCount: data.participantsCount ?? 0,
    clicks: data.clicks ?? 0,
    likes: data.likes ?? 0,
    reach: data.reach ?? 0,
  };
};

/** ===== Filters & paging ===== */
export type CampaignFilters = {
  search?: string;
  status?: CampaignStatus | "all";
  category?: CampaignCategory | "all";
  visibility?: CampaignVisibility | "all";
};

export type ListPage = {
  items: Campaign[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
};

/** Compute status safely (handles missing/invalid dates) */
export const computeStatus = (c: Campaign): CampaignStatus => {
  const startMs = Date.parse(c.startDate || "");
  const endMs = Date.parse(c.endDate || "");
  if (!c.isPublished) return "draft";
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "draft";
  const now = Date.now();
  if (now < startMs) return "scheduled";
  if (now > endMs) return "ended";
  return "active";
};

/** ===== CRUD & Queries ===== */

export async function createCampaign(
  input: NewCampaignInput
): Promise<string> {
  const ref = await addDoc(collection(db, COLL), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCampaign(
  id: string,
  input: UpdateCampaignInput
): Promise<void> {
  await updateDoc(doc(db, COLL, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, COLL, id));
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const s = await getDoc(doc(db, COLL, id));
  if (!s.exists()) return null;
  // @ts-expect-error reuse mapping for convenience
  return fromDoc({ id: s.id, ...s } as QueryDocumentSnapshot<DocumentData>);
}

/** Page list (server filters + cursor); search & status filtered client side */
export async function listCampaignsPage(
  filters: CampaignFilters,
  pageSize = 12,
  cursor?: QueryDocumentSnapshot<DocumentData> | null
): Promise<ListPage> {
  const constraints: any[] = [orderBy("createdAt", "desc"), fbLimit(pageSize)];
  if (filters.category && filters.category !== "all") {
    constraints.push(where("category", "==", filters.category));
  }
  if (filters.visibility && filters.visibility !== "all") {
    constraints.push(where("visibility", "==", filters.visibility));
  }
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, COLL), ...constraints);
  const snaps = await getDocs(q);
  let items = snaps.docs.map(fromDoc);

  if (filters.status && filters.status !== "all") {
    items = items.filter((c) => computeStatus(c) === filters.status);
  }

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim().toLowerCase();
    items = items.filter(
      (c) =>
        c.title.toLowerCase().includes(s) ||
        (c.description ?? "").toLowerCase().includes(s)
    );
  }

  const nextCursor =
    snaps.docs.length === pageSize ? snaps.docs[snaps.docs.length - 1] : null;

  return { items, nextCursor };
}

/** Publish / Unpublish */
export async function setPublished(
  id: string,
  publish: boolean
): Promise<void> {
  await updateDoc(doc(db, COLL, id), {
    isPublished: publish,
    updatedAt: serverTimestamp(),
  });
}

/** Participants (subcollection: campaigns/{id}/participants) */
export async function listParticipants(
  campaignId: string
): Promise<Participant[]> {
  const ref = collection(db, COLL, campaignId, "participants");
  const snaps = await getDocs(ref);
  return snaps.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: data.uid,
      displayName: data.displayName,
      joinedAt: toIsoFromAny(data.joinedAt),
    } as Participant;
  });
}

/** ===== Aggregated counts (avoid inequality-on-different-fields) ===== */
export type CampaignServerCounts = {
  total: number;
  draft: number;
  scheduled: number;
  active: number;
  ended: number;
};

/**
 * Firestore restriction: a single query can only have inequalities on ONE field.
 * To compute scheduled/active/ended, we fetch published docs and apply the date
 * logic in JS so we don't combine inequalities on startDate and endDate.
 */
export async function getCampaignServerCounts(): Promise<CampaignServerCounts> {
  const coll = collection(db, COLL);

  const safeCount = async (q: any) => {
    try {
      const snap = await getCountFromServer(q);
      return snap.data().count;
    } catch {
      return 0; // if index missing or rules block, avoid crashing UI
    }
  };

  // total (all docs)
  const total = await safeCount(coll as any);

  // drafts (published=false)
  const draft = await safeCount(query(coll, where("isPublished", "==", false)));

  // For scheduled/active/ended — get published docs and filter in JS
  let publishedDocs: Campaign[] = [];
  try {
    const s = await getDocs(query(coll, where("isPublished", "==", true)));
    publishedDocs = s.docs.map(fromDoc);
  } catch {
    publishedDocs = [];
  }

  const now = Date.now();
  const parse = (iso: string) => Date.parse(iso || "");

  const scheduled = publishedDocs.filter((c) => parse(c.startDate) > now).length;
  const active = publishedDocs.filter(
    (c) => parse(c.startDate) <= now && parse(c.endDate) >= now
  ).length;
  const ended = publishedDocs.filter((c) => parse(c.endDate) < now).length;

  return { total, draft, scheduled, active, ended };
}
