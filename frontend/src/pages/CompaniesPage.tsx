import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { ContextMenu } from "../components/ContextMenu";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { api } from "../lib/api";

type Company = { id: string; name: string; phone?: string; active: boolean };

export function CompaniesPage() {
  const [items, setItems] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; company: Company | null }>({
    open: false,
    x: 0,
    y: 0,
    company: null,
  });

  const activeCount = useMemo(() => items.filter((i) => i.active).length, [items]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .companiesList()
      .then((d) => {
        if (alive) setItems(d);
      })
      .catch(() => {
        if (alive) setError("Could not load companies.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    const d = await api.companiesList();
    setItems(d);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setPhone("");
    setModalOpen(true);
  }

  function openEdit(c: Company) {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone || "");
    setModalOpen(true);
  }

  async function submit() {
    setError(null);
    try {
      const payload = { name, phone: phone || undefined };
      if (editing) {
        await api.companyUpdate(editing.id, payload);
      } else {
        await api.companyCreate(payload);
      }
      setModalOpen(false);
      await refresh();
    } catch {
      setError("Could not save the company.");
    }
  }

  async function remove(c: Company) {
    if (!confirm(`Delete company "${c.name}"?`)) return;
    try {
      await api.companyDelete(c.id);
      await refresh();
    } catch (e: any) {
      if (e?.status === 409) setError("Cannot delete: this company has linked trips.");
      else setError("Could not delete the company.");
    }
  }

  async function toggleActive(c: Company, active: boolean) {
    try {
      await api.companySetActive(c.id, active);
      await refresh();
    } catch {
      setError("Could not update company status.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Companies</div>
          <div className="text-sm text-slate-600">
            Partner companies (Name and Phone). Active: {activeCount}/{items.length}
          </div>
        </div>
        <Button onClick={openCreate}>Add company</Button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium md:grid">
          <div className="col-span-5">Name</div>
          <div className="col-span-4">Phone</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((c) => (
            <div
              key={c.id}
              className="p-3"
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ open: true, x: e.clientX, y: e.clientY, company: c });
              }}
              title="Right-click to deactivate/reactivate"
            >
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                <div className="md:col-span-5">
                  <div className="text-slate-600 md:hidden">Name</div>
                  <div className="font-medium">{c.name}</div>
                </div>
                <div className="md:col-span-4">
                  <div className="text-slate-600 md:hidden">Phone</div>
                  <div className="text-slate-700">{c.phone || "—"}</div>
                </div>
                <div className="md:col-span-1">
                  <div className="text-slate-600 md:hidden">Status</div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      c.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                    }`}
                  >
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
          {!loading && items.length === 0 ? <div className="p-3 text-sm text-slate-600">No companies yet.</div> : null}
        </div>
      </div>

      <ContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        onClose={() => setMenu((m) => ({ ...m, open: false }))}
        items={
          menu.company
            ? [
                menu.company.active
                  ? { label: "Deactivate", onClick: () => toggleActive(menu.company!, false) }
                  : { label: "Reactivate", onClick: () => toggleActive(menu.company!, true) },
              ]
            : []
        }
      />

      <Modal title={editing ? "Edit company" : "Add company"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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


