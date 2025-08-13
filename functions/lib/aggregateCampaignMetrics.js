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
exports.recalcAndWriteTotals = recalcAndWriteTotals;
exports.aggregateCampaignMetrics = aggregateCampaignMetrics;
exports.scheduledAggregateCampaignMetrics = scheduledAggregateCampaignMetrics;
// functions/src/aggregateCampaignMetrics.ts
const admin = __importStar(require("firebase-admin"));
const STATS_PATH = "stats/campaigns";
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();
const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
/**
 * Recalculate total from source of truth, writing BOTH `total` and `totalCount`
 * so the UI can read either key safely. Lazy-get Firestore to avoid init order issues.
 */
async function recalcAndWriteTotals(dbArg) {
    const db = dbArg ?? admin.firestore();
    let total = 0;
    try {
        // Prefer aggregate count()
        const anyDb = db;
        const agg = await anyDb.collection("campaigns").count().get();
        total = agg.data().count ?? 0;
    }
    catch {
        // Fallback scan
        const snap = await db.collection("campaigns").get();
        total = snap.size;
    }
    await db.doc(STATS_PATH).set({ total, totalCount: total, updatedAt: nowTs() }, { merge: true });
}
/**
 * Incremental aggregator on create/update/delete of /campaigns/{id}.
 * IMPORTANT: does NOT write back to /campaigns to avoid trigger loops.
 */
async function aggregateCampaignMetrics(change, _context) {
    const db = admin.firestore();
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    let totalDelta = 0;
    if (!before && after)
        totalDelta = 1; // created
    if (before && !after)
        totalDelta = -1; // deleted
    const reachDelta = num(after?.reach) - num(before?.reach);
    const clicksDelta = num(after?.clicks) - num(before?.clicks);
    const likesDelta = num(after?.likes) - num(before?.likes);
    const inc = admin.firestore.FieldValue.increment;
    await db.doc(STATS_PATH).set({
        ...(totalDelta !== 0 ? { total: inc(totalDelta), totalCount: inc(totalDelta) } : {}),
        ...(reachDelta !== 0 ? { reach: inc(reachDelta) } : {}),
        ...(clicksDelta !== 0 ? { clicks: inc(clicksDelta) } : {}),
        ...(likesDelta !== 0 ? { likes: inc(likesDelta) } : {}),
        updatedAt: nowTs(),
    }, { merge: true });
}
/**
 * Periodic full recompute (safety net). Wire from index.ts as a scheduled job.
 */
async function scheduledAggregateCampaignMetrics() {
    const db = admin.firestore();
    const snap = await db.collection("campaigns").select("reach", "clicks", "likes").get();
    let total = 0, reach = 0, clicks = 0, likes = 0;
    snap.forEach(d => {
        const doc = d.data();
        total += 1;
        reach += num(doc.reach);
        clicks += num(doc.clicks);
        likes += num(doc.likes);
    });
    await db.doc(STATS_PATH).set({ total, totalCount: total, reach, clicks, likes, updatedAt: nowTs() }, { merge: true });
}
