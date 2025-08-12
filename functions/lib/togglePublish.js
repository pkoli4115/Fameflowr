"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.togglePublish = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
exports.togglePublish = functions
    .region("asia-south1")
    .https.onCall(async (data, context) => {
    const role = String(context.auth?.token?.role || "");
    const isAdmin = !!context.auth?.token?.admin || ["admin", "superadmin"].includes(role);
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
