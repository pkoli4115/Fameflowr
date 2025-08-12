// =============================
// FILE: src/types/campaign.ts
// =============================
export type CampaignStatus = "draft" | "scheduled" | "active" | "completed" | "archived";
export type CampaignVisibility = "public" | "private";
export type CampaignCategory = string; // alias; tighten to a union later if needed

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  category?: CampaignCategory;
  visibility: CampaignVisibility;
  status: CampaignStatus;
  coverImageUrl?: string;
  startAt?: string; // ISO string
  endAt?: string;   // ISO string
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdByUid: string;
}

export interface NewCampaignInput {
  title: string;
  description?: string;
  category?: CampaignCategory;
  visibility?: CampaignVisibility;
  status?: CampaignStatus;
  coverImageFile?: File | null;
  coverImageUrl?: string; // optional if already uploaded
  startAt?: string;
  endAt?: string;
}

export interface UpdateCampaignInput extends Partial<NewCampaignInput> {}

export interface CampaignListQuery {
  search?: string;
  status?: CampaignStatus | "all";
  visibility?: CampaignVisibility | "all";
  category?: CampaignCategory | "all";
  pageSize?: number;
  cursor?: any | null; // Firestore document snapshot for pagination
  orderBy?: "createdAt" | "startAt" | "title";
  orderDir?: "asc" | "desc";
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: any | null;
}

export interface CampaignCounts {
  total: number;
  draft: number;
  scheduled: number;
  active: number;
  completed: number;
  archived: number;
}

export interface Participant {
  id: string;          // doc id
  uid: string;         // user id
  displayName: string; // user display
  email?: string;
  joinedAt: string;    // ISO
  status?: "pending" | "approved" | "rejected";
}

// Ensure this file can be imported in isolated modules
export type { CampaignStatus as TCampaignStatus };
