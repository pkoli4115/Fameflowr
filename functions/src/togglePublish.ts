import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

export const togglePublish = functions
  .region("asia-south1")
  .https.onCall(async (data, context) => {
    const role = String((context.auth?.token as any)?.role || "");
    const isAdmin = !!(context.auth?.token as any)?.admin || ["admin", "superadmin"].includes(role);
    if (!isAdmin) {
      throw new functions.https.HttpsError("permission-denied", "Admin only");
    }

    const campaignId = String(data?.campaignId || "");
    const publish = Boolean(data?.publish);

    if (!campaignId) {
      throw new functions.https.HttpsError("invalid-argument", "campaignId required");
    }

    const db = admin.firestore();
    const ref = db.collection("campaigns").doc(campaignId);

    const snap = await ref.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "Campaign not found");
    }

    const nextStatus = publish ? "active" : "draft";
    await ref.update({
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });

    // Best-effort audit (optional)
    await db.collection("auditLogs").add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      action: publish ? "publish" : "unpublish",
      targetType: "campaign",
      campaignId,
      after: { status: nextStatus },
      source: "function/togglePublish",
      actorUid: context.auth?.uid ?? null,
    });

    return { ok: true, status: nextStatus };
  });
