import { cn } from "@/lib/utils";

export function AttendanceRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex animate-pulse items-center gap-4 rounded-xl2 border border-border bg-surface p-4", className)}>
      <div className="h-8 w-8 shrink-0 rounded-full bg-surface2" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-surface2" />
        <div className="h-2.5 w-1/4 rounded bg-surface2" />
      </div>
      <div className="h-5 w-16 rounded-full bg-surface2" />
    </div>
  );
}

export function AttendanceStatSkeleton() {
  return (
    <div className="animate-pulse rounded-xl2 border border-border bg-surface p-5">
      <div className="h-3 w-20 rounded bg-surface2" />
      <div className="mt-3 h-6 w-12 rounded bg-surface2" />
    </div>
  );
}
