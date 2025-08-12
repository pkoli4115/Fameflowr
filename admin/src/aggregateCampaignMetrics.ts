// FILE: functions/src/aggregateCampaignMetrics.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const STATS_PATH = "stats/campaigns";

// Safely coerce to number
const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : 0);
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * Full recompute from /campaigns collection.
 * Sums: reach, clicks, likes; counts total docs.
 */
export async function recomputeCampaignAggregates(): Promise<void> {
  const snap = await db.collection("campaigns").select("reach", "clicks", "likes").get();

  let total = 0;
  let reach = 0;
  let clicks = 0;
  let likes = 0;

  snap.forEach((doc) => {
    const d = doc.data() as any;
    total += 1;
    reach += num(d.reach);
    clicks += num(d.clicks);
    likes += num(d.likes);
  });

  await db.doc(STATS_PATH).set(
    { total, reach, clicks, likes, updatedAt: nowTs() },
    { merge: true }
  );
}

/**
 * Incremental aggregator on create/update/delete of /campaigns/{id}.
 * Applies deltas to /stats/campaigns to keep it current.
 */
export const onCampaignWrite = functions.firestore
  .document("campaigns/{id}")
  .onWrite(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>, _context: functions.EventContext) => {
    const before = change.before.exists ? (change.before.data() as any) : null;
    const after = change.after.exists ? (change.after.data() as any) : null;

    // total delta
    let totalDelta = 0;
    if (!before && after) totalDelta = 1;  // created
    if (before && !after) totalDelta = -1; // deleted

    // metric deltas
    const reachDelta  = num(after?.reach)  - num(before?.reach);
    const clicksDelta = num(after?.clicks) - num(before?.clicks);
    const likesDelta  = num(after?.likes)  - num(before?.likes);

    const inc = admin.firestore.FieldValue.increment;
    await db.doc(STATS_PATH).set(
      {
        total: inc(totalDelta),
        reach: inc(reachDelta),
        clicks: inc(clicksDelta),
        likes: inc(likesDelta),
        updatedAt: nowTs(),
      },
      { merge: true }
    );
  });

/**
 * Hourly safety-net recompute.
 */
export const scheduledRecompute = functions.pubsub
  .schedule("every 1 hours")
  .timeZone("UTC")
  .onRun(async () => {
    await recomputeCampaignAggregates();
  });

/**
 * Admin-only callable to backfill / fix aggregates on demand.
 */
export const backfillAggregates = functions.https.onCall(
  async (_data: unknown, context: functions.https.CallableContext) => {
    const role = String((context.auth?.token as any)?.role || "");
    const isAdmin = !!(context.auth?.token as any)?.admin || ["admin", "superadmin"].includes(role);
    if (!isAdmin) {
      throw new functions.https.HttpsError("permission-denied", "Admin only");
    }
    await recomputeCampaignAggregates();
    return { ok: true };
  }
);
