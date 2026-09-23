"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Transient feedback for admin actions ("Appointment confirmed", "Couldn't save
 * that").
 *
 * Deliberately local state + a viewport component rather than a global provider:
 * every admin page owns exactly one list of toasts, nothing outside a page ever
 * needs to raise one, and a context would add a provider to the tree for no
 * reader. `push()` returns the id so a caller can dismiss early if it wants to.
 *
 * Errors do NOT auto-dismiss — an admin who looked away must still be able to
 * read why a save failed.
 */

export type ToastTone = "success" | "danger" | "info";

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

const AUTO_DISMISS_MS = 4500;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, text: string) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((current) => [...current, { id, tone, text }]);
      if (tone !== "danger") {
        const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  // Clear pending timers if the page unmounts mid-toast.
  const timersRef = timers;
  useEffect(() => {
    const map = timersRef.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, [timersRef]);

  return { toasts, push, dismiss };
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-secondary-200 bg-secondary-50 text-secondary-700",
  danger: "border-red-200 bg-red-50 text-danger",
  info: "border-primary-200 bg-primary-50 text-primary-700",
};

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      // `aria-live` so a screen reader announces the outcome of an action that
      // produced no visible focus change.
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed z-40 flex flex-col gap-2",
        // Above the mobile tab bar; bottom-right on desktop.
        "inset-x-4 bottom-[5.5rem] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-80",
      )}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "danger" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-card border px-4 py-3 shadow-card-hover",
            "animate-slide-down",
            TONE_STYLES[toast.tone],
          )}
        >
          <p className="min-w-0 flex-1 text-sm font-semibold">{toast.text}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="-m-1 shrink-0 rounded p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
