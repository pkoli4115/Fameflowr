const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedDemoData() {
  const usersCollection = db.collection('users');
  const postsCollection = db.collection('posts');

  for (let i = 1; i <= 25; i++) {
    const userId = `demo_creator_${i}`;
    const userDoc = usersCollection.doc(userId);
    await userDoc.set({
      uid: userId,
      name: `Demo Creator ${i}`,
      email: `demo${i}@fameflowr.com`,
      status: 'active',
      role: 'user',
      createdAt: Date.now(),
      lastLogin: Date.now(),
      isDemo: true
    });

    for (let j = 1; j <= 3; j++) {
      await postsCollection.add({
        title: `Demo Post ${j} by Creator ${i}`,
        content: `This is the content for post ${j} by Demo Creator ${i}.`,
        creatorUid: userId,
        createdAt: Date.now(),
        isDemo: true
      });
    }
  }

  console.log('✅ Seeded 25 creators with 3 posts each.');
}

seedDemoData()
  .then(() => process.exit())
  .catch(err => { console.error(err); process.exit(1); });
