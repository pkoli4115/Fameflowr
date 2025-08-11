import { db } from "./firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export type AuditPayload = {
  actorUid: string | null;
  actorEmail: string | null;
  action:
    | "edit"
    | "block"
    | "unblock"
    | "flag"
    | "unflag"
    | "ban"
    | "unban"
    | "soft_delete"
    | "restore"
    | "hard_delete"
    | "note";
  targetId: string;
  details?: any;
};

export async function addAudit(p: AuditPayload) {
  await addDoc(collection(db, "auditLogs"), {
    ...p,
    ts: serverTimestamp(),
  });
}
