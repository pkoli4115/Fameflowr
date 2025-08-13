/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// ---------- Config ----------
const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "fameflowr-217f9";
const COUNT =
  Number((process.argv.find(a => a.startsWith("--count=")) || "").split("=")[1]) ||
  Number(process.env.SEED_COUNT) ||
  20;

// ---------- Credential bootstrap ----------
function resolveServiceAccountPath() {
  // 1) If GOOGLE_APPLICATION_CREDENTIALS is set, prefer that
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fs.existsSync(p)) return p;
    throw new Error(
      `GOOGLE_APPLICATION_CREDENTIALS points to a missing file:\n${p}`
    );
  }
  // 2) Try serviceAccount.json next to this script
  const local = path.resolve(__dirname, "serviceAccount.json");
  if (fs.existsSync(local)) return local;

  // 3) Try project root (one level up)
  const root = path.resolve(__dirname, "..", "serviceAccount.json");
  if (fs.existsSync(root)) return root;

  // 4) Last resort: the absolute path you attempted earlier (helps Windows users)
  const abs = "C:\\Users\\Prasanth\\Projects\\Fameflowr\\serviceAccount.json";
  if (fs.existsSync(abs)) return abs;

  throw new Error(
    "Could not find serviceAccount.json.\n" +
      "Place it next to this script OR set the env var GOOGLE_APPLICATION_CREDENTIALS."
  );
}

function initAdmin() {
  if (admin.apps.length) return;

  let creds;
  try {
    const saPath = resolveServiceAccountPath();
    creds = JSON.parse(fs.readFileSync(saPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(creds),
      projectId: creds.project_id || DEFAULT_PROJECT_ID,
    });
    console.log("✔ Firebase Admin initialized with service account:", creds.project_id || DEFAULT_PROJECT_ID);
  } catch (e) {
    console.warn("Service account not found via file. Trying applicationDefault() …");
    // Will work if GOOGLE_APPLICATION_CREDENTIALS is set or gcloud auth exists
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: DEFAULT_PROJECT_ID,
    });
    console.log("✔ Firebase Admin initialized via applicationDefault()");
  }
}

// ---------- Helpers ----------
const db = () => admin.firestore();
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();

function keywordize(str) {
  const tokens = (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  // simple prefix list
  const prefixes = new Set();
  for (const t of tokens) {
    for (let i = 1; i <= t.length; i++) prefixes.add(t.slice(0, i));
  }
  return Array.from(prefixes);
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(base, days) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function buildCampaign(i) {
  const themes = [
    "Diwali Lights",
    "Campus Fest",
    "Local Food Crawl",
    "Tech Expo",
    "Monsoon Memories",
    "Fitness Challenge",
    "Eco Drive",
    "Art & Culture Week",
    "Music Marathon",
    "Startup Demo Day",
  ];
  const cats = ["festival", "campus", "food", "tech", "sports", "arts"];
  const title = `${randomFrom(themes)} #${String(i + 1).padStart(2, "0")}`;

  const start = addDays(new Date(), -Math.floor(Math.random() * 30));
  const end = addDays(start, 7 + Math.floor(Math.random() * 21));

  return {
    title,
    description:
      "Join our community campaign and share your best moments. Engage with posts, invite friends, and climb the leaderboard!",
    category: randomFrom(cats),
    imageUrl: "", // put a CDN URL if you want
    startAt: start,
    endAt: end,
    participantsCount: 0,
    reach: 0,
    clicks: 0,
    likes: 0,
    shares: 0,
    isDeleted: false,
    titleKeywords: keywordize(title),
    createdAt: nowTs(),
    updatedAt: nowTs(),
    visibility: "public",
    status: "draft", // or "published"
  };
}

async function seedCampaigns(count) {
  initAdmin();
  const firestore = db();

  console.log(`Seeding ${count} campaigns into 'campaigns'…`);
  const chunkSize = 400; // under the 500 ops limit
  let created = 0;

  for (let offset = 0; offset < count; offset += chunkSize) {
    const batch = firestore.batch();
    const limit = Math.min(chunkSize, count - offset);

    for (let i = 0; i < limit; i++) {
      const campaign = buildCampaign(offset + i);
      const ref = firestore.collection("campaigns").doc(); // auto-ID
      batch.set(ref, campaign);
    }

    await batch.commit();
    created += limit;
    console.log(`… committed ${created}/${count}`);
  }

  console.log("✅ Done. Triggered Cloud Functions will update stats automatically.");
}

// Run
seedCampaigns(COUNT).catch((e) => {
  console.error("Seed failed:", e);
  process.exitCode = 1;
});
