"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "./utils";

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLE: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "border-healthy/30 bg-surface text-healthy" },
  error: { icon: XCircle, className: "border-out/30 bg-surface text-out" },
  warning: { icon: AlertTriangle, className: "border-low/30 bg-surface text-low" },
  info: { icon: Info, className: "border-primary/30 bg-surface text-primary" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const showToast = useCallback(({ title, description, variant = "info" }: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const style = VARIANT_STYLE[t.variant];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-xl2 border px-4 py-3 shadow-popover animate-fade-in",
                style.className
              )}
            >
              <Icon size={17} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-muted">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="shrink-0 rounded-md p-0.5 text-muted hover:bg-surface2 hover:text-text">
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft rather than crashing the page if a component renders
    // outside the provider during a refactor.
    return { showToast: () => {} };
  }
  return ctx;
}
