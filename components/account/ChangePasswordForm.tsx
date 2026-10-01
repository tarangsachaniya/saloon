"use client";

import { useState, type FormEvent } from "react";

import { changePassword } from "@/lib/api/account";
import { isApiError } from "@/lib/api/client";
import { PASSWORD_HINT } from "@/lib/validation/auth";
import { changePasswordSchema } from "@/lib/validation/account";
import { AuthField, FormAlert, SubmitButton } from "@/components/auth/fields";
import { serverFieldErrors, useAuthForm } from "@/components/auth/useAuthForm";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** Current password -> new password (same rules as sign-up) -> confirm. */
export function ChangePasswordForm() {
  const form = useAuthForm(changePasswordSchema, EMPTY);
  const [saving, setSaving] = useState(false);
  // Remounting the fields clears them (and their touched state) after success.
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const data = form.submit();
    if (!data) return;

    setSaving(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      form.setValues(EMPTY);
      setFormKey((k) => k + 1);
      setMessage({ tone: "success", text: "Password changed successfully." });
    } catch (error) {
      if (isApiError(error)) form.setServerErrors(serverFieldErrors(error.payload));
      setMessage({
        tone: "error",
        text:
          isApiError(error) && error.status >= 400 && error.status < 500
            ? error.message
            : "Unable to update security settings. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} noValidate className="space-y-5">
      <AuthField
        label="Current password"
        type="password"
        autoComplete="current-password"
        disabled={saving}
        {...form.bind("currentPassword")}
      />
      <AuthField
        label="New password"
        type="password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        disabled={saving}
        {...form.bind("newPassword")}
      />
      <AuthField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        disabled={saving}
        {...form.bind("confirmPassword")}
      />
      {message && <FormAlert tone={message.tone}>{message.text}</FormAlert>}
      <SubmitButton loading={saving} loadingLabel="Updating…">
        Change password
      </SubmitButton>
    </form>
  );
}
