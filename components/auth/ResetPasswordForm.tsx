"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { resetPassword } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/client";
import { PASSWORD_HINT, resetPasswordSchema } from "@/lib/validation/auth";
import { AuthLayout } from "./AuthLayout";
import { AuthField, FormAlert, SubmitButton, formCardClass, linkClass } from "./fields";
import { serverFieldErrors, useAuthForm } from "./useAuthForm";

type LinkProblem = "missing" | "invalid" | "expired";

const PROBLEM_COPY: Record<LinkProblem, string> = {
  missing: "This reset link is incomplete. Request a new one to continue.",
  invalid: "This reset link is invalid or has already been used.",
  expired: "This reset link has expired. Request a new one to continue.",
};

/** Choose a new password using the `?token=` from the reset email. */
export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const form = useAuthForm(resetPasswordSchema, { password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState<LinkProblem | null>(token ? null : "missing");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!token) return;
    const data = form.submit();
    if (!data) return;

    setLoading(true);
    try {
      await resetPassword(token, data.password);
      setDone(true);
    } catch (error) {
      const code = isApiError(error) ? (error.payload as { code?: string } | null)?.code : undefined;
      if (code === "TOKEN_EXPIRED") setProblem("expired");
      else if (code === "TOKEN_INVALID") setProblem("invalid");
      else if (isApiError(error) && error.status === 400) {
        form.setServerErrors(serverFieldErrors(error.payload));
        setFormError(error.message);
      } else setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      badge="Fresh start"
      title={
        <>
          New <span className="text-tomato">password</span>
        </>
      }
      subtitle="Choose something you'll remember."
      panel={{
        sticker1: "Nearly done ✦",
        sticker2: "One more step",
        line: (
          <>
            A fresh start, <span className="text-tomato">securely.</span>
          </>
        ),
      }}
      footer={
        <p>
          <Link href="/login" className={linkClass}>
            ← Back to sign in
          </Link>
        </p>
      }
    >
      {done ? (
        <div className={formCardClass}>
          <FormAlert tone="success">Password updated. You can sign in now.</FormAlert>
          <Link
            href="/login"
            className="flex min-h-14 w-full items-center justify-center rounded-full border-2 border-plum bg-plum px-8 text-base font-bold text-butter shadow-[5px_5px_0_0_#3b1a3f] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-plum"
          >
            Sign in →
          </Link>
        </div>
      ) : problem ? (
        <div className={formCardClass}>
          <FormAlert>{PROBLEM_COPY[problem]}</FormAlert>
          <Link
            href="/forgot-password"
            className="flex min-h-14 w-full items-center justify-center rounded-full border-2 border-plum bg-plum px-8 text-base font-bold text-butter shadow-[5px_5px_0_0_#3b1a3f] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-plum"
          >
            Request a new link →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className={formCardClass}>
          <AuthField
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            hint={PASSWORD_HINT}
            disabled={loading}
            {...form.bind("password")}
          />
          <AuthField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={loading}
            {...form.bind("confirmPassword")}
          />
          {formError && <FormAlert>{formError}</FormAlert>}
          <SubmitButton loading={loading} loadingLabel="Resetting…">
            Reset password →
          </SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
