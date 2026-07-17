"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Mail, ShieldCheck, UserCircle2 } from "lucide-react";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function ProfileView() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading profile…</p>;
  if (!user) return <p className="text-sm text-muted">Couldn't load your profile.</p>;

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-lg space-y-4">
      <Card className="flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary">
          {initials}
        </div>
        <div>
          <p className="font-display text-base font-semibold">{user.name}</p>
          <p className="text-xs text-muted">{user.role}</p>
        </div>
      </Card>

      <Card className="divide-y divide-border p-0">
        <div className="flex items-center gap-3 px-5 py-4">
          <Mail size={16} className="text-muted" />
          <div>
            <p className="text-xs text-muted">Email</p>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <ShieldCheck size={16} className="text-muted" />
          <div>
            <p className="text-xs text-muted">Role</p>
            <p className="text-sm font-medium">{user.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <UserCircle2 size={16} className="text-muted" />
          <div>
            <p className="text-xs text-muted">Account ID</p>
            <p className="font-mono text-xs text-muted">{user.id}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
