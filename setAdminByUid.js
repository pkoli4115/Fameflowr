// setAdminByUid.js (project root)
const admin = require("firebase-admin");
const key = require("./serviceAccountKey.json"); // service account for your Firebase project

admin.initializeApp({ credential: admin.credential.cert(key) });

(async () => {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node setAdminByUid.js <uid-or-email>");
    process.exit(1);
  }

  let uid = arg;
  if (arg.includes("@")) {
    const user = await admin.auth().getUserByEmail(arg);
    uid = user.uid;
  }

  await admin.auth().setCustomUserClaims(uid, { admin: true, role: "superadmin" });
  console.log(`✅ Custom claims set for ${uid}: { admin: true, role: "superadmin" }`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
