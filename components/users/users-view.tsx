"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Loader2, AlertCircle } from "lucide-react";
import { warehouses } from "@/lib/mock-data";
import type { AppUser, UserRole } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/lib/toast-context";

const STATUS_STYLE = {
  active: "bg-healthy/10 text-healthy",
  invited: "bg-low/10 text-low",
  suspended: "bg-out/10 text-out",
};

const ROLES: UserRole[] = ["Administrator", "Inventory Manager", "Warehouse Staff"];

export function UsersView() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<AppUser[]>;
      })
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load users from the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function invite(u: Omit<AppUser, "id" | "status" | "lastActive">) {
    setSaving(true);
    const payload: AppUser = { ...u, id: `u-${Date.now()}`, status: "invited", lastActive: "—" };
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      const created = await res.json();
      setUsers((prev) => [created, ...prev]);
      setOpen(false);
      showToast({ title: `Invite sent to ${created.name}`, variant: "success" });
    } catch {
      showToast({ title: "Couldn't send invite", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const previous = users;
    setUsers((prev) => prev.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      showToast({ title: "User removed", variant: "info" });
    } catch {
      setUsers(previous);
      showToast({ title: "Couldn't remove user", variant: "error" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus size={15} /> Create User
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface2">
              <tr className="text-xs text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium">Last Active</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Loading users…
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-surface2/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{u.role}</td>
                    <td className="px-4 py-3 text-xs">{u.warehouse}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(u.lastActive)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLE[u.status])}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(u.id)} className="rounded-md p-1.5 text-muted hover:bg-out/10 hover:text-out">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {open && <InviteModal onClose={() => setOpen(false)} onInvite={invite} saving={saving} />}
    </div>
  );
}

function InviteModal({
  onClose,
  onInvite,
  saving,
}: {
  onClose: () => void;
  onInvite: (u: Omit<AppUser, "id" | "status" | "lastActive">) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("Warehouse Staff");
  const [warehouse, setWarehouse] = useState(warehouses[0].name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-xl2 border border-border bg-surface shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-sm font-semibold">Create User</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2">
            <X size={16} />
          </button>
        </div>
        <form
          className="space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name || !email) return;
            onInvite({ name, email, role, warehouse });
          }}
        >
          <label className="block text-xs font-medium text-muted">
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs font-medium text-muted">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs font-medium text-muted">
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary">
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-muted">
            Assigned warehouse
            <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary">
              {warehouses.map((w) => (
                <option key={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Send invite
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
