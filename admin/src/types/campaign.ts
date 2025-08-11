export type CampaignStatus = "Scheduled" | "Active" | "Ended";
export type CampaignCategory = "Outreach" | "Contest" | "Seasonal" | "Launch" | "Community" | "Other";
export type CampaignVisibility = "public" | "private";

export interface CampaignResource {
  title: string;
  link: string;
}

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;

  startAt: string;   // ISO
  endAt: string;     // ISO
  status: CampaignStatus;

  // Engagement
  participantsCount: number;
  clicks?: number;
  likes?: number;
  shares?: number;

  // New metadata
  category?: CampaignCategory;
  goal?: string;
  actionsRequired?: string[];
  resources?: CampaignResource[];
  visibility?: CampaignVisibility;

  isDeleted: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface NewCampaignInput {
  title: string;
  description?: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  imageFile?: File | null;

  category?: CampaignCategory;
  goal?: string;
  actionsRequired?: string[];
  resources?: CampaignResource[];
  visibility?: CampaignVisibility;
}

export interface UpdateCampaignInput extends Partial<NewCampaignInput> {
  imageUrl?: string | null; // allow clearing
}

export interface Participant {
  id: string;
  uid: string;
  displayName?: string;
  email?: string;
  joinedAt: string; // ISO
}
