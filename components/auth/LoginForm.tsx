"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { popButton } from "@/components/marketing/pop/ui";
import { isApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { postAuthDestination, withRedirect } from "@/lib/auth/redirect";
import type { User } from "@/lib/booking/types";
import { loginSchema } from "@/lib/validation/admin";
import { AuthLayout } from "./AuthLayout";
import { GoogleButton } from "./GoogleButton";
import { GoogleLinkForm } from "./GoogleLinkForm";
import { AuthField, FormAlert, SubmitButton, formCardClass, linkClass } from "./fields";
import { useAuthForm } from "./useAuthForm";

/** Short, safe messages for the `?error=` codes the Google routes redirect back with. */
const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_unavailable: "Google sign-in isn't available right now. Please use your email and password.",
  google_not_allowed: "This account must sign in with its email and password.",
  account_disabled: "This account is disabled.",
  google_failed: "We couldn't sign you in with Google. Please try again.",
};

/** Sign in: email + password. New visitors reach registration from the "Create Account" button. */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isSigningIn } = useAuth();

  const form = useAuthForm(loginSchema, { email: "", password: "" });
  const errorCode = searchParams.get("error");
  const [formError, setFormError] = useState<string | null>(
    errorCode ? (GOOGLE_ERRORS[errorCode] ?? "Something went wrong. Please try again.") : null,
  );
  const linkEmail = searchParams.get("google") === "link" ? searchParams.get("email") : null;

  function finish(user: User) {
    router.replace(postAuthDestination(user, searchParams.get("redirectTo")));
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const data = form.submit();
    if (!data) return;

    try {
      finish(await login(data.email, data.password));
    } catch (error) {
      setFormError(
        isApiError(error) && error.status !== 0 && error.status < 500 && error.status !== 401
          ? error.message
          : isApiError(error) && error.status === 401
            ? "Invalid email or password."
            : "Something went wrong. Please try again.",
      );
    }
  }

  if (linkEmail) {
    return (
      <AuthLayout
        badge="One more step"
        title={
          <>
            Link <span className="text-tomato">Google</span>
          </>
        }
        subtitle="Confirm it's you to connect Google to your account."
      >
        <GoogleLinkForm email={linkEmail} redirectTo={searchParams.get("redirectTo")} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      badge="Welcome back"
      title={
        <>
          Sign <span className="text-tomato">in</span>
        </>
      }
      subtitle="Pick up where you left off."
      panel={{
        sticker1: "Welcome back ✦",
        sticker2: "Good to see you again",
        line: (
          <>
            Your salon, <span className="text-tomato">one tap away.</span>
          </>
        ),
      }}
      footer={
        <>
          <p>
            <Link href="/forgot-password" className={linkClass}>
              Forgot your password?
            </Link>
          </p>
          <p>Don&apos;t have an account?</p>
          <Link
            href={withRedirect("/register", searchParams.get("redirectTo"))}
            className={`${popButton("white")} w-full`}
          >
            Create Account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className={formCardClass}>
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          disabled={isSigningIn}
          {...form.bind("email")}
        />
        <AuthField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={isSigningIn}
          {...form.bind("password")}
        />
        {formError && <FormAlert>{formError}</FormAlert>}
        <SubmitButton loading={isSigningIn} loadingLabel="Signing in…">
          Sign in →
        </SubmitButton>
        <div className="flex items-center gap-3 text-sm font-bold text-plum/60" role="separator" aria-label="or">
          <span className="h-0.5 flex-1 rounded bg-plum/15" />
          OR
          <span className="h-0.5 flex-1 rounded bg-plum/15" />
        </div>
        <GoogleButton redirectTo={searchParams.get("redirectTo")} disabled={isSigningIn} />
      </form>
    </AuthLayout>
  );
}
