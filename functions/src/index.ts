// functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * When a new user doc is created, ensure it has default flags.
 */
export const setUserDefaults = functions.firestore
  .document("users/{uid}")
  .onCreate(async (snap) => {
    const data = snap.data() || {};
    const updates: any = {};

    if (typeof data.deleted === "undefined") {
      updates.deleted = false;
      updates.deletedAt = null;
    }
    if (typeof data.blocked === "undefined") {
      updates.blocked = false;
    }
    if (typeof data.flagged === "undefined") {
      updates.flagged = false;
    }

    if (Object.keys(updates).length > 0) {
      await snap.ref.update(updates);
    }
  });

/**
 * When /users/{id}.blocked changes:
 *  - Update Firebase Auth disabled flag
 *  - Write an audit entry
 */
export const syncBlockedToAuth = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const userId = context.params.userId as string;

    const before = change.before.exists ? (change.before.data() as any) : {};
    const after = change.after.exists ? (change.after.data() as any) : {};

    const wasBlocked = !!before.blocked;
    const isBlocked = !!after.blocked;

    if (wasBlocked === isBlocked) return;

    // 1) Try to disable/enable the Auth user
    try {
      await admin.auth().updateUser(userId, { disabled: isBlocked });
    } catch (e) {
      // Not all doc IDs map to Auth UIDs — best-effort only
      console.warn("updateUser failed for", userId, e);
    }

    // 2) Best-effort audit log
    try {
      await db.collection("auditlogs").add({
        ts: admin.firestore.FieldValue.serverTimestamp(),
        actorUid: after?.__lastActor?.uid ?? null,
        actorEmail: after?.__lastActor?.email ?? null,
        action: isBlocked ? "block" : "unblock",
        targetId: userId,
        before: { blocked: wasBlocked },
        after: { blocked: isBlocked },
        source: "function/syncBlockedToAuth",
      });
    } catch (e) {
      console.warn("audit log write failed", e);
    }
  });
