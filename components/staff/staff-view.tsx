"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Users as UsersIcon,
  Clock,
  Phone,
} from "lucide-react";
import type { StaffMember } from "@/lib/types";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/toast-context";

const STAFF_STATUS_STYLE: Record<StaffMember["status"], string> = {
  active: "bg-healthy/10 text-healthy",
  "on-leave": "bg-low/10 text-low",
  inactive: "bg-out/10 text-out",
};

export function StaffView() {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [warehouseNames, setWarehouseNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [staffRes, whRes] = await Promise.all([fetch("/api/staff"), fetch("/api/warehouses")]);
      if (!staffRes.ok) throw new Error("load failed");
      setStaff(await staffRes.json());
      if (whRes.ok) setWarehouseNames(((await whRes.json()) as { name: string }[]).map((w) => w.name));
    } catch {
      setError("Couldn't load staff data from the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = staff.filter((s) => s.status === "active").length;
  const onLeaveCount = staff.filter((s) => s.status === "on-leave").length;
  const inactiveCount = staff.filter((s) => s.status === "inactive").length;

  async function removeStaff(id: string) {
    const previous = staff;
    setStaff((prev) => prev.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      showToast({ title: "Staff member removed", variant: "info" });
    } catch {
      setStaff(previous);
      showToast({ title: "Couldn't remove staff member", variant: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Staff" value={staff.length} icon={UsersIcon} accent="primary" />
        <StatCard label="Active" value={activeCount} icon={UsersIcon} accent="healthy" />
        <StatCard label="On Leave" value={onLeaveCount} icon={UsersIcon} accent="low" />
        <StatCard label="Inactive" value={inactiveCount} icon={UsersIcon} accent="out" />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold">Staff</h2>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Add Staff
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-xs text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading staff…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((s) => {
            return (
              <Card key={s.id} className="p-4 transition-shadow hover:shadow-popover">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold text-white"
                      style={{ backgroundColor: s.avatarColor }}
                    >
                      {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted">{s.role}</p>
                    </div>
                  </div>
                  <button onClick={() => removeStaff(s.id)} className="rounded-md p-1.5 text-muted hover:bg-out/10 hover:text-out">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-3 space-y-1 text-xs text-muted">
                  <p className="truncate">{s.department}</p>
                  <p className="flex items-center gap-1.5">
                    <Clock size={11} /> Shift {s.shiftStart} – {s.shiftEnd}
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <Phone size={11} /> {s.phone}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STAFF_STATUS_STYLE[s.status])}>
                    {s.status.replace("-", " ")}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <AddStaffModal
          warehouseNames={warehouseNames}
          onClose={() => setModalOpen(false)}
          onCreated={(member) => {
            setStaff((prev) => [member, ...prev]);
            setModalOpen(false);
            showToast({ title: `${member.name} added to staff`, variant: "success" });
          }}
        />
      )}
    </div>
  );
}

function AddStaffModal({ warehouseNames, onClose, onCreated }: { warehouseNames: string[]; onClose: () => void; onCreated: (s: StaffMember) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState(warehouseNames[0] ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const PALETTE = ["#3B82F6", "#22C55E", "#F59E0B", "#F97316", "#22C1C3", "#8B5CF6", "#EC4899"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    setError(null);
    const payload = {
      id: `st-${Date.now()}`,
      name: name.trim(),
      role: role.trim(),
      department,
      phone,
      email,
      shiftStart,
      shiftEnd,
      status: "active" as const,
      joinDate: new Date().toISOString().slice(0, 10),
      avatarColor: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    };
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      const created = await res.json();
      onCreated(created);
    } catch {
      setError("Couldn't add this staff member — please try again.");
      showToast({ title: "Couldn't add staff member", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-xl2 border border-border bg-surface shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-sm font-semibold">Add Staff Member</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2">
            <X size={16} />
          </button>
        </div>
        <form className="space-y-3 p-5" onSubmit={submit}>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block text-xs font-medium text-muted">
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Role
              <input value={role} onChange={(e) => setRole(e.target.value)} required placeholder="e.g. Picker" className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Warehouse
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary">
                {warehouseNames.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted">
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Shift start
              <input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Shift end
              <input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Add staff member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
