import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import { aggregateCampaignMetrics, scheduledAggregateCampaignMetrics } from "./aggregateCampaignMetrics";
import { onCampaignWriteAudit as auditCampaigns } from "./auditLogs";
import { setUserDefaults } from "./setUserDefaults";
import { syncBlockedToAuth } from "./syncBlockedToAuth";
import { togglePublish } from "./togglePublish";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Firestore trigger to aggregate campaign metrics when a campaign is written
export const onCampaignWriteFn = functions
  .region("asia-south1")
  .firestore.document("campaigns/{campaignId}")
  .onWrite(aggregateCampaignMetrics);

// Scheduled function to run daily aggregations
export const scheduledAggregateCampaignMetricsFn = functions
  .region("asia-south1")
  .pubsub.schedule("every 24 hours")
  .onRun(scheduledAggregateCampaignMetrics);

// Firestore trigger to run audits when a campaign changes
export const auditCampaignsFn = functions
  .region("asia-south1")
  .firestore.document("campaigns/{campaignId}")
  .onWrite(auditCampaigns);

// Firestore trigger to set defaults when a user is created
export const setUserDefaultsFn = functions
  .region("asia-south1")
  .firestore.document("users/{userId}")
  .onCreate(setUserDefaults);

// Firestore trigger to sync blocked users to Auth
export const syncBlockedToAuthFn = functions
  .region("asia-south1")
  .firestore.document("users/{userId}")
  .onWrite(syncBlockedToAuth);

// Callable: publish/unpublish
export const togglePublishFn = togglePublish;
