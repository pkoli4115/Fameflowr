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
exports.togglePublishFn = exports.syncBlockedToAuthFn = exports.setUserDefaultsFn = exports.auditCampaignsFn = exports.scheduledAggregateCampaignMetricsFn = exports.onCampaignWriteFn = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const aggregateCampaignMetrics_1 = require("./aggregateCampaignMetrics");
const auditLogs_1 = require("./auditLogs");
const setUserDefaults_1 = require("./setUserDefaults");
const syncBlockedToAuth_1 = require("./syncBlockedToAuth");
const togglePublish_1 = require("./togglePublish");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
// Firestore trigger to aggregate campaign metrics when a campaign is written
exports.onCampaignWriteFn = functions
    .region("asia-south1")
    .firestore.document("campaigns/{campaignId}")
    .onWrite(aggregateCampaignMetrics_1.aggregateCampaignMetrics);
// Scheduled function to run daily aggregations
exports.scheduledAggregateCampaignMetricsFn = functions
    .region("asia-south1")
    .pubsub.schedule("every 24 hours")
    .onRun(aggregateCampaignMetrics_1.scheduledAggregateCampaignMetrics);
// Firestore trigger to run audits when a campaign changes
exports.auditCampaignsFn = functions
    .region("asia-south1")
    .firestore.document("campaigns/{campaignId}")
    .onWrite(auditLogs_1.onCampaignWriteAudit);
// Firestore trigger to set defaults when a user is created
exports.setUserDefaultsFn = functions
    .region("asia-south1")
    .firestore.document("users/{userId}")
    .onCreate(setUserDefaults_1.setUserDefaults);
// Firestore trigger to sync blocked users to Auth
exports.syncBlockedToAuthFn = functions
    .region("asia-south1")
    .firestore.document("users/{userId}")
    .onWrite(syncBlockedToAuth_1.syncBlockedToAuth);
// Callable: publish/unpublish
exports.togglePublishFn = togglePublish_1.togglePublish;
