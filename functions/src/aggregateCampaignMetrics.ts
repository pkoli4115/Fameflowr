import * as admin from "firebase-admin";
import type { Change, EventContext } from "firebase-functions";

export async function aggregateCampaignMetrics(
  change: Change<FirebaseFirestore.DocumentSnapshot>,
  context: EventContext
) {
  const after = change.after.exists ? change.after.data() : null;
  const before = change.before.exists ? change.before.data() : null;

  if (!after) return;

  const campaignId = context.params.campaignId;
  const db = admin.firestore();

  // Example aggregation: update lastUpdated timestamp
  await db.collection("campaigns").doc(campaignId).set(
    {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function scheduledAggregateCampaignMetrics() {
  const db = admin.firestore();
  const campaigns = await db.collection("campaigns").get();

  const batch = db.batch();
  campaigns.forEach((doc) => {
    batch.update(doc.ref, {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
}
