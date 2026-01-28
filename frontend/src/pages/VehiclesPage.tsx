import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { ContextMenu } from "../components/ContextMenu";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { api } from "../lib/api";

type Vehicle = {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  color?: string;
  plate?: string;
  active: boolean;
};


export function VehiclesPage() {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");

  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; vehicle: Vehicle | null }>({
    open: false,
    x: 0,
    y: 0,
    vehicle: null,
  });

  const activeCount = useMemo(() => items.filter((i) => i.active).length, [items]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.vehiclesList()
      .then((v) => {
        if (!alive) return;
        setItems(v);
      })
      .catch(() => {
        if (alive) setError("Could not load vehicles.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    const v = await api.vehiclesList();
    setItems(v);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setBrand("");
    setModel("");
    setColor("");
    setPlate("");
    setModalOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditing(v);
    setName(v.name);
    setBrand(v.brand || "");
    setModel(v.model || "");
    setColor(v.color || "");
    setPlate(v.plate || "");
    setModalOpen(true);
  }

  async function submit() {
    setError(null);
    try {
      const payload = {
        name,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        color: color.trim() || undefined,
        plate: plate.trim() || undefined,
      };
      if (editing) {
        await api.vehicleUpdate(editing.id, payload);
      } else {
        await api.vehicleCreate(payload);
      }
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      if (e?.status === 400) setError("Check the fields and try again.");
      else setError("Could not save the vehicle.");
    }
  }

  async function remove(v: Vehicle) {
    if (!confirm(`Delete vehicle "${v.name}"?`)) return;
    try {
      await api.vehicleDelete(v.id);
      await refresh();
    } catch (e: any) {
      if (e?.status === 409) setError("Cannot delete: this vehicle has linked trips.");
      else setError("Could not delete the vehicle.");
    }
  }

  async function toggleActive(v: Vehicle, active: boolean) {
    try {
      await api.vehicleSetActive(v.id, active);
      await refresh();
    } catch {
      setError("Could not update vehicle status.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold">Vehicles</div>
          <div className="text-sm text-slate-600">
            Manage fleet vehicles. Active: {activeCount}/{items.length}
          </div>
        </div>
        <Button onClick={openCreate}>Add vehicle</Button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-sm font-medium md:grid">
          <div className="col-span-2">Vehicle</div>
          <div className="col-span-2">Brand</div>
          <div className="col-span-2">Model</div>
          <div className="col-span-2">Color</div>
          <div className="col-span-2">Plate</div>
          <div className="col-span-2">Status</div>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((v) => (
            <div
              key={v.id}
              className="p-3"
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ open: true, x: e.clientX, y: e.clientY, vehicle: v });
              }}
              title="Right-click to deactivate/reactivate"
            >
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-12 md:items-center">
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Vehicle</div>
                  <div className="font-medium">{v.name}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Brand</div>
                  <div className="text-slate-700">{v.brand || "—"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Model</div>
                  <div className="text-slate-700">{v.model || "—"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Color</div>
                  <div className="text-slate-700">{v.color || "—"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Plate</div>
                  <div className="text-slate-700">{v.plate || "—"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-600 md:hidden">Status</div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      v.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {v.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="md:col-span-12 md:text-right">
                  <div className="mt-2 flex flex-nowrap items-center gap-1 md:justify-end">
                    <Button className="px-2 py-1" variant="ghost" onClick={() => openEdit(v)}>
                      Edit
                    </Button>
                    <Button className="px-2 py-1" variant="ghost" onClick={() => remove(v)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading ? <div className="p-3 text-sm text-slate-600">Loading...</div> : null}
          {!loading && items.length === 0 ? <div className="p-3 text-sm text-slate-600">No vehicles yet.</div> : null}
        </div>
      </div>

      <ContextMenu
        open={menu.open}
        x={menu.x}
        y={menu.y}
        onClose={() => setMenu((m) => ({ ...m, open: false }))}
        items={
          menu.vehicle
            ? [
                menu.vehicle.active
                  ? { label: "Deactivate", onClick: () => toggleActive(menu.vehicle!, false) }
                  : { label: "Reactivate", onClick: () => toggleActive(menu.vehicle!, true) },
              ]
            : []
        }
      />

      <Modal title={editing ? "Edit vehicle" : "Add vehicle"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <Input label="Vehicle" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <Input label="Model" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} />
            <Input label="Plate" value={plate} onChange={(e) => setPlate(e.target.value)} />
          </div>
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
