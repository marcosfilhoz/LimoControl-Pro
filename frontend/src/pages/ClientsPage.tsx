import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { ContextMenu } from "../components/ContextMenu";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { api } from "../lib/api";

type Client = { id: string; name: string; contact?: string; active: boolean };

export function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; client: Client | null }>({
    open: false,
    x: 0,
    y: 0,
    client: null,
  });

  const activeCount = useMemo(() => items.filter((i) => i.active).length, [items]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.clientsList()
      .then((d) => {
        if (alive) setItems(d);
      })
      .catch(() => {
        if (alive) setError("Could not load clients.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    const d = await api.clientsList();
    setItems(d);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setContact("");
    setModalOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setName(c.name);
    setContact(c.contact || "");
    setModalOpen(true);
  }

  async function submit() {
    setError(null);
    try {
      if (editing) {
        await api.clientUpdate(editing.id, { name, contact: contact || undefined });
      } else {
        await api.clientCreate({ name, contact: contact || undefined });
      }
      setModalOpen(false);
      await refresh();
    } catch {
      setError("Could not save the client.");
    }
  }

  async function remove(c: Client) {
    if (!confirm(`Delete client "${c.name}"?`)) return;
    try {
      await api.clientDelete(c.id);
      await refresh();
    } catch (e: any) {
      if (e?.status === 409) setError("Cannot delete: this client has linked trips.");
      else setError("Could not delete the client.");
    }
  }

  async function toggleActive(c: Client, active: boolean) {
    try {
      await api.clientSetActive(c.id, active);
      await refresh();
    } catch {
      setError("Could not update client status.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Clients</div>
          <div className="text-sm text-slate-600">
            Create, edit, delete, and deactivate (right-click). Active: {activeCount}/{items.length}
          </div>
        </div>
        <Button onClick={openCreate}>Add client</Button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium md:grid">
          <div className="col-span-4">Name</div>
          <div className="col-span-4">Contact</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((c) => (
            <div
              key={c.id}
              className="p-3"
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ open: true, x: e.clientX, y: e.clientY, client: c });
              }}
              title="Right-click to deactivate/reactivate"
            >
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                <div className="md:col-span-4">
                  <div className="text-slate-600 md:hidden">Name</div>
                  <div className="font-medium">{c.name}</div>
                </div>
                <div className="md:col-span-4">
                  <div className="text-slate-600 md:hidden">Contact</div>
                  <div className="text-slate-700">{c.contact || "—"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Status</div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="md:col-span-2 md:text-right">
                  <div className="flex flex-nowrap items-center gap-1 md:justify-end">
                    <Button className="px-2 py-1" variant="ghost" onClick={() => openEdit(c)}>
                      Edit
                    </Button>
                    <Button className="px-2 py-1" variant="ghost" onClick={() => remove(c)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading ? <div className="p-3 text-sm text-slate-600">Loading...</div> : null}
          {!loading && items.length === 0 ? <div className="p-3 text-sm text-slate-600">No clients yet.</div> : null}
        </div>
      </div>

      <ContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        onClose={() => setMenu((m) => ({ ...m, open: false }))}
        items={
          menu.client
            ? [
                menu.client.active
                  ? { label: "Deactivate", onClick: () => toggleActive(menu.client!, false) }
                  : { label: "Reactivate", onClick: () => toggleActive(menu.client!, true) },
              ]
            : []
        }
      />

      <Modal
        title={editing ? "Edit client" : "Add client"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={!name.trim()}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


