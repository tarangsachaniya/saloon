"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { isApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { postAuthDestination, withRedirect } from "@/lib/auth/redirect";
import { PASSWORD_HINT, registerSchema } from "@/lib/validation/auth";
import { AuthLayout } from "./AuthLayout";
import { AuthField, FormAlert, SubmitButton, formCardClass, linkClass } from "./fields";
import { serverFieldErrors, useAuthForm } from "./useAuthForm";

/**
 * Customer sign-up. There is deliberately no role field anywhere: the server
 * assigns CUSTOMER and ignores anything else in the request.
 */
export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isSigningIn } = useAuth();

  const form = useAuthForm(registerSchema, {
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const data = form.submit();
    if (!data) return;

    try {
      const user = await register({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      router.replace(postAuthDestination(user, searchParams.get("redirectTo")));
      router.refresh();
    } catch (error) {
      if (isApiError(error)) {
        const fields = serverFieldErrors(error.payload);
        if (Object.keys(fields).length > 0) form.setServerErrors(fields);
        setFormError(error.status >= 400 && error.status < 500 ? error.message : "Something went wrong. Please try again.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <AuthLayout
      badge="New here?"
      title={
        <>
          Create <span className="text-tomato">account</span>
        </>
      }
      subtitle="Book your favourite salons in a few taps."
      panel={{
        sticker1: "Join Salonly ✦",
        sticker2: "Takes under a minute",
        line: (
          <>
            Your next look starts <span className="text-tomato">here.</span>
          </>
        ),
      }}
      footer={
        <p>
          Already have an account?{" "}
          <Link href={withRedirect("/login", searchParams.get("redirectTo"))} className={linkClass}>
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className={formCardClass}>
        <AuthField
          label="Name"
          autoComplete="name"
          placeholder="Your full name"
          disabled={isSigningIn}
          {...form.bind("name")}
        />
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
          label="Phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          disabled={isSigningIn}
          {...form.bind("phone")}
        />
        <AuthField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          hint={PASSWORD_HINT}
          disabled={isSigningIn}
          {...form.bind("password")}
        />
        <AuthField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          disabled={isSigningIn}
          {...form.bind("confirmPassword")}
        />
        {formError && <FormAlert>{formError}</FormAlert>}
        <SubmitButton loading={isSigningIn} loadingLabel="Creating account…">
          Create account →
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
