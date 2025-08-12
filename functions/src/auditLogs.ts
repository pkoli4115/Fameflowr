import * as admin from "firebase-admin";
import type { Change, EventContext } from "firebase-functions";
import type { DocumentSnapshot } from "firebase-admin/firestore";

const AUDIT_COLLECTION = "auditLogs";
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * Core audit handler for /campaigns/{id|campaignId} writes.
 * Exports as both `auditCampaigns` and `onCampaignWriteAudit` for import compatibility.
 */
export async function auditCampaigns(
  change: Change<DocumentSnapshot>,
  context: EventContext
): Promise<void> {
  const db = admin.firestore();

  const before = change.before.exists ? change.before.data() : null;
  const after  = change.after.exists ? change.after.data() : null;
  const action = !before && after ? "create" : before && !after ? "delete" : "update";

  // Support either param name used in triggers
  const campaignId =
    (context.params as any).campaignId ??
    (context.params as any).id ??
    null;

  await db.collection(AUDIT_COLLECTION).add({
    ts: nowTs(),
    action,
    targetType: "campaign",
    campaignId,
    before,
    after,
    source: "function/auditCampaigns",
  });
}

// Backward-compatible alias (so either import name works)
export const onCampaignWriteAudit = auditCampaigns;
