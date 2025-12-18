import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { api } from "../lib/api";

type UserRow = { id: string; name: string; email: string; role: string; createdAt: string };

export function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");

  useEffect(() => {
    let alive = true;
    if (!isAdmin) return;
    setLoading(true);
    api
      .usersList()
      .then((d) => {
        if (alive) setItems(d);
      })
      .catch(() => {
        if (alive) setError("Could not load users (admin only).");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  async function refresh() {
    const d = await api.usersList();
    setItems(d);
  }

  function openCreate() {
    setError(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("user");
    setCreateOpen(true);
  }

  async function submit() {
    setError(null);
    try {
      await api.userCreate({ name, email, password, role });
      setCreateOpen(false);
      await refresh();
    } catch (e: any) {
      if (e?.status === 409) setError("Email already exists.");
      else setError("Could not create the user.");
    }
  }

  function openEdit(u: UserRow) {
    setError(null);
    setEditing(u);
    setName(u.name);
    setRole((u.role as "admin" | "user") || "user");
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editing) return;
    setError(null);
    try {
      await api.userUpdate(editing.id, { name, role });
      setEditOpen(false);
      setEditing(null);
      await refresh();
    } catch {
      setError("Could not update the user.");
    }
  }

  async function resetPassword(u: UserRow) {
    if (!confirm(`Reset password for user "${u.name}" to "admin"?`)) return;
    setError(null);
    try {
      await api.userResetPassword(u.id);
      setError('Password reset successfully. New default password: "admin".');
    } catch {
      setError("Could not reset the password.");
    }
  }

  async function remove(u: UserRow) {
    if (!confirm(`Delete user "${u.name}" (${u.email})?`)) return;
    setError(null);
    try {
      await api.userDelete(u.id);
      await refresh();
    } catch (e: any) {
      if (e?.status === 409) setError("Cannot delete: this user has linked trips.");
      else setError("Could not delete the user.");
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold">Users</div>
        <div className="mt-1 text-sm text-slate-600">Only admins can access this page.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Users</div>
          <div className="text-sm text-slate-600">User management (admin).</div>
        </div>
        <Button onClick={openCreate}>Create user</Button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium md:grid">
          <div className="col-span-3">Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-1">Role</div>
          <div className="col-span-2">Created at</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((u) => (
            <div key={u.id} className="p-3">
              <div className="grid min-w-0 grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                <div className="md:col-span-3">
                  <div className="text-slate-600 md:hidden">Name</div>
                  <div className="min-w-0 truncate font-medium">{u.name}</div>
                </div>
                <div className="md:col-span-4">
                  <div className="text-slate-600 md:hidden">Email</div>
                  <div className="min-w-0 truncate text-slate-700">{u.email}</div>
                </div>
                <div className="md:col-span-1">
                  <div className="text-slate-600 md:hidden">Role</div>
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {u.role}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Created at</div>
                  <div className="min-w-0 truncate whitespace-nowrap text-slate-700">
                    {new Date(u.createdAt).toLocaleString("en-US")}
                  </div>
                </div>
                <div className="md:col-span-2 md:justify-self-end md:text-right">
                  <div className="flex flex-nowrap items-center gap-1">
                    <Button className="px-2 py-1" variant="ghost" onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                    <Button className="px-2 py-1" variant="ghost" onClick={() => remove(u)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading ? <div className="p-3 text-sm text-slate-600">Loading...</div> : null}
          {!loading && items.length === 0 ? <div className="p-3 text-sm text-slate-600">No users yet.</div> : null}
        </div>
      </div>

      <Modal title="Create user" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Role</div>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button onClick={submit} disabled={!name.trim() || !email.trim() || password.length < 6}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal title="Edit user" open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Role</div>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button onClick={submitEdit} disabled={!name.trim()}>
              Save
            </Button>
            {editing ? (
              <button
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                onClick={() => resetPassword(editing)}
                type="button"
              >
                Reset password
              </button>
            ) : null}
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


