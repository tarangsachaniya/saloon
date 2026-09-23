"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";
import { isApiError } from "@/lib/api";

/**
 * Data-loading hook for the admin screens.
 *
 * WHY NOT `components/booking/useAsync.ts`: that hook blanks `data` to null at
 * the start of every load, which is exactly right for a wizard step (each step
 * shows genuinely different data) and exactly wrong here. An admin list is
 * re-read after every mutation — confirm an appointment, save a barber, change
 * a filter — and blanking would flash the whole table to a spinner each time,
 * losing scroll position and making a 100ms refresh feel like a page load.
 *
 * So this keeps the previous data on screen while a refresh is in flight and
 * exposes `isRefreshing` separately from the first-load `isLoading`. The abort
 * and stale-response protections are the same: a response for a filter the
 * admin has already navigated away from can never overwrite fresher state.
 */

export interface AdminDataState<T> {
  data: T | null;
  error: string | null;
  /** True only for the first load (no data on screen yet). */
  isLoading: boolean;
  /** True for a re-read while previous data is still displayed. */
  isRefreshing: boolean;
  /** Re-run the loader, keeping the current data visible. */
  refresh: () => void;
  /**
   * Replace the cached data locally without a round trip — for applying a
   * mutation's own response to one row instead of re-reading the whole list.
   */
  setData: (updater: (current: T | null) => T | null) => void;
}

export function toErrorMessage(error: unknown): string {
  // `ApiError.message` already prefers the API's own message, which is written
  // for humans ("Cannot change status from COMPLETED to ARRIVED.").
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export function useAdminData<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): AdminDataState<T> {
  // The latest loader lives in a ref so an inline arrow at the call site does
  // not re-trigger the effect on every render; `deps` alone decides that.
  const loadRef = useRef(load);
  // Whether anything is already on screen. Read inside the load effect only, so
  // it never has to be a dependency (which would make the effect self-trigger).
  const hasDataRef = useRef(false);

  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /*
   * Both refs are synced in an effect rather than assigned during render.
   * Writing a ref mid-render is what `react-hooks/refs` flags, and the rule is
   * right: with concurrent rendering a render can be thrown away, leaving the
   * ref holding a value from a commit that never happened.
   *
   * This effect is declared BEFORE the loading effect on purpose — React fires
   * passive effects in hook-declaration order within a commit, so by the time
   * the loader runs, both refs already describe the render that scheduled it.
   */
  useEffect(() => {
    loadRef.current = load;
    hasDataRef.current = data !== null;
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (hasDataRef.current) setIsRefreshing(true);
    else setIsLoading(true);

    loadRef.current(controller.signal).then(
      (result) => {
        if (!active) return;
        setDataState(result);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
      },
      (cause: unknown) => {
        if (!active) return;
        // Our own cancellation, never a failure to show the admin.
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(toErrorMessage(cause));
        setIsLoading(false);
        setIsRefreshing(false);
      },
    );

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  const setData = useCallback(
    (updater: (current: T | null) => T | null) => {
      setDataState((current) => updater(current));
    },
    [],
  );

  return { data, error, isLoading, isRefreshing, refresh, setData };
}
