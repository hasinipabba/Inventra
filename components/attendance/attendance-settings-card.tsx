"use client";

import { useState } from "react";
import { Loader2, Save, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";

export function AttendanceSettingsCard({ initialOfficeStartTime }: { initialOfficeStartTime: string }) {
  const { showToast } = useToast();
  const [officeStartTime, setOfficeStartTime] = useState(initialOfficeStartTime);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officeStartTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      showToast({ title: "Office start time updated", variant: "success" });
    } catch (err: any) {
      showToast({ title: "Couldn't save settings", description: err?.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Settings2 size={16} />
        </div>
        <div>
          <p className="text-sm font-medium">Office Start Time</p>
          <p className="text-xs text-muted">Clock-ins after this time are marked Late</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={officeStartTime}
          onChange={(e) => setOfficeStartTime(e.target.value)}
          className="rounded-lg border border-border bg-surface2/50 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
        <Button variant="primary" size="sm" disabled={saving} onClick={save}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
        </Button>
      </div>
    </Card>
  );
}
