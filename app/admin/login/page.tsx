"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Loader } from "@/components/ui/Spinner";
import { isApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { loginSchema } from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/booking";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isSigningIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function fillDemoCredentials() {
    setEmail("owner@example.com");
    setPassword("ChangeMe123!");
    setErrors({});
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});

    try {
      await login(parsed.data.email, parsed.data.password);
      const redirectTo = searchParams.get("redirectTo");
      // Only allow internal admin redirects — never an attacker-supplied host.
      router.replace(
        redirectTo && redirectTo.startsWith("/admin") ? redirectTo : "/admin",
      );
      router.refresh();
    } catch (error) {
      setFormError(
        isApiError(error)
          ? error.message
          : "Invalid email or password. Please verify your staff credentials.",
      );
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center luxury-gradient-dark px-4 py-12">
      {/* Background salon photo with soft overlay */}
      <div className="absolute inset-0 z-0 opacity-15 mix-blend-overlay">
        <Image
          src="/images/salon/salon-hero.jpg"
          alt="Salon background"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link
            href="/"
            className="flex items-center gap-3 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-light"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/10 p-2 ring-1 ring-white/20 shadow-lg transition-transform group-hover:scale-105">
              <Image
                src="/images/logo-light.png"
                alt="Salon Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold text-white sm:text-3xl">
            Salon Staff Portal
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Sign in to manage appointments, roster schedules, and services.
          </p>
        </div>

        <Card className="glass-card rounded-3xl border-white/20 p-2 shadow-2xl">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <Input
                label="Staff Email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="owner@example.com"
              />
              <Input
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="••••••••"
              />

              {formError && (
                <div className="rounded-xl border border-danger/30 bg-red-50/80 p-3 text-xs font-semibold text-danger">
                  {formError}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={isSigningIn}
                className="font-bold mt-1"
              >
                Sign In to Dashboard
              </Button>

              {/* Demo Helper Button */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors"
                >
                  Quick Fill Demo Owner Credentials
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs font-semibold text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            ← Back to Customer Website
          </Link>
          <span>·</span>
          <Link href="/book" className="hover:text-white transition-colors">
            Public Booking Desk
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginForm />
    </Suspense>
  );
}
