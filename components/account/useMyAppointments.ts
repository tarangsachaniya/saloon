"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getMyAppointments, type MyAppointment } from "@/lib/api/account";
import { isApiError } from "@/lib/api/client";

/**
 * The customer's appointments, fetched once (lazily, when `enabled` first turns
 * true) and then patched in place after a cancel/reschedule - so a simple state
 * change never costs a refetch or a page reload.
 */
export function useMyAppointments(enabled: boolean) {
  const [appointments, setAppointments] = useState<MyAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fetchedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || fetchedFor.current === attempt) return;
    fetchedFor.current = attempt;
    // No abort on cleanup: toggling tabs re-runs this effect and must not kill an in-flight load.
    getMyAppointments()
      .then((rows) => {
        setError(null);
        setAppointments(rows);
      })
      .catch((e) => {
        // A 401 has already cleared the token; the page redirects to sign-in.
        if (isApiError(e) && e.isUnauthorized) return;
        setError(
          isApiError(e) && e.isNetworkError
            ? "We couldn't reach the server. Check your connection and try again."
            : "We couldn't load your appointments. Please try again.",
        );
      });
    // `attempt` re-runs the load on retry; `fetchedFor` stops tab toggles refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, attempt]);

  const replace = useCallback((next: MyAppointment) => {
    setAppointments((rows) => rows?.map((r) => (r.id === next.id ? next : r)) ?? rows);
  }, []);

  const reload = useCallback(() => {
    setError(null);
    setAppointments(null);
    setAttempt((n) => n + 1);
  }, []);

  return { appointments, error, isLoading: enabled && appointments === null && error === null, replace, reload };
}
