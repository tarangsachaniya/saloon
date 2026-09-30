"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { forgotPassword } from "@/lib/api/auth";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { AuthLayout } from "./AuthLayout";
import { AuthField, FormAlert, SubmitButton, formCardClass, linkClass } from "./fields";
import { useAuthForm } from "./useAuthForm";

/**
 * Ask for a reset link. The API answers the same way whether or not the email
 * is registered, so the confirmation here is worded the same way too.
 */
export function ForgotPasswordForm() {
  const form = useAuthForm(forgotPasswordSchema, { email: "" });
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const data = form.submit();
    if (!data) return;

    setLoading(true);
    try {
      await forgotPassword(data.email);
      setSentTo(data.email);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const backToLogin = (
    <p>
      <Link href="/login" className={linkClass}>
        ← Back to sign in
      </Link>
    </p>
  );

  return (
    <AuthLayout
      badge="No worries"
      title={
        <>
          Forgot <span className="text-tomato">password?</span>
        </>
      }
      subtitle="Enter your email and we'll help you reset it."
      panel={{
        sticker1: "It happens ✦",
        sticker2: "Back in a minute",
        line: (
          <>
            We&apos;ll get you <span className="text-tomato">back in.</span>
          </>
        ),
      }}
      footer={backToLogin}
    >
      {sentTo ? (
        <div className={formCardClass}>
          <FormAlert tone="success">
            If {sentTo} is registered, a reset link is on its way. It&apos;s valid for one hour.
          </FormAlert>
          <p className="text-sm font-medium text-plum/75">
            Nothing in your inbox? Check spam, or{" "}
            <button type="button" onClick={() => setSentTo(null)} className={linkClass}>
              try another email
            </button>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className={formCardClass}>
          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            disabled={loading}
            {...form.bind("email")}
          />
          {formError && <FormAlert>{formError}</FormAlert>}
          <SubmitButton loading={loading} loadingLabel="Sending…">
            Continue →
          </SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
