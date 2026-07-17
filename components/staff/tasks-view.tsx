"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, ListTodo, Play, ImagePlus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate, fileToCompressedDataUrl } from "@/lib/utils";
import { useToast } from "@/lib/toast-context";
import type { TaskWithAssignees, TaskStatus, TaskImage } from "@/lib/types";

const URGENCY_STYLE: Record<string, string> = {
  low: "bg-healthy/10 text-healthy",
  medium: "bg-primary/10 text-primary",
  high: "bg-low/10 text-low",
  urgent: "bg-out/10 text-out",
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  pending: "bg-surface2 text-muted",
  "in-progress": "bg-primary/10 text-primary",
  "partially-completed": "bg-low/10 text-low",
  completed: "bg-healthy/10 text-healthy",
  overdue: "bg-out/10 text-out",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  "partially-completed": "Partially Completed",
  completed: "Completed",
  overdue: "Overdue",
};

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
      <ListTodo className="text-muted" size={28} />
      <p className="text-sm font-medium">No tasks assigned yet</p>
      <p className="text-xs text-muted">When your admin assigns you a task, it'll show up here.</p>
    </Card>
  );
}

function TaskCard({ task, staffName, onChange }: { task: TaskWithAssignees; staffName: string; onChange: (updated: TaskWithAssignees) => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState(task.notes);
  const [checklist, setChecklist] = useState(task.checklist);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function patch(body: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated: TaskWithAssignees = await res.json();
      onChange(updated);
    } catch {
      showToast({ title: "Couldn't update task", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  function toggleItem(id: string) {
    const updated = checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c));
    setChecklist(updated);
    const doneCount = updated.filter((c) => c.done).length;
    const progress = updated.length ? Math.round((doneCount / updated.length) * 100) : task.progress;
    patch({ checklist: updated, progress }, "checklist");
  }

  function startTask() {
    patch({ status: "in-progress" }, "start");
  }

  function markPartial() {
    patch({ status: "partially-completed" }, "partial");
  }

  function markCompleted() {
    patch({ status: "completed", progress: 100 }, "complete");
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy("upload");
    try {
      const now = new Date().toISOString();
      const newImages: TaskImage[] = [];
      for (const file of Array.from(files)) {
        const url = await fileToCompressedDataUrl(file);
        newImages.push({ id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, url, uploadedBy: staffName, uploadedAt: now, kind: "completion" });
      }
      const completionImages = [...task.completionImages, ...newImages];
      await patch({ completionImages }, "upload");
      showToast({ title: `Uploaded ${newImages.length} image${newImages.length > 1 ? "s" : ""}`, variant: "success" });
    } catch {
      showToast({ title: "Couldn't upload image(s)", variant: "error" });
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const isOver = busy !== null;

  return (
    <Card className="p-5">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{task.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {task.category} · Due {task.dueDate ? formatDate(task.dueDate) : "no due date"} · {task.warehouse}
          </p>
          <p className="mt-0.5 text-xs text-muted">Assigned by {task.createdBy}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", URGENCY_STYLE[task.urgency])}>{task.urgency}</span>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[task.status])}>{STATUS_LABEL[task.status]}</span>
        </div>
      </div>

      {task.description && <p className="mb-1 text-sm text-muted">{task.description}</p>}
      {task.instructions && <p className="mb-3 rounded-lg bg-surface2/50 px-3 py-2 text-xs">{task.instructions}</p>}

      {task.referenceImage && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-muted">Reference image</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={task.referenceImage} alt="Reference" className="h-20 w-20 rounded-lg border border-border object-cover" />
        </div>
      )}

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span>Progress</span>
          <span>{task.progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${task.progress}%` }} />
        </div>
      </div>

      {checklist.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {checklist.map((item) => (
            <button
              key={item.id}
              disabled={isOver}
              onClick={() => toggleItem(item.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface2"
            >
              {item.done ? <CheckCircle2 size={16} className="shrink-0 text-healthy" /> : <Circle size={16} className="shrink-0 text-muted" />}
              <span className={cn(item.done && "text-muted line-through")}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-3">
        <p className="mb-1 text-xs font-medium text-muted">Completion Images</p>
        <div className="flex flex-wrap gap-2">
          {task.completionImages.map((img) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={img.id} src={img.url} alt="Completion" className="h-16 w-16 rounded-lg border border-border object-cover" />
          ))}
          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted hover:border-primary hover:text-text">
            {busy === "upload" ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            <span className="text-[9px]">Upload</span>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          </label>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {task.status === "pending" && (
          <Button size="sm" variant="primary" disabled={isOver} onClick={startTask}>
            {busy === "start" ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Start Task
          </Button>
        )}
        {(task.status === "in-progress" || task.status === "partially-completed" || task.status === "overdue") && (
          <>
            <Button size="sm" variant="secondary" disabled={isOver} onClick={markPartial}>
              {busy === "partial" ? <Loader2 size={13} className="animate-spin" /> : null} Mark Partially Completed
            </Button>
            <Button size="sm" variant="primary" disabled={isOver} onClick={markCompleted}>
              {busy === "complete" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Mark Fully Completed
            </Button>
          </>
        )}
        {task.status === "completed" && (
          <span className="flex items-center gap-1.5 text-xs text-healthy"><CheckCircle2 size={13} /> Completed{task.completedAt ? ` · ${formatDate(task.completedAt)}` : ""}</span>
        )}
      </div>

      <div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => patch({ notes }, "notes")}
          placeholder="Add a note about this task…"
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-surface2/50 px-3 py-2 text-xs outline-none focus:border-primary"
        />
      </div>
    </Card>
  );
}

const FILTERS = ["all", "pending", "in-progress", "partially-completed", "completed", "overdue"] as const;

export function StaffTasksView({
  initialTasks,
  staffName,
  staffId,
}: {
  initialTasks: TaskWithAssignees[];
  staffName: string;
  staffId: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [tasksData, setTasksData] = useState(initialTasks);

  useEffect(() => setTasksData(initialTasks), [initialTasks]);

  // Poll so a newly assigned task shows up on the staff dashboard/list without
  // the person needing to manually refresh the page.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tasks?staffId=${encodeURIComponent(staffId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setTasksData(data);
        }
      } catch {
        /* ignore transient errors */
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [staffId]);

  function handleChange(updated: TaskWithAssignees) {
    setTasksData((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    router.refresh();
  }

  const tasks = filter === "all" ? tasksData : tasksData.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              filter === f ? "bg-primary text-white" : "bg-surface2 text-muted hover:text-text"
            )}
          >
            {f === "all" ? "All" : f.replace("-", " ")}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} staffName={staffName} onChange={handleChange} />
          ))}
        </div>
      )}
    </div>
  );
}
