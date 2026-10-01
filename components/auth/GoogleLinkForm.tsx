"use client";

import { useState, type FormEvent } from "react";

import { isApiError, post } from "@/lib/api/client";
import { AuthField, FormAlert, SubmitButton, formCardClass } from "./fields";

/**
 * Shown after Google sign-in finds an existing Salonly account for the same
 * email. Salonly doesn't verify emails when an account is created, so the
 * account's password is asked once to prove it is theirs before Google is linked.
 */
export function GoogleLinkForm({ email, redirectTo }: { email: string; redirectTo?: string | null }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post("/auth/google/link", { password }, { auth: false });
      const query = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";
      window.location.assign(`/auth/google/done${query}`);
    } catch (err) {
      setError(
        isApiError(err) && err.status !== 0 && err.status < 500
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className={formCardClass}>
      <p className="font-medium text-plum/85">
        You already have a Salonly account for <strong className="text-plum">{email}</strong>. Enter its password once
        to link your Google account.
      </p>
      <AuthField
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        disabled={busy}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton loading={busy} loadingLabel="Linking…">
        Link Google account →
      </SubmitButton>
    </form>
  );
}
