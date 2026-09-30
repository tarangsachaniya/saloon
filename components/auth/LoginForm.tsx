"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { isApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { postAuthDestination, withRedirect } from "@/lib/auth/redirect";
import type { User } from "@/lib/booking/types";
import { loginSchema } from "@/lib/validation/admin";
import { AuthLayout } from "./AuthLayout";
import { AuthField, FormAlert, SubmitButton, formCardClass, linkClass } from "./fields";
import { TwoFactorForm } from "./TwoFactorForm";
import { useAuthForm } from "./useAuthForm";

/** Sign in: email + password, then (only if enabled) the authenticator code. */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verifyTwoFactor, isSigningIn } = useAuth();

  const form = useAuthForm(loginSchema, { email: "", password: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);

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
      const result = await login(data.email, data.password);
      if ("twoFactorRequired" in result) setChallenge(result.challenge);
      else finish(result);
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

  if (challenge) {
    return (
      <AuthLayout
        badge="Almost there"
        title={
          <>
            Enter your <span className="text-tomato">code</span>
          </>
        }
        subtitle="Two-step sign-in is on for this account."
      >
        <TwoFactorForm
          loading={isSigningIn}
          onBack={() => setChallenge(null)}
          onVerify={async (code) => finish(await verifyTwoFactor(challenge, code))}
        />
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
          <p>
            New to Salonly?{" "}
            <Link href={withRedirect("/register", searchParams.get("redirectTo"))} className={linkClass}>
              Create an account
            </Link>
          </p>
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
      </form>
    </AuthLayout>
  );
}
