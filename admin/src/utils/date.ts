// FILE: src/utils/date.ts
import type { TCampaignStatus } from "../types/campaign";

export const isoNow = () => new Date().toISOString();

export const toIso = (d: Date | string | number | null | undefined) =>
  d ? new Date(d as any).toISOString() : undefined;

export const computeStatus = (
  startAt?: string,
  endAt?: string
): TCampaignStatus => {
  const now = Date.now();
  const s = startAt ? Date.parse(startAt) : undefined;
  const e = endAt ? Date.parse(endAt) : undefined;

  if (!s && !e) return "draft";
  if (s && now < s) return "scheduled";
  if (e && now > e) return "completed";
  return "active";
};
