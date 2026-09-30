"use client";

import { useState, type FormEvent } from "react";

import { updateProfile, type Account } from "@/lib/api/account";
import { isApiError } from "@/lib/api/client";
import { profileSchema } from "@/lib/validation/account";
import { AuthField, FormAlert, SubmitButton } from "@/components/auth/fields";
import { serverFieldErrors, useAuthForm } from "@/components/auth/useAuthForm";

/** View and edit name, email and phone. The server derives "who" from the session. */
export function ProfileForm({ account, onSaved }: { account: Account; onSaved: (next: Account) => void }) {
  const form = useAuthForm(profileSchema, {
    name: account.name,
    email: account.email,
    phone: account.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const data = form.submit();
    if (!data) return;

    setSaving(true);
    try {
      const next = await updateProfile({ name: data.name, email: data.email, phone: data.phone });
      onSaved(next);
      form.setValues({ name: next.name, email: next.email, phone: next.phone ?? "" });
      setMessage({ tone: "success", text: "Profile updated successfully." });
    } catch (error) {
      if (isApiError(error)) form.setServerErrors(serverFieldErrors(error.payload));
      setMessage({
        tone: "error",
        text:
          isApiError(error) && error.status >= 400 && error.status < 500
            ? error.message
            : "Unable to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <AuthField label="Name" autoComplete="name" disabled={saving} {...form.bind("name")} />
      <AuthField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        disabled={saving}
        {...form.bind("email")}
      />
      <AuthField label="Phone" type="tel" autoComplete="tel" inputMode="tel" disabled={saving} {...form.bind("phone")} />
      {message && <FormAlert tone={message.tone}>{message.text}</FormAlert>}
      <SubmitButton loading={saving} loadingLabel="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}
