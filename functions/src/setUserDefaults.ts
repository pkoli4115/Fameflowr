import * as admin from "firebase-admin";
import type { DocumentSnapshot } from "firebase-admin/firestore";

export async function setUserDefaults(
  snapshot: DocumentSnapshot
): Promise<void> {
  const data = snapshot.data() || {};
  const userId = snapshot.id;

  const defaults = {
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    role: "user",
    isBlocked: false,
    profileComplete: false,
    ...data,
  };

  await admin.firestore().collection("users").doc(userId).set(defaults, { merge: true });
}
