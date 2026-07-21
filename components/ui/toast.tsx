"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastInput = Omit<Toast, "id">;

const ToastContext = createContext<{ showToast: (toast: ToastInput) => void } | null>(null);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const styles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-red-200 bg-red-50 text-red-950",
  info: "border-blue-200 bg-blue-50 text-blue-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }].slice(-4));
    window.setTimeout(() => dismissToast(id), 4200);
  }, [dismissToast]);

  useEffect(() => {
    function handleActionToast(event: Event) {
      const detail = (event as CustomEvent<ToastInput>).detail;
      if (detail?.message) showToast(detail);
    }

    window.addEventListener("schoolnest:toast", handleActionToast);
    return () => window.removeEventListener("schoolnest:toast", handleActionToast);
  }, [showToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-3" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <div key={toast.id} className={cn("flex items-start gap-3 rounded-lg border p-4 shadow-lg", styles[toast.type])}>
              <Icon className="mt-0.5 size-5 shrink-0" />
              <p className="min-w-0 flex-1 text-sm font-medium leading-6">{toast.message}</p>
              <button type="button" className="rounded-md p-1 hover:bg-black/5" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}>
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
