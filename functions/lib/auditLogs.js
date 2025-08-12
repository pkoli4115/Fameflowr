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
exports.onCampaignWriteAudit = void 0;
exports.auditCampaigns = auditCampaigns;
const admin = __importStar(require("firebase-admin"));
const AUDIT_COLLECTION = "auditLogs";
const nowTs = () => admin.firestore.FieldValue.serverTimestamp();
/**
 * Core audit handler for /campaigns/{id|campaignId} writes.
 * Exports as both `auditCampaigns` and `onCampaignWriteAudit` for import compatibility.
 */
async function auditCampaigns(change, context) {
    const db = admin.firestore();
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    const action = !before && after ? "create" : before && !after ? "delete" : "update";
    // Support either param name used in triggers
    const campaignId = context.params.campaignId ??
        context.params.id ??
        null;
    await db.collection(AUDIT_COLLECTION).add({
        ts: nowTs(),
        action,
        targetType: "campaign",
        campaignId,
        before,
        after,
        source: "function/auditCampaigns",
    });
}
// Backward-compatible alias (so either import name works)
exports.onCampaignWriteAudit = auditCampaigns;
