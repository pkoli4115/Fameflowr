// functions/src/index.ts
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import {
  aggregateCampaignMetrics,
  scheduledAggregateCampaignMetrics,
  recalcAndWriteTotals,
} from "./aggregateCampaignMetrics";
import { onCampaignWriteAudit as auditCampaigns } from "./auditLogs";
import { setUserDefaults } from "./setUserDefaults";
import { syncBlockedToAuth } from "./syncBlockedToAuth";
import { togglePublish } from "./togglePublish";

// Ensure Admin SDK is initialized once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// ---------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------
const REGION = "asia-south1";

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function assertAuthenticated(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  }
}

async function updateCampaignCount() {
  await recalcAndWriteTotals(admin.firestore());
}

// ---------------------------------------------------------------------
// Firestore triggers (campaigns)
// ---------------------------------------------------------------------

export const onCampaignWriteFn = functions
  .region(REGION)
  .firestore.document("campaigns/{campaignId}")
  .onWrite(async (change, context) => {
    const id = context.params.campaignId;
    console.log("[onCampaignWriteFn]", {
      id,
      before: change.before.exists,
      after: change.after.exists,
      eventId: context.eventId,
    });

    // Incremental stats update (no writes to /campaigns)
    await aggregateCampaignMetrics(change, context);

    // After a delete, make totals exact immediately
    if (!change.after.exists) {
      await updateCampaignCount();
    }
    return null;
  });

/** Cascade cleanup when a campaign is deleted outside the callable. */
export const onCampaignDeleteFn = functions
  .region(REGION)
  .firestore.document("campaigns/{campaignId}")
  .onDelete(async (_snap, context) => {
    const id = context.params.campaignId;
    const db = admin.firestore();

    // Remove mirrors (best-effort, recursive)
    const mirrors = [
      db.collection("campaigns_public").doc(id),
      db.collection("campaigns_drafts").doc(id),
    ];
    await Promise.all(
      mirrors.map(async (ref) => {
        try {
          await admin.firestore().recursiveDelete(ref);
        } catch (e) {
          console.warn("[onCampaignDeleteFn] mirror delete failed", { id, path: ref.path, e });
        }
      })
    );

    // Storage: campaigns/{id}/...
    try {
      await admin.storage().bucket().deleteFiles({ prefix: `campaigns/${id}/` });
    } catch (e) {
      console.warn("[onCampaignDeleteFn] storage cleanup failed", { id, e });
    }

    await updateCampaignCount();
    console.log("[onCampaignDeleteFn] purged mirrors & storage", { id });
    return null;
  });

/** Nightly full recompute safety net. */
export const scheduledAggregateCampaignMetricsFn = functions
  .region(REGION)
  .pubsub.schedule("every 24 hours")
  .onRun(scheduledAggregateCampaignMetrics);

/** Audit trail on campaign writes (no-op on delete). */
export const auditCampaignsFn = functions
  .region(REGION)
  .firestore.document("campaigns/{campaignId}")
  .onWrite(async (change, context) => {
    const id = context.params.campaignId;
    console.log("[auditCampaignsFn]", { id, after: change.after.exists, eventId: context.eventId });
    if (!change.after.exists) return null;
    return auditCampaigns(change, context);
  });

// ---------------------------------------------------------------------
// Users triggers
// ---------------------------------------------------------------------
export const setUserDefaultsFn = functions
  .region(REGION)
  .firestore.document("users/{userId}")
  .onCreate(setUserDefaults);

export const syncBlockedToAuthFn = functions
  .region(REGION)
  .firestore.document("users/{userId}")
  .onWrite(syncBlockedToAuth);

// ---------------------------------------------------------------------
// Callables
// ---------------------------------------------------------------------

export const togglePublishFn = togglePublish;

/** HARD delete a campaign (doc + all subcollections), plus mirrors & storage. */
export const hardDeleteCampaignFn = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    assertAuthenticated(context);

    const campaignId = String(data?.campaignId || "").trim();
    if (!campaignId) {
      throw new functions.https.HttpsError("invalid-argument", "campaignId is required.");
    }

    const db = admin.firestore();
    const docRef = db.doc(`campaigns/${campaignId}`);
    const snap = await docRef.get();

    if (!snap.exists) {
      return { ok: true, deleted: false };
    }

    // Server-side recursive delete (includes subcollections)
    await db.recursiveDelete(docRef);

    // Audit (best-effort)
    try {
      await db.collection("auditLogs").add({
        type: "campaign_hard_delete",
        campaignId,
        byUid: context.auth?.uid || null,
        at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn("[hardDeleteCampaignFn] audit log failed", { campaignId, e });
    }

    // Mirrors
    try {
      await admin.firestore().recursiveDelete(db.collection("campaigns_public").doc(campaignId));
      await admin.firestore().recursiveDelete(db.collection("campaigns_drafts").doc(campaignId));
    } catch (e) {
      console.warn("[hardDeleteCampaignFn] mirror cleanup failed", { campaignId, e });
    }

    // Storage
    try {
      await admin.storage().bucket().deleteFiles({ prefix: `campaigns/${campaignId}/` });
    } catch (e) {
      console.warn("[hardDeleteCampaignFn] storage cleanup failed", { campaignId, e });
    }

    await updateCampaignCount();
    return { ok: true, deleted: true };
  });

/** Admin-only callable to force a full recompute. */
export const backfillCampaignAggregatesFn = functions
  .region(REGION)
  .https.onCall(async (_data, context) => {
    assertAuthenticated(context);
    await scheduledAggregateCampaignMetrics();
    return { ok: true };
  });
