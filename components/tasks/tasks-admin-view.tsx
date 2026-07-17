"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Trash2, ListTodo, AlertCircle, ImagePlus, Clock, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate, fileToCompressedDataUrl } from "@/lib/utils";
import { useToast } from "@/lib/toast-context";
import type {
  TaskWithAssignees,
  TaskCategory,
  TaskUrgency,
  TaskPriority,
  TaskStatus,
  StaffMember,
  ChecklistItem,
} from "@/lib/types";

const CATEGORY_OPTIONS: TaskCategory[] = [
  "Inventory Update",
  "Barcode Scanning",
  "Stock Verification",
  "Product Restocking",
  "Warehouse Inspection",
  "Shelf Arrangement",
  "Expiry Check",
  "Product Audit",
  "Custom",
];

const URGENCY_STYLE: Record<TaskUrgency, string> = {
  low: "bg-healthy/10 text-healthy",
  medium: "bg-primary/10 text-primary",
  high: "bg-low/10 text-low",
  urgent: "bg-out/10 text-out",
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  normal: "bg-surface2 text-muted",
  high: "bg-low/10 text-low",
  critical: "bg-out/10 text-out",
};

// "overdue" is intentionally excluded — it's derived from the due date, never set directly.
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

function CreateTaskModal({
  staff,
  warehouses,
  onClose,
  onCreated,
}: {
  staff: StaffMember[];
  warehouses: string[];
  onClose: () => void;
  onCreated: (t: TaskWithAssignees) => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>("Inventory Update");
  const [urgency, setUrgency] = useState<TaskUrgency>("medium");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [instructions, setInstructions] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [warehouse, setWarehouse] = useState(warehouses[0] ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [saving, setSaving] = useState<"assign" | "draft" | null>(null);
  const [error, setError] = useState("");

  function addChecklistItem() {
    if (!checklistDraft.trim()) return;
    setChecklist((c) => [...c, { id: `c-${Date.now()}`, label: checklistDraft.trim(), done: false }]);
    setChecklistDraft("");
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleReferenceImage(file: File | undefined) {
    if (!file) return;
    setImageBusy(true);
    try {
      setReferenceImage(await fileToCompressedDataUrl(file));
    } catch {
      showToast({ title: "Couldn't process that image", variant: "error" });
    } finally {
      setImageBusy(false);
    }
  }

  async function submit(mode: "assign" | "draft") {
    setError("");
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (mode === "assign" && assigneeIds.length === 0) {
      setError("Pick at least one staff member to assign this to.");
      return;
    }
    setSaving(mode);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          urgency,
          priority,
          dueDate,
          estimatedDuration,
          instructions,
          referenceImage,
          warehouse,
          assigneeIds: mode === "assign" ? assigneeIds : [],
          checklist,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      showToast({ title: mode === "assign" ? "Task created and assigned" : "Draft saved", variant: "success" });
      onCreated(created);
    } catch {
      setError("Couldn't save the task. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl2 border border-border bg-surface shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-sm font-semibold">Create Task</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2">
            <X size={16} />
          </button>
        </div>
        <form
          className="space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit("assign");
          }}
        >
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <label className="block text-xs font-medium text-muted">
            Task Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs font-medium text-muted">
            Task Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full resize-none rounded-lg border border-border bg-surface2 px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>

          <label className="block text-xs font-medium text-muted">
            Task Category
            <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-2 text-sm outline-none focus:border-primary">
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-muted">
              Urgency
              <select value={urgency} onChange={(e) => setUrgency(e.target.value as TaskUrgency)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-2 text-sm outline-none focus:border-primary">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-muted">
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-2 text-sm outline-none focus:border-primary">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-muted">
              Due Date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-2 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Warehouse
              <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-2 text-sm outline-none focus:border-primary">
                {warehouses.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-muted">
            Estimated Duration <span className="text-muted/70">(optional)</span>
            <input value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} placeholder="e.g. 2 hours" className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
          </label>

          <label className="block text-xs font-medium text-muted">
            Instructions <span className="text-muted/70">(optional)</span>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="mt-1 w-full resize-none rounded-lg border border-border bg-surface2 px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>

          <div>
            <p className="mb-1 text-xs font-medium text-muted">Reference Image <span className="text-muted/70">(optional)</span></p>
            {referenceImage ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={referenceImage} alt="Reference" className="h-20 w-20 rounded-lg border border-border object-cover" />
                <button type="button" onClick={() => setReferenceImage(null)} className="absolute -right-1.5 -top-1.5 rounded-full bg-out p-0.5 text-white">
                  <X size={10} />
                </button>
              </div>
            ) : (
              <label className="flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-xs text-muted hover:border-primary hover:text-text">
                {imageBusy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                Attach image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceImage(e.target.files?.[0])} />
              </label>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted">Assign To</p>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {staff
                .filter((s) => s.department === warehouse)
                .map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface2">
                    <input type="checkbox" checked={assigneeIds.includes(s.id)} onChange={() => toggleAssignee(s.id)} />
                    {s.name} <span className="text-xs text-muted">· {s.role}</span>
                  </label>
                ))}
              {staff.filter((s) => s.department === warehouse).length === 0 && (
                <p className="px-2 py-1 text-xs text-muted">No staff assigned to this warehouse yet.</p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted">Checklist <span className="text-muted/70">(optional)</span></p>
            <div className="flex gap-2">
              <input
                value={checklistDraft}
                onChange={(e) => setChecklistDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Add a checklist item and press Enter"
                className="h-9 flex-1 rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary"
              />
              <Button type="button" variant="secondary" onClick={addChecklistItem}>
                Add
              </Button>
            </div>
            {checklist.length > 0 && (
              <ul className="mt-2 space-y-1">
                {checklist.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-md bg-surface2/50 px-2 py-1 text-xs">
                    {c.label}
                    <button type="button" onClick={() => setChecklist((prev) => prev.filter((x) => x.id !== c.id))} className="text-muted hover:text-out">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving !== null}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={() => submit("draft")} disabled={saving !== null}>
              {saving === "draft" ? <Loader2 size={14} className="animate-spin" /> : null} Save Draft
            </Button>
            <Button type="submit" variant="primary" disabled={saving !== null}>
              {saving === "assign" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Assign Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailModal({ task, onClose }: { task: TaskWithAssignees; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl2 border border-border bg-surface shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-sm font-semibold">{task.title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[task.status])}>{STATUS_LABEL[task.status]}</span>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", URGENCY_STYLE[task.urgency])}>{task.urgency} urgency</span>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", PRIORITY_STYLE[task.priority])}>{task.priority} priority</span>
            <span className="rounded-full bg-surface2 px-2.5 py-1 text-xs font-medium">{task.category}</span>
          </div>

          {task.description && <p className="text-muted">{task.description}</p>}
          {task.instructions && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Instructions</p>
              <p className="rounded-lg bg-surface2/50 px-3 py-2 text-xs">{task.instructions}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted">Due date</p>
              <p className="font-medium">{task.dueDate ? formatDate(task.dueDate) : "—"}</p>
            </div>
            <div>
              <p className="text-muted">Estimated duration</p>
              <p className="font-medium">{task.estimatedDuration || "—"}</p>
            </div>
            <div>
              <p className="text-muted">Warehouse</p>
              <p className="font-medium">{task.warehouse}</p>
            </div>
            <div>
              <p className="text-muted">Completion time</p>
              <p className="font-medium">{task.completedAt ? formatDate(task.completedAt) : "—"}</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted">Assigned Staff</p>
            <div className="flex flex-wrap gap-2">
              {task.assignees.length === 0 && <span className="text-xs text-muted">Unassigned (draft)</span>}
              {task.assignees.map((a) => (
                <span key={a.id} className="flex items-center gap-1.5 rounded-full bg-surface2 px-2.5 py-1 text-xs">
                  <User size={11} /> {a.name}
                </span>
              ))}
            </div>
          </div>

          {task.referenceImage && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Reference Image</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={task.referenceImage} alt="Reference" className="h-24 w-24 rounded-lg border border-border object-cover" />
            </div>
          )}

          {task.completionImages.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted">Uploaded Completion Images</p>
              <div className="flex flex-wrap gap-2">
                {task.completionImages.map((img) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noreferrer" title={`${img.uploadedBy} · ${formatDate(img.uploadedAt)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="Completion" className="h-20 w-20 rounded-lg border border-border object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-medium text-muted">Task Activity Timeline</p>
            <ul className="space-y-2">
              {task.activity.slice().reverse().map((a) => (
                <li key={a.id} className="flex gap-2 text-xs">
                  <Clock size={12} className="mt-0.5 shrink-0 text-muted" />
                  <div>
                    <p>{a.message}</p>
                    <p className="text-muted">{formatDate(a.at)}</p>
                  </div>
                </li>
              ))}
              {task.activity.length === 0 && <li className="text-xs text-muted">No activity yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onChange, onOpen }: { task: TaskWithAssignees; onChange: () => void; onOpen: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function remove(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete task "${task.title}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast({ title: "Task deleted", variant: "success" });
      onChange();
    } catch {
      showToast({ title: "Couldn't delete task", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr onClick={onOpen} className="cursor-pointer border-t border-border hover:bg-surface2/50">
      <td className="px-4 py-3">
        <p className="text-sm font-medium">{task.title}</p>
        <p className="text-xs text-muted">{task.category} · {task.warehouse}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex -space-x-1.5">
          {task.assignees.map((a) => (
            <span
              key={a.id}
              title={a.name}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[9px] font-semibold text-white"
              style={{ backgroundColor: a.avatarColor }}
            >
              {a.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </span>
          ))}
          {task.assignees.length === 0 && <span className="text-xs text-muted">Draft</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", URGENCY_STYLE[task.urgency])}>{task.urgency}</span>
      </td>
      <td className="px-4 py-3 text-xs">{task.dueDate ? formatDate(task.dueDate) : "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface2">
            <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
          </div>
          <span className="text-xs text-muted">{task.progress}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[task.status])}>{STATUS_LABEL[task.status]}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <button disabled={busy} onClick={remove} className="rounded-md p-1.5 text-muted hover:bg-out/10 hover:text-out">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </td>
    </tr>
  );
}

const FILTERS = ["all", "pending", "in-progress", "partially-completed", "completed", "overdue", "urgent"] as const;
type Filter = (typeof FILTERS)[number];

export function TasksAdminView({
  initialTasks,
  staff,
  warehouses,
}: {
  initialTasks: TaskWithAssignees[];
  staff: StaffMember[];
  warehouses: string[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<TaskWithAssignees | null>(null);
  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [tasksData, setTasksData] = useState(initialTasks);

  useEffect(() => setTasksData(initialTasks), [initialTasks]);

  // Light polling so completions/uploads staff make show up here without a manual refresh.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/tasks");
        if (res.ok) setTasksData(await res.json());
      } catch {
        /* ignore transient errors */
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const tasks = useMemo(() => {
    if (statusFilter === "all") return tasksData;
    if (statusFilter === "urgent") return tasksData.filter((t) => t.urgency === "urgent");
    return tasksData.filter((t) => t.status === statusFilter);
  }, [tasksData, statusFilter]);

  const counts = {
    total: tasksData.length,
    completed: tasksData.filter((t) => t.status === "completed").length,
    pending: tasksData.filter((t) => t.status !== "completed").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                statusFilter === f ? "bg-primary text-white" : "bg-surface2 text-muted hover:text-text"
              )}
            >
              {f === "all" ? `All (${counts.total})` : f.replace("-", " ")}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Create Task
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-surface2">
              <tr className="text-xs text-muted">
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Assignees</th>
                <th className="px-4 py-3 font-medium">Urgency</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <ListTodo className="mx-auto mb-2 text-muted" size={26} />
                    <p className="text-sm font-medium">No tasks yet</p>
                    <p className="text-xs text-muted">Create your first task to get staff moving.</p>
                  </td>
                </tr>
              )}
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} onChange={() => router.refresh()} onOpen={() => setDetailTask(t)} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modalOpen && (
        <CreateTaskModal
          staff={staff}
          warehouses={warehouses}
          onClose={() => setModalOpen(false)}
          onCreated={(t) => {
            setModalOpen(false);
            setTasksData((prev) => [t, ...prev]);
            router.refresh();
          }}
        />
      )}

      {detailTask && <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />}
    </div>
  );
}
