import * as admin from "firebase-admin";

/**
 * Initialization:
 * - If you run via `firebase emulators:exec`, this will use the emulator creds.
 * - For PROD backfill, set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON,
 *   or replace initializeApp() with initializeApp({ credential: admin.credential.cert(...) }).
 */
admin.initializeApp();

const db = admin.firestore();

// Firestore batch limit is 500 writes per batch
const BATCH_LIMIT = 500;

async function backfill() {
  console.log("Starting backfill: set deleted=false, deletedAt=null where missing…");

  // Stream to avoid loading everything in memory for very large collections
  const snap = await db.collection("users").get();
  if (snap.empty) {
    console.log("No user documents found.");
    return;
  }

  let totalUpdated = 0;
  let batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (typeof data.deleted === "undefined") {
      batch.update(doc.ref, { deleted: false, deletedAt: null });
      ops++;
      totalUpdated++;

      if (ops >= BATCH_LIMIT) {
        await batch.commit();
        console.log(`Committed ${ops} updates (running total: ${totalUpdated})`);
        batch = db.batch();
        ops = 0;
      }
    }
  }

  if (ops > 0) {
    await batch.commit();
    console.log(`Committed final ${ops} updates (total: ${totalUpdated})`);
  }

  console.log("✅ Backfill complete.");
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
