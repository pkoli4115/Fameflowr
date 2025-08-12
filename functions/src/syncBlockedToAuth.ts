import * as admin from "firebase-admin";
import type { Change, EventContext } from "firebase-functions";
import type { DocumentSnapshot } from "firebase-admin/firestore";

export async function syncBlockedToAuth(
  change: Change<DocumentSnapshot>,
  context: EventContext
): Promise<void> {
  const before = change.before.exists ? change.before.data() : {};
  const after = change.after.exists ? change.after.data() : {};
  const userId = context.params.userId;

  if (!after || before?.isBlocked === after?.isBlocked) {
    return;
  }

  try {
    await admin.auth().updateUser(userId, {
      disabled: Boolean(after.isBlocked),
    });
    console.log(`Auth user ${userId} ${after.isBlocked ? "disabled" : "enabled"}`);
  } catch (error) {
    console.error(`Error syncing blocked status for ${userId}:`, error);
  }
}
