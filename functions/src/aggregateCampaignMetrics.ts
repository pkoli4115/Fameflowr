// functions/src/aggregateCampaignMetrics.ts
import * as admin from "firebase-admin";
import type { Change, EventContext } from "firebase-functions";

const STATS_PATH = "stats/campaigns";
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();
const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? (v as number) : 0);

/**
 * Recalculate total from source of truth, writing BOTH `total` and `totalCount`
 * so the UI can read either key safely. Lazy-get Firestore to avoid init order issues.
 */
export async function recalcAndWriteTotals(dbArg?: FirebaseFirestore.Firestore) {
  const db = dbArg ?? admin.firestore();

  let total = 0;
  try {
    // Prefer aggregate count()
    const anyDb: any = db;
    const agg = await anyDb.collection("campaigns").count().get();
    total = (agg.data().count as number) ?? 0;
  } catch {
    // Fallback scan
    const snap = await db.collection("campaigns").get();
    total = snap.size;
  }

  await db.doc(STATS_PATH).set(
    { total, totalCount: total, updatedAt: nowTs() },
    { merge: true }
  );
}

/**
 * Incremental aggregator on create/update/delete of /campaigns/{id}.
 * IMPORTANT: does NOT write back to /campaigns to avoid trigger loops.
 */
export async function aggregateCampaignMetrics(
  change: Change<FirebaseFirestore.DocumentSnapshot>,
  _context: EventContext
) {
  const db = admin.firestore();

  const before = change.before.exists ? (change.before.data() as any) : null;
  const after  = change.after.exists  ? (change.after.data()  as any) : null;

  let totalDelta = 0;
  if (!before && after) totalDelta = 1;   // created
  if (before && !after) totalDelta = -1;  // deleted

  const reachDelta  = num(after?.reach)  - num(before?.reach);
  const clicksDelta = num(after?.clicks) - num(before?.clicks);
  const likesDelta  = num(after?.likes)  - num(before?.likes);

  const inc = admin.firestore.FieldValue.increment;

  await db.doc(STATS_PATH).set(
    {
      ...(totalDelta !== 0 ? { total: inc(totalDelta), totalCount: inc(totalDelta) } : {}),
      ...(reachDelta  !== 0 ? { reach:  inc(reachDelta)  } : {}),
      ...(clicksDelta !== 0 ? { clicks: inc(clicksDelta) } : {}),
      ...(likesDelta  !== 0 ? { likes:  inc(likesDelta)  } : {}),
      updatedAt: nowTs(),
    },
    { merge: true }
  );
}

/**
 * Periodic full recompute (safety net). Wire from index.ts as a scheduled job.
 */
export async function scheduledAggregateCampaignMetrics() {
  const db = admin.firestore();

  const snap = await db.collection("campaigns").select("reach", "clicks", "likes").get();

  let total = 0, reach = 0, clicks = 0, likes = 0;
  snap.forEach(d => {
    const doc = d.data() as any;
    total += 1;
    reach  += num(doc.reach);
    clicks += num(doc.clicks);
    likes  += num(doc.likes);
  });

  await db.doc(STATS_PATH).set(
    { total, totalCount: total, reach, clicks, likes, updatedAt: nowTs() },
    { merge: true }
  );
}
