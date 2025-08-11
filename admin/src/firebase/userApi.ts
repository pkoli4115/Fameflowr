// src/firebase/userApi.ts
import { db } from "./firebaseConfig";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  DocumentData,
  DocumentSnapshot,
  QueryConstraint,
  onSnapshot,
} from "firebase/firestore";
import { toast } from "../ui/toast";
import { addAudit } from "./audit";
import { getAuth } from "firebase/auth";

// -------- Types --------
export interface User {
  uid: string;
  name: string;
  email: string;
  status: "active" | "banned" | "pending";
  role: "user" | "admin" | "superadmin";
  createdAt: number;
  lastLogin: number;
  notes?: string;
  photoURL?: string;

  // moderation flags
  flagged?: boolean;
  blocked?: boolean;

  // soft delete
  deleted?: boolean;
  deletedAt?: number | null;
}

export type UsersFilter =
  | { field: "status"; op: "=="; value: "active" | "banned" | "pending" }
  | { field: "role"; op: "=="; value: "user" | "admin" | "superadmin" }
  | { field: "deleted"; op: "=="; value: boolean };

export interface FetchPageOpts {
  pageSize: number;
  after?: DocumentSnapshot<DocumentData> | null;
  orderByField?: "createdAt" | "lastLogin";
  orderDir?: "asc" | "desc";
  filters?: UsersFilter[];
}

const usersRef = collection(db, "users");
const auth = getAuth();

function actor() {
  const u = auth.currentUser;
  return { uid: u?.uid ?? null, email: u?.email ?? null };
}

// -------- One-time paged fetch (fallback or SSR) --------
export async function fetchUsersPage(opts: FetchPageOpts) {
  const {
    pageSize,
    after = null,
    orderByField = "createdAt",
    orderDir = "desc",
    filters = [],
  } = opts;

  const constraints: QueryConstraint[] = [];

  // By default, exclude deleted users unless explicitly asked for
  const hasDeletedFilter = filters.some((f) => f.field === "deleted");
  if (!hasDeletedFilter) {
    constraints.push(where("deleted", "==", false));
  }

  for (const f of filters) {
    constraints.push(where(f.field as any, f.op as any, (f as any).value));
  }

  constraints.push(orderBy(orderByField, orderDir));
  if (after) constraints.push(startAfter(after));
  constraints.push(limit(pageSize));

  const snap = await getDocs(query(usersRef, ...constraints));

  return {
    users: snap.docs.map((d) => ({ ...(d.data() as User), uid: d.id } as User)),
    lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
    hasNextPage: snap.docs.length === pageSize,
  };
}

// -------- Live subscription for the current page --------
export function subscribeToUsers(
  opts: FetchPageOpts,
  callback: (
    users: User[],
    lastDoc: DocumentSnapshot<DocumentData> | null,
    hasNextPage: boolean
  ) => void
) {
  const {
    pageSize,
    after = null,
    orderByField = "createdAt",
    orderDir = "desc",
    filters = [],
  } = opts;

  const constraints: QueryConstraint[] = [];

  const hasDeletedFilter = filters.some((f) => f.field === "deleted");
  if (!hasDeletedFilter) {
    constraints.push(where("deleted", "==", false));
  }

  for (const f of filters) {
    constraints.push(where(f.field as any, f.op as any, (f as any).value));
  }

  constraints.push(orderBy(orderByField, orderDir));
  if (after) constraints.push(startAfter(after));
  constraints.push(limit(pageSize));

  const q = query(usersRef, ...constraints);

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ ...(d.data() as User), uid: d.id } as User)),
      snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      snap.docs.length === pageSize
    );
  });
}

// -------- Mutations (all audited + last actor) --------
export async function updateUser(
  uid: string,
  updates: Partial<User>,
  auditAction?: string
) {
  const userDoc = doc(usersRef, uid);
  try {
    await updateDoc(userDoc, { ...updates, __lastActor: actor() } as any);
    if (auditAction) {
      await addAudit({
        actorUid: actor().uid,
        actorEmail: actor().email,
        action: auditAction as any,
        targetId: uid,
        details: updates,
      });
    }
    toast.success("Saved to Firestore");
    return true;
  } catch (err: any) {
    console.error("Error updating user:", err);
    toast.error(`Failed to save: ${err?.code || ""} ${err?.message || ""}`);
    throw err;
  }
}

/** Soft delete: mark deleted, keep data */
export async function softDeleteUser(uid: string) {
  const when = Date.now();
  await updateUser(uid, { deleted: true, deletedAt: when }, "soft_delete");
}

/** Restore soft-deleted user */
export async function restoreUser(uid: string) {
  await updateUser(uid, { deleted: false, deletedAt: null }, "restore");
}

/** Hard delete (disabled for safety in client) */
export async function hardDeleteUser(_uid: string) {
  throw new Error(
    "Hard delete disabled in client. Use Firestore Console or implement carefully."
  );
}

/** Add or update admin-only note */
export async function addUserNote(uid: string, note: string) {
  await updateUser(uid, { notes: note }, "note");
}
