// FILE: functions/scripts/seedAggregates.js
// One-off local seeding of /stats/campaigns
//
// If you see "Unable to detect a Project Id", set env vars before running:
//   PowerShell:
//     $env:GOOGLE_CLOUD_PROJECT="fameflowr-217f9"
//     $env:GOOGLE_APPLICATION_CREDENTIALS="$PWD\\serviceAccountKey.json"
//   Or use ADC:
//     gcloud auth application-default login
//     $env:GOOGLE_CLOUD_PROJECT="fameflowr-217f9"

const path = require("path");
const admin = require("firebase-admin");

function initAdmin() {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    "fameflowr-217f9"; // <-- your project id

  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!admin.apps.length) {
    if (saPath) {
      const abs = path.isAbsolute(saPath) ? saPath : path.join(process.cwd(), saPath);
      // Use explicit service account file
      admin.initializeApp({
        credential: admin.credential.cert(require(abs)),
        projectId,
      });
      console.log("🔐 Admin initialized with service account:", abs, "project:", projectId);
    } else {
      // Fall back to ADC (gcloud) or machine creds
      admin.initializeApp({ projectId });
      console.log("🔑 Admin initialized with ADC/machine creds; project:", projectId);
    }
  }

  return admin.firestore();
}

(async () => {
  try {
    const db = initAdmin();

    const snap = await db.collection("campaigns").select("reach", "clicks", "likes").get();
    let total = 0, reach = 0, clicks = 0, likes = 0;

    snap.forEach((doc) => {
      const d = doc.data() || {};
      total += 1;
      reach  += typeof d.reach  === "number" ? d.reach  : 0;
      clicks += typeof d.clicks === "number" ? d.clicks : 0;
      likes  += typeof d.likes  === "number" ? d.likes  : 0;
    });

    await db.doc("stats/campaigns").set(
      {
        total, reach, clicks, likes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("✅ Seeded /stats/campaigns:", { total, reach, clicks, likes });
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();
