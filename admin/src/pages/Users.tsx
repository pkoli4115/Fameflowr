// src/pages/Users.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchUsersPage,
  subscribeToUsers,
  User,
  updateUser,
  softDeleteUser,
  restoreUser,
  addUserNote,
} from "../firebase/userApi";
import { exportToCsv } from "../utils/exportCsv";
import type { DocumentSnapshot, DocumentData } from "firebase/firestore";

// --------- Settings ---------
const PAGE_SIZE_DEFAULT = 20;

const setWindowUsers = (rows: any[]) => {
  (window as any).__users = rows;
};

const fmtDate = (val: any) => {
  try {
    if (!val) return "-";
    if (typeof val?.toDate === "function") return val.toDate().toLocaleString();
    if (typeof val === "number") return new Date(val).toLocaleString();
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString();
  } catch {
    return "-";
  }
};

const Users: React.FC = () => {
  // Data / query
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [orderByField, setOrderByField] = useState<"createdAt" | "lastLogin">("createdAt");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"" | "active" | "banned" | "pending">("");
  const [filterRole, setFilterRole] = useState<"" | "user" | "admin" | "superadmin">("");
  const [showDeleted, setShowDeleted] = useState(false);

  const [search, setSearch] = useState("");

  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<(DocumentSnapshot<DocumentData> | null)[]>([null]);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Edit modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<User["role"]>("user");
  const [editStatus, setEditStatus] = useState<User["status"]>("active");
  const [saving, setSaving] = useState(false);

  // View drawer
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // Rate-limiting (busy by doc id)
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // Permanent delete confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

  const idForDoc = (u: User) => (u as any).docId ?? u.uid;

  const filtersForQuery = useMemo(() => {
    const arr: any[] = [];
    if (filterStatus) arr.push({ field: "status", op: "==", value: filterStatus });
    if (filterRole) arr.push({ field: "role", op: "==", value: filterRole });
    arr.push({ field: "deleted", op: "==", value: !!showDeleted });
    return arr;
  }, [filterStatus, filterRole, showDeleted]);

  // Reset to first page whenever filters/sort/page size change
  useEffect(() => {
    setPageIndex(0);
    setPageCursors([null]);
  }, [pageSize, orderByField, orderDir, filterStatus, filterRole, showDeleted]);

  // Subscribe to current page (live updates) with fallback to one-time fetch
  useEffect(() => {
    setLoading(true);
    let unsub: (() => void) | undefined;

    try {
      unsub = subscribeToUsers(
        { pageSize, after: pageCursors[pageIndex] ?? null, orderByField, orderDir, filters: filtersForQuery },
        (users, lastDoc, hasMore) => {
          setRows(users);
          setHasNextPage(hasMore);
          const nextIndex = pageIndex + 1;
          setPageCursors((prev) => {
            const copy = [...prev];
            copy[nextIndex] = lastDoc;
            return copy;
          });
          setWindowUsers(users);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Live snapshot failed, falling back to fetch:", err);
      (async () => {
        const { users, lastDoc, hasNextPage: hasMore } = await fetchUsersPage({
          pageSize,
          after: pageCursors[pageIndex] ?? null,
          orderByField,
          orderDir,
          filters: filtersForQuery,
        });
        setRows(users);
        setHasNextPage(hasMore);
        const nextIndex = pageIndex + 1;
        setPageCursors((prev) => {
          const copy = [...prev];
          copy[nextIndex] = lastDoc;
          return copy;
        });
        setWindowUsers(users);
        setLoading(false);
      })();
    }

    return () => {
      if (unsub) unsub();
    };
  }, [pageSize, orderByField, orderDir, filterStatus, filterRole, showDeleted, pageIndex]);

  const goNext = () => hasNextPage && setPageIndex((p) => p + 1);
  const canPrev = pageIndex > 0;
  const goPrev = () => canPrev && setPageIndex((p) => p - 1);

  const visibleRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // --- Action wrappers with busy state ---
  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await fn();
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  // --- Actions ---
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name || "");
    setEditRole(user.role || "user");
    setEditStatus(user.status || "active");
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const id = idForDoc(selectedUser);
    try {
      await updateUser(id, { name: editName, role: editRole, status: editStatus }, "edit");
      // No local mutation needed — live snapshot will reflect the change
      setSelectedUser(null);
    } finally {
      setSaving(false);
    }
  };

  const handleBan = async (user: User) => {
    const id = idForDoc(user);
    const next = user.status === "banned" ? "active" : "banned";
    await withBusy(id, async () => {
      await updateUser(id, { status: next }, next === "banned" ? "ban" : "unban");
    });
  };

  const handleFlag = async (user: User) => {
    const id = idForDoc(user);
    const next = !user.flagged;
    await withBusy(id, async () => {
      await updateUser(id, { flagged: next }, next ? "flag" : "unflag");
    });
  };

  const handleBlock = async (user: User) => {
    const id = idForDoc(user);
    const next = !user.blocked;
    await withBusy(id, async () => {
      await updateUser(id, { blocked: next }, next ? "block" : "unblock");
    });
  };

  const handleSoftDelete = async (user: User) => {
    const id = idForDoc(user);
    if (!window.confirm("Soft delete this user? They will be hidden but recoverable.")) return;
    await withBusy(id, async () => {
      await softDeleteUser(id);
    });
  };

  const handleRestore = async (user: User) => {
    const id = idForDoc(user);
    await withBusy(id, async () => {
      await restoreUser(id);
    });
  };

  // Permanent delete modal open (UI only; hard delete disabled in API)
  const openHardDelete = (user: User) => {
    setConfirmTarget(user);
    setConfirmText("");
    setConfirmOpen(true);
  };

  const confirmHardDelete = async () => {
    setConfirmOpen(false);
    alert("Hard delete is disabled in client. Use Firestore Console or enable in API with care.");
  };

  // View drawer
  const handleView = (user: User) => {
    setViewUser(user);
    setNoteDraft(user.notes || "");
    setViewOpen(true);
  };

  const saveNote = async () => {
    if (!viewUser) return;
    const id = idForDoc(viewUser);
    await withBusy(id, async () => {
      await addUserNote(id, noteDraft);
    });
  };

  const handleExport = () => {
    exportToCsv("users.csv", visibleRows);
  };

  // -------- Render --------
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-purple-800 mb-1">User Management</h2>
          <p className="text-gray-500">Manage, search, edit and moderate your user base.</p>
        </div>
        <button
          className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700"
          onClick={handleExport}
        >
          Export CSV
        </button>
      </div>

      {/* Query toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Search users by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="px-3 py-2 border rounded-lg"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          title="Filter by status"
        >
          <option value="">Status: All</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="pending">Pending</option>
        </select>

        <select
          className="px-3 py-2 border rounded-lg"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          title="Filter by role"
        >
          <option value="">Role: All</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700 ml-2">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          Show Deleted
        </label>

        <select
          className="px-3 py-2 border rounded-lg"
          value={orderByField}
          onChange={(e) => setOrderByField(e.target.value as any)}
          title="Sort field"
        >
          <option value="createdAt">Sort: Created</option>
          <option value="lastLogin">Sort: Last login</option>
        </select>

        <select
          className="px-3 py-2 border rounded-lg"
          value={orderDir}
          onChange={(e) => setOrderDir(e.target.value as any)}
          title="Sort direction"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>

        <select
          className="px-3 py-2 border rounded-lg"
          value={pageSize}
          onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={goPrev}
            disabled={!canPrev || loading}
            className={`px-3 py-2 rounded-lg border ${!canPrev || loading ? 'opacity-40' : 'hover:bg-gray-50'}`}
          >
            Prev
          </button>
          <span className="px-2 py-2 text-sm text-gray-600">Page {pageIndex + 1}</span>
          <button
            onClick={goNext}
            disabled={!hasNextPage || loading}
            className={`px-3 py-2 rounded-lg border ${!hasNextPage || loading ? 'opacity-40' : 'hover:bg-gray-50'}`}
          >
            Next
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-purple-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Created At</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((user) => {
              const flagged = Boolean(user.flagged);
              const blocked = Boolean(user.blocked);
              const deleted = Boolean(user.deleted);
              const id = idForDoc(user);

              return (
                <tr key={id} className={`transition ${deleted ? "opacity-40" : blocked ? "opacity-60" : "hover:bg-purple-50"}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    <span className="inline-flex items-center gap-2">
                      {user.name}
                      {flagged && <span title="Flagged" className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700">🚩</span>}
                      {blocked && <span title="Blocked" className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-gray-200 text-gray-700">⛔</span>}
                      {deleted && <span title="Deleted" className="inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700">🗑</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      user.status === "active" ? "bg-green-100 text-green-700"
                      : user.status === "banned" ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                    }`}>
                      {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtDate(user.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm flex flex-wrap gap-2">
                    <button
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-md"
                      onClick={() => handleView(user)}
                    >
                      View
                    </button>

                    <button
                      className="bg-blue-100 hover:bg-blue-200 text-blue-600 px-3 py-1 rounded-md disabled:opacity-40"
                      onClick={() => handleEdit(user)}
                      disabled={busy[id] || deleted}
                      title={deleted ? "Restore to edit" : "Edit user"}
                    >
                      Edit
                    </button>

                    <button
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1 rounded-md disabled:opacity-40"
                      onClick={() => handleBan(user)}
                      disabled={busy[id] || deleted}
                      title={deleted ? "Restore to change status" : user.status === "banned" ? "Unban" : "Ban"}
                    >
                      {user.status === "banned" ? "Unban" : "Ban"}
                    </button>

                    <button
                      className={`px-3 py-1 rounded-md disabled:opacity-40 ${Boolean(user.flagged) ? "bg-red-100 hover:bg-red-200 text-red-700" : "bg-orange-100 hover:bg-orange-200 text-orange-700"}`}
                      onClick={() => handleFlag(user)}
                      disabled={busy[id] || deleted}
                      title={deleted ? "Restore to change" : Boolean(user.flagged) ? "Unflag" : "Flag"}
                    >
                      {Boolean(user.flagged) ? "Unflag" : "Flag"}
                    </button>

                    <button
                      className={`px-3 py-1 rounded-md disabled:opacity-40 ${Boolean(user.blocked) ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}`}
                      onClick={() => handleBlock(user)}
                      disabled={busy[id] || deleted}
                      title={deleted ? "Restore to change" : Boolean(user.blocked) ? "Unblock" : "Block"}
                    >
                      {Boolean(user.blocked) ? "Unblock" : "Block"}
                    </button>

                    {!deleted ? (
                      <button
                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-md disabled:opacity-40"
                        onClick={() => handleSoftDelete(user)}
                        disabled={busy[id]}
                        title="Soft delete (recoverable)"
                      >
                        Soft Delete
                      </button>
                    ) : (
                      <>
                        <button
                          className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded-md disabled:opacity-40"
                          onClick={() => handleRestore(user)}
                          disabled={busy[id]}
                          title="Restore user"
                        >
                          Restore
                        </button>
                        <button
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md disabled:opacity-40"
                          onClick={() => openHardDelete(user)}
                          disabled={busy[id]}
                          title="Permanently delete"
                        >
                          Delete Forever
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && visibleRows.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-xl">No users found.</div>
        )}
        {loading && <div className="text-center py-10 text-gray-400 text-xl">Loading…</div>}
      </div>

      {/* Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit User</h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium">Name</label>
              <input className="w-full px-4 py-2 border rounded-lg" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={saving} />
              <label className="block text-sm font-medium">Role</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={editRole} onChange={(e) => setEditRole(e.target.value as User["role"])} disabled={saving}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <label className="block text-sm font-medium">Status</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={editStatus} onChange={(e) => setEditStatus(e.target.value as User["status"])} disabled={saving}>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button className="bg-gray-200 px-4 py-2 rounded-lg" onClick={() => setSelectedUser(null)} disabled={saving}>Cancel</button>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Drawer */}
      {viewOpen && viewUser && (
        <div className="fixed inset-0 bg-black/40 flex items-stretch justify-end z-50">
          <div className="absolute inset-0" onClick={() => setViewOpen(false)} aria-hidden="true" />
          <aside className="relative h-full w-full sm:w-[440px] bg-white shadow-2xl p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label="User Details">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">User Details</h3>
              <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={() => setViewOpen(false)}>Close</button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={(viewUser as any).photoURL || (viewUser as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewUser.name ?? "User")}`}
                alt="avatar"
                className="h-14 w-14 rounded-full border object-cover"
              />
              <div>
                <div className="text-base font-semibold">{viewUser.name ?? "—"}</div>
                <div className="text-sm text-gray-600">{viewUser.email ?? "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <div className="text-xs uppercase text-gray-500">Doc ID</div>
                <div className="font-medium break-all">{(viewUser as any).docId ?? viewUser.uid}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Role</div>
                <div className="font-medium capitalize">{viewUser.role ?? "user"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Status</div>
                <div className="font-medium">{viewUser.status ?? "active"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Created At</div>
                <div className="font-medium">{fmtDate(viewUser.createdAt)}</div>
              </div>
              {"blocked" in viewUser && (
                <div>
                  <div className="text-xs uppercase text-gray-500">Blocked</div>
                  <div className="font-medium">{viewUser.blocked ? "Yes" : "No"}</div>
                </div>
              )}
              {"flagged" in viewUser && (
                <div>
                  <div className="text-xs uppercase text-gray-500">Flagged</div>
                  <div className="font-medium">{viewUser.flagged ? "Yes" : "No"}</div>
                </div>
              )}
              {"deleted" in viewUser && (
                <div>
                  <div className="text-xs uppercase text-gray-500">Deleted</div>
                  <div className="font-medium">{viewUser.deleted ? "Yes" : "No"}</div>
                </div>
              )}
            </div>

            <div className="mb-3 text-sm font-semibold">Admin Notes</div>
            <textarea
              className="w-full min-h-[120px] border rounded-lg p-3 text-sm"
              placeholder="Add internal notes about this user (visible to admins only)"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <div className="flex justify-end mt-3">
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg" onClick={saveNote}>Save Note</button>
            </div>
          </aside>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {confirmOpen && confirmTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-2">Permanently delete user?</h3>
            <p className="text-sm text-gray-600">
              This action cannot be undone. Type <span className="font-mono bg-gray-100 px-1 rounded">{idForDoc(confirmTarget)}</span> to confirm.
            </p>
            <input
              className="mt-3 w-full border rounded-lg px-3 py-2"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type the Doc ID here"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-40"
                disabled={confirmText !== idForDoc(confirmTarget)}
                onClick={confirmHardDelete}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
