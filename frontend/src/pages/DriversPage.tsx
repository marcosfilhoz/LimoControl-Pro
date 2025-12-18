import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { ContextMenu } from "../components/ContextMenu";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { api } from "../lib/api";

type Driver = { id: string; name: string; phone?: string; license?: string; active: boolean };

export function DriversPage() {
  const [items, setItems] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");

  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; driver: Driver | null }>({
    open: false,
    x: 0,
    y: 0,
    driver: null,
  });

  const activeCount = useMemo(() => items.filter((i) => i.active).length, [items]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.driversList()
      .then((d) => {
        if (alive) setItems(d);
      })
      .catch(() => {
        if (alive) setError("Could not load drivers.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    const d = await api.driversList();
    setItems(d);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setPhone("");
    setLicense("");
    setModalOpen(true);
  }

  function openEdit(d: Driver) {
    setEditing(d);
    setName(d.name);
    setPhone(d.phone || "");
    setLicense(d.license || "");
    setModalOpen(true);
  }

  async function submit() {
    setError(null);
    try {
      const payload = { name, phone: phone || undefined, license: license || undefined };
      if (editing) {
        await api.driverUpdate(editing.id, payload);
      } else {
        await api.driverCreate(payload);
      }
      setModalOpen(false);
      await refresh();
    } catch {
      setError("Could not save the driver.");
    }
  }

  async function remove(d: Driver) {
    if (!confirm(`Delete driver "${d.name}"?`)) return;
    try {
      await api.driverDelete(d.id);
      await refresh();
    } catch (e: any) {
      if (e?.status === 409) setError("Cannot delete: this driver has linked trips.");
      else setError("Could not delete the driver.");
    }
  }

  async function toggleActive(d: Driver, active: boolean) {
    try {
      await api.driverSetActive(d.id, active);
      await refresh();
    } catch {
      setError("Could not update driver status.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Drivers</div>
          <div className="text-sm text-slate-600">
            Create, edit, delete, and deactivate (right-click). Active: {activeCount}/{items.length}
          </div>
        </div>
        <Button onClick={openCreate}>Add driver</Button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium md:grid">
          <div className="col-span-4">Name</div>
          <div className="col-span-3">Phone</div>
          <div className="col-span-2">Driver License</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((d) => (
            <div
              key={d.id}
              className="p-3"
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ open: true, x: e.clientX, y: e.clientY, driver: d });
              }}
              title="Right-click to deactivate/reactivate"
            >
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                <div className="md:col-span-4">
                  <div className="text-slate-600 md:hidden">Name</div>
                  <div className="font-medium">{d.name}</div>
                </div>
                <div className="md:col-span-3">
                  <div className="text-slate-600 md:hidden">Phone</div>
                  <div className="text-slate-700">{d.phone || "—"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Driver license</div>
                  <div className="text-slate-700">{d.license || "—"}</div>
                </div>
                <div className="md:col-span-1">
                  <div className="text-slate-600 md:hidden">Status</div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      d.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {d.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="md:col-span-2 md:text-right">
                  <div className="flex flex-nowrap items-center gap-1 md:justify-end">
                    <Button className="px-2 py-1" variant="ghost" onClick={() => openEdit(d)}>
                      Edit
                    </Button>
                    <Button className="px-2 py-1" variant="ghost" onClick={() => remove(d)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading ? <div className="p-3 text-sm text-slate-600">Loading...</div> : null}
          {!loading && items.length === 0 ? <div className="p-3 text-sm text-slate-600">No drivers yet.</div> : null}
        </div>
      </div>

      <ContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        onClose={() => setMenu((m) => ({ ...m, open: false }))}
        items={
          menu.driver
            ? [
                menu.driver.active
                  ? { label: "Deactivate", onClick: () => toggleActive(menu.driver!, false) }
                  : { label: "Reactivate", onClick: () => toggleActive(menu.driver!, true) },
              ]
            : []
        }
      />

      <Modal
        title={editing ? "Edit driver" : "Add driver"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Driver license" value={license} onChange={(e) => setLicense(e.target.value)} />
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


