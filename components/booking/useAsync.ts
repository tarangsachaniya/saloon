"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { isApiError } from "@/lib/api";

/**
 * Minimal fetch-on-mount hook for the wizard's three data-loading steps
 * (services, barbers, availability).
 *
 * Exists so that every step gets the same loading/error/retry behaviour without
 * triplicating the same `useEffect` + `AbortController` dance — the wizard must
 * never show a blank broken screen when a fetch fails.
 *
 * The request is aborted on unmount and whenever `deps` change, so a slow
 * response for a date the customer has already navigated away from can never
 * overwrite fresher state.
 */

export interface AsyncState<T> {
  data: T | null;
  /** Human-readable failure message, or null. */
  error: string | null;
  isLoading: boolean;
  /** Re-run the loader (the retry affordance on every error state). */
  reload: () => void;
}

function toMessage(error: unknown): string {
  // `ApiError.message` already prefers the API's own `message` field, which is
  // written for humans ("Cannot book a date in the past.").
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export function useAsync<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): AsyncState<T> {
  // Hold the latest loader in a ref so an inline arrow function at the call
  // site does not re-trigger the effect on every render — `deps` alone decides
  // when to refetch.
  const loadRef = useRef(load);
  loadRef.current = load;

  const [state, setState] = useState<Omit<AsyncState<T>, "reload">>({
    data: null,
    error: null,
    isLoading: true,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState({ data: null, error: null, isLoading: true });

    loadRef.current(controller.signal).then(
      (data) => {
        if (active) setState({ data, error: null, isLoading: false });
      },
      (error: unknown) => {
        if (!active) return;
        // An abort is our own cancellation, never a failure to show the user.
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ data: null, error: toMessage(error), isLoading: false });
      },
    );

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, reload };
}
