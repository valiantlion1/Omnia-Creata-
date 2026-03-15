"use client";

import { cn } from "@/lib/cn";
import { createContext, useContext, useState, type ReactNode } from "react";

interface ToastContextValue {
  notify: (message: string) => void;
}

interface ToastRecord {
  id: string;
  message: string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  function notify(message: string) {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  }

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "rounded-full border border-[color:rgba(212,167,91,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-glow)] backdrop-blur-xl"
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
