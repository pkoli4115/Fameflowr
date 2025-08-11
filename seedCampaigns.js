// tools/seed/seedCampaigns.js
/**
 * Seed 20 production-ready campaigns into Firestore.
 * Usage: npm run seed:campaigns
 *
 * Requires: tools/seed/serviceAccount.json (DO NOT COMMIT)
 */

const path = require("path");
const admin = require("firebase-admin");

// ----- Load service account -----
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.resolve(__dirname, "serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

/** Prefix keyword generator for simple title search */
const keywordize = (title) => {
  return Array.from(
    new Set(
      title
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .flatMap((w) => {
          const parts = [];
          for (let i = 1; i <= w.length; i++) parts.push(w.slice(0, i));
          return parts;
        })
    )
  );
};

/** Convert ISO to Firestore Timestamp */
const ts = (iso) => admin.firestore.Timestamp.fromDate(new Date(iso));

/** NOW as Timestamp */
const nowTs = admin.firestore.Timestamp.now();

// ----- 20 REAL CAMPAIGNS -----
const campaigns = [
  {
    title: "World Photography Day Contest",
    description:
      "Share your most stunning photo to celebrate World Photography Day. Top entries will be featured on Fameflowr.",
    startAt: "2025-08-19T00:00:00.000Z",
    endAt: "2025-08-26T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
  },
  {
    title: "Fame Your Pet Challenge",
    description:
      "Post adorable or hilarious photos of your pet with #FameYourPet. Winner gets Premium membership for 3 months.",
    startAt: "2025-08-15T00:00:00.000Z",
    endAt: "2025-08-22T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1558788353-f76d92427f16",
  },
  {
    title: "Street Food Diaries",
    description:
      "Celebrate your city's food culture — share your favourite street food photos and stories.",
    startAt: "2025-08-20T00:00:00.000Z",
    endAt: "2025-08-30T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1543353071-873f17a7a088",
  },
  {
    title: "Monsoon Vibes",
    description:
      "From rain-soaked streets to chai moments — capture the magic of the monsoon season.",
    startAt: "2025-08-12T00:00:00.000Z",
    endAt: "2025-08-19T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1503437313881-503a91226422",
  },
  {
    title: "Fitness Transformation Stories",
    description:
      "Share your before-and-after fitness journey to inspire the Fameflowr community.",
    startAt: "2025-08-14T00:00:00.000Z",
    endAt: "2025-08-28T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1554284126-aa88f22d8b74",
  },
  {
    title: "Travel Throwback",
    description:
      "Post your best travel memories from any trip and share the story behind it.",
    startAt: "2025-08-21T00:00:00.000Z",
    endAt: "2025-08-31T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
  },
  {
    title: "Home Garden Showcase",
    description:
      "Show us your balcony, terrace, or backyard garden setups and tips.",
    startAt: "2025-08-18T00:00:00.000Z",
    endAt: "2025-08-25T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6",
  },
  {
    title: "Festive Fashion Week",
    description:
      "Post your best festive outfit looks for the upcoming season.",
    startAt: "2025-09-01T00:00:00.000Z",
    endAt: "2025-09-07T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1520975922071-3d92b67dff8e",
  },
  {
    title: "Diwali Lights Challenge",
    description:
      "Show off your Diwali decorations and lights for a chance to be featured.",
    startAt: "2025-10-20T00:00:00.000Z",
    endAt: "2025-10-25T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1508672019048-805c876b67e2",
  },
  {
    title: "Local Heroes",
    description:
      "Highlight someone making a difference in your community.",
    startAt: "2025-08-22T00:00:00.000Z",
    endAt: "2025-08-29T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1509099836639-18ba1795216d",
  },
  {
    title: "Nature Close-Up",
    description:
      "Post macro shots of flowers, insects, leaves, or natural textures.",
    startAt: "2025-08-13T00:00:00.000Z",
    endAt: "2025-08-19T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6",
  },
  {
    title: "Book Lovers Week",
    description:
      "Share your reading list or your cozy reading corner.",
    startAt: "2025-08-25T00:00:00.000Z",
    endAt: "2025-08-31T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794",
  },
  {
    title: "Weekend Cooking Challenge",
    description:
      "Post a picture and recipe of your best home-cooked meal this weekend.",
    startAt: "2025-08-16T00:00:00.000Z",
    endAt: "2025-08-18T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
  },
  {
    title: "Campus Creators",
    description:
      "Showcase creative projects from your college campus — art, tech, or events.",
    startAt: "2025-09-05T00:00:00.000Z",
    endAt: "2025-09-15T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b",
  },
  {
    title: "Made in Home: Small Business Stories",
    description:
      "Share your home business journey — products, process, and the people behind it.",
    startAt: "2025-09-10T00:00:00.000Z",
    endAt: "2025-09-20T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2",
  },
  {
    title: "Eco Habits Challenge",
    description:
      "What’s one sustainable habit you follow? Share tips with photos or short videos.",
    startAt: "2025-08-24T00:00:00.000Z",
    endAt: "2025-08-31T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
  },
  {
    title: "Hidden Talent Spotlight",
    description:
      "Show a talent people don’t usually know you have — music, beatbox, magic, anything!",
    startAt: "2025-08-27T00:00:00.000Z",
    endAt: "2025-09-03T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
  },
  {
    title: "The Great Workspace",
    description:
      "Post your desk or creative workspace setup — minimal, cozy, or pro!",
    startAt: "2025-09-12T00:00:00.000Z",
    endAt: "2025-09-18T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
  },
  {
    title: "Sunrise to Sunset",
    description:
      "Capture the sky from dawn to dusk — colors, clouds, and silhouettes.",
    startAt: "2025-08-29T00:00:00.000Z",
    endAt: "2025-09-05T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
  },
  {
    title: "Festival Food Stories",
    description:
      "Share a traditional festive recipe with a photo and the story behind it.",
    startAt: "2025-11-01T00:00:00.000Z",
    endAt: "2025-11-10T23:59:59.000Z",
    imageUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19",
  },
];

async function run() {
  console.log("Seeding campaigns…");

  const batch = db.batch();
  const col = db.collection("campaigns");

  campaigns.forEach((c) => {
    const ref = col.doc(); // auto-id
    batch.set(ref, {
      title: c.title,
      description: c.description || "",
      imageUrl: c.imageUrl || "",
      startAt: ts(c.startAt),
      endAt: ts(c.endAt),
      participantsCount: 0,
      clicks: 0,
      likes: 0,
      shares: 0,
      isDeleted: false,
      titleKeywords: keywordize(c.title),
      createdAt: nowTs,
      updatedAt: nowTs,
    });
  });

  await batch.commit();
  console.log(`Done. Seeded ${campaigns.length} campaigns.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
