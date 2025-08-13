"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillCampaignAggregatesFn = exports.hardDeleteCampaignFn = exports.togglePublishFn = exports.syncBlockedToAuthFn = exports.setUserDefaultsFn = exports.auditCampaignsFn = exports.scheduledAggregateCampaignMetricsFn = exports.onCampaignDeleteFn = exports.onCampaignWriteFn = void 0;
// functions/src/index.ts
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const aggregateCampaignMetrics_1 = require("./aggregateCampaignMetrics");
const auditLogs_1 = require("./auditLogs");
const setUserDefaults_1 = require("./setUserDefaults");
const syncBlockedToAuth_1 = require("./syncBlockedToAuth");
const togglePublish_1 = require("./togglePublish");
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
function assertAuthenticated(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
}
async function updateCampaignCount() {
    await (0, aggregateCampaignMetrics_1.recalcAndWriteTotals)(admin.firestore());
}
// ---------------------------------------------------------------------
// Firestore triggers (campaigns)
// ---------------------------------------------------------------------
exports.onCampaignWriteFn = functions
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
    await (0, aggregateCampaignMetrics_1.aggregateCampaignMetrics)(change, context);
    // After a delete, make totals exact immediately
    if (!change.after.exists) {
        await updateCampaignCount();
    }
    return null;
});
/** Cascade cleanup when a campaign is deleted outside the callable. */
exports.onCampaignDeleteFn = functions
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
    await Promise.all(mirrors.map(async (ref) => {
        try {
            await admin.firestore().recursiveDelete(ref);
        }
        catch (e) {
            console.warn("[onCampaignDeleteFn] mirror delete failed", { id, path: ref.path, e });
        }
    }));
    // Storage: campaigns/{id}/...
    try {
        await admin.storage().bucket().deleteFiles({ prefix: `campaigns/${id}/` });
    }
    catch (e) {
        console.warn("[onCampaignDeleteFn] storage cleanup failed", { id, e });
    }
    await updateCampaignCount();
    console.log("[onCampaignDeleteFn] purged mirrors & storage", { id });
    return null;
});
/** Nightly full recompute safety net. */
exports.scheduledAggregateCampaignMetricsFn = functions
    .region(REGION)
    .pubsub.schedule("every 24 hours")
    .onRun(aggregateCampaignMetrics_1.scheduledAggregateCampaignMetrics);
/** Audit trail on campaign writes (no-op on delete). */
exports.auditCampaignsFn = functions
    .region(REGION)
    .firestore.document("campaigns/{campaignId}")
    .onWrite(async (change, context) => {
    const id = context.params.campaignId;
    console.log("[auditCampaignsFn]", { id, after: change.after.exists, eventId: context.eventId });
    if (!change.after.exists)
        return null;
    return (0, auditLogs_1.onCampaignWriteAudit)(change, context);
});
// ---------------------------------------------------------------------
// Users triggers
// ---------------------------------------------------------------------
exports.setUserDefaultsFn = functions
    .region(REGION)
    .firestore.document("users/{userId}")
    .onCreate(setUserDefaults_1.setUserDefaults);
exports.syncBlockedToAuthFn = functions
    .region(REGION)
    .firestore.document("users/{userId}")
    .onWrite(syncBlockedToAuth_1.syncBlockedToAuth);
// ---------------------------------------------------------------------
// Callables
// ---------------------------------------------------------------------
exports.togglePublishFn = togglePublish_1.togglePublish;
/** HARD delete a campaign (doc + all subcollections), plus mirrors & storage. */
exports.hardDeleteCampaignFn = functions
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
    }
    catch (e) {
        console.warn("[hardDeleteCampaignFn] audit log failed", { campaignId, e });
    }
    // Mirrors
    try {
        await admin.firestore().recursiveDelete(db.collection("campaigns_public").doc(campaignId));
        await admin.firestore().recursiveDelete(db.collection("campaigns_drafts").doc(campaignId));
    }
    catch (e) {
        console.warn("[hardDeleteCampaignFn] mirror cleanup failed", { campaignId, e });
    }
    // Storage
    try {
        await admin.storage().bucket().deleteFiles({ prefix: `campaigns/${campaignId}/` });
    }
    catch (e) {
        console.warn("[hardDeleteCampaignFn] storage cleanup failed", { campaignId, e });
    }
    await updateCampaignCount();
    return { ok: true, deleted: true };
});
/** Admin-only callable to force a full recompute. */
exports.backfillCampaignAggregatesFn = functions
    .region(REGION)
    .https.onCall(async (_data, context) => {
    assertAuthenticated(context);
    await (0, aggregateCampaignMetrics_1.scheduledAggregateCampaignMetrics)();
    return { ok: true };
});
