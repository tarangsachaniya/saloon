"use client";

import { useState, type FormEvent } from "react";

import { isApiError } from "@/lib/api/client";
import { twoFactorSchema } from "@/lib/validation/auth";
import { AuthField, FormAlert, SubmitButton, formCardClass } from "./fields";

/**
 * Second step of sign-in for accounts with an authenticator app. It is part of
 * the login flow (rendered by LoginForm), not a separate page. Verification
 * itself lands in the next phase; until then the endpoint says so plainly.
 */
export function TwoFactorForm({
  onVerify,
  onBack,
  loading,
}: {
  onVerify: (code: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = twoFactorSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    try {
      await onVerify(parsed.data.code);
    } catch (e) {
      setFormError(isApiError(e) ? e.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={formCardClass}>
      <AuthField
        label="Authentication code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        autoFocus
        disabled={loading}
        value={code}
        error={error}
        hint="Open your authenticator app and enter the 6-digit code."
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
      />
      {formError && <FormAlert>{formError}</FormAlert>}
      <SubmitButton loading={loading} loadingLabel="Verifying…">
        Verify →
      </SubmitButton>
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="w-full rounded-full px-4 py-2 text-sm font-bold text-plum hover:bg-cream focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-lilac disabled:opacity-50"
      >
        ← Back
      </button>
    </form>
  );
}
