import { NewCampaignInput, CampaignResource } from "../types/campaign";

export type ValidationErrors =
  Partial<Record<keyof NewCampaignInput, string>> & { dateRange?: string };

const isValidUrl = (s: string) => {
  try { new URL(s); return true; } catch { return false; }
};

const validateResources = (resources?: CampaignResource[]) => {
  if (!resources) return undefined;
  if (resources.length > 6) return "You can add up to 6 resources.";
  for (const r of resources) {
    if (!r.title?.trim()) return "Resource title is required.";
    if (!r.link?.trim() || !isValidUrl(r.link)) return "Resource links must be valid URLs.";
  }
  return undefined;
};

export const validateCampaign = (data: NewCampaignInput): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.title || data.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters.";
  }
  if (!data.startAt) errors.startAt = "Start date/time is required.";
  if (!data.endAt) errors.endAt = "End date/time is required.";
  if (data.startAt && data.endAt) {
    const s = new Date(data.startAt).getTime();
    const e = new Date(data.endAt).getTime();
    if (Number.isNaN(s) || Number.isNaN(e)) errors.dateRange = "Invalid dates.";
    else if (e <= s) errors.dateRange = "End must be after start.";
  }

  if (data.imageFile && data.imageFile.size > 15 * 1024 * 1024) {
    errors.imageFile = "Image must be under 15MB.";
  }

  if (data.actionsRequired && data.actionsRequired.length > 8) {
    errors.actionsRequired = "You can add up to 8 actions.";
  }

  const resErr = validateResources(data.resources);
  if (resErr) errors.resources = resErr;

  return errors;
};

export const isValid = (errs: ValidationErrors) => Object.keys(errs).length === 0;
