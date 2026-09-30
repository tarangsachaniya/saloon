"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import type { ZodType } from "zod";

import { fieldErrors } from "@/lib/validation/booking";

/**
 * Tiny form state for the auth screens: values, per-field errors and a
 * "touched" set, validated with a zod schema.
 *
 * Errors appear when a field is left (blur) or on submit, then track edits, so
 * the form never shouts at someone mid-typing. A touched, error-free, non-empty
 * field is reported as `valid` for the green "success" state.
 */
export function useAuthForm<V extends Record<string, string>>(schema: ZodType, initial: V) {
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useCallback(
    (next: V) => {
      const result = schema.safeParse(next);
      return result.success ? {} : fieldErrors(result.error);
    },
    [schema],
  );

  const bind = (name: keyof V & string) => ({
    name,
    value: values[name],
    error: touched[name] ? errors[name] : undefined,
    valid: !!touched[name] && !errors[name] && values[name].length > 0,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const next = { ...values, [name]: e.target.value };
      setValues(next);
      if (touched[name] || (name === "password" && touched.confirmPassword)) setErrors(validate(next));
    },
    onBlur: () => {
      setTouched((t) => ({ ...t, [name]: true }));
      setErrors(validate(values));
    },
  });

  /** Touch everything; returns the parsed data, or null when something is invalid. */
  const submit = () => {
    const found = validate(values);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (Object.keys(found).length > 0) return null;
    const result = schema.safeParse(values);
    return result.success ? (result.data as Record<string, string>) : null;
  };

  /** Show errors the server reported against specific fields. */
  const setServerErrors = (serverErrors: Record<string, string>) => {
    setTouched((t) => ({ ...t, ...Object.fromEntries(Object.keys(serverErrors).map((k) => [k, true])) }));
    setErrors((e) => ({ ...e, ...serverErrors }));
  };

  return { values, setValues, bind, submit, setServerErrors };
}

/** Pull `{ field: message }` out of an ApiError payload, if the server sent one. */
export function serverFieldErrors(payload: unknown): Record<string, string> {
  if (payload && typeof payload === "object" && "fieldErrors" in payload) {
    const raw = (payload as { fieldErrors?: unknown }).fieldErrors;
    if (raw && typeof raw === "object") {
      return Object.fromEntries(
        Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === "string"),
      ) as Record<string, string>;
    }
  }
  return {};
}
