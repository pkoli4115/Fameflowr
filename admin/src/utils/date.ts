import { CampaignStatus } from "../types/campaign";

export const isoNow = () => new Date().toISOString();

export const toIso = (d: Date | string | number) =>
  typeof d === "string" ? new Date(d).toISOString() : new Date(d).toISOString();

export const computeStatus = (startAtIso: string, endAtIso: string): CampaignStatus => {
  const now = new Date();
  const start = new Date(startAtIso);
  const end = new Date(endAtIso);
  if (now < start) return "Scheduled";
  if (now > end) return "Ended";
  return "Active";
};
