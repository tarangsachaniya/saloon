"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { popButton } from "@/components/marketing/pop/ui";
import { isApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { BRAND } from "@/lib/brand";
import { loginSchema } from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/booking";

const spring = { type: "spring", stiffness: 260, damping: 20 } as const;

const fieldClass =
  "w-full rounded-2xl border-2 border-plum bg-white px-4 py-3.5 text-base font-medium text-plum shadow-[3px_3px_0_0_#3b1a3f] placeholder:text-plum/35 transition focus:bg-cream focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-lilac aria-[invalid=true]:border-red-700";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isSigningIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

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
      const user = await login(parsed.data.email, parsed.data.password);
      const redirectTo = searchParams.get("redirectTo");
      // Only allow same-site redirects into the private area this role can use
      // (never an attacker-supplied host).
      const home = user.role === "SUPER_ADMIN" ? "/platform" : "/dashboard";
      const allowed =
        redirectTo &&
        !redirectTo.startsWith("//") &&
        redirectTo.startsWith(home) &&
        (redirectTo.length === home.length || /^[/?]/.test(redirectTo[home.length]));
      router.replace(allowed ? redirectTo : home);
      router.refresh();
    } catch (error) {
      setFormError(isApiError(error) ? error.message : "That email and password don't match. Try again?");
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Left: playful brand panel */}
      <section className="relative hidden overflow-hidden bg-butter lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="relative z-10 font-chunky text-3xl font-extrabold tracking-tight text-plum">
          {BRAND.name.toLowerCase()}
          <span className="text-tomato">●</span>
        </Link>

        <div className="relative mx-auto h-[26rem] w-full max-w-sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spring, delay: 0.1 }}
            className="absolute -right-6 top-0 h-64 w-64 rounded-full bg-lilac"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spring, delay: 0.2 }}
            className="absolute -left-4 bottom-2 h-36 w-36 rounded-[42%_58%_55%_45%/50%_45%_55%_50%] bg-tomato"
          />
          <motion.div
            initial={{ opacity: 0, rotate: 6, scale: 0.9 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.15 }}
            className="absolute inset-6 overflow-hidden border-[3px] border-plum shadow-[8px_8px_0_0_#3b1a3f] [border-radius:58%_42%_50%_50%/45%_55%_45%_55%]"
          >
            <Image src="/images/services/color.jpg" alt="" fill priority sizes="24rem" className="object-cover object-[50%_60%]" />
          </motion.div>
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: -6 }}
            transition={{ ...spring, delay: 0.5 }}
            className="absolute -left-6 top-10 rounded-full border-2 border-plum bg-white px-4 py-2 text-sm font-extrabold text-plum shadow-[3px_3px_0_0_#3b1a3f]"
          >
            Welcome back ✦
          </motion.span>
          <motion.span
            initial={{ scale: 0, rotate: 20 }}
            animate={{ scale: 1, rotate: 4 }}
            transition={{ ...spring, delay: 0.65 }}
            className="absolute -right-4 bottom-20 rounded-2xl border-2 border-plum bg-mint px-4 py-3 text-sm font-extrabold text-plum shadow-[3px_3px_0_0_#3b1a3f]"
          >
            Today&apos;s diary is ready
          </motion.span>
        </div>

        <p className="relative z-10 max-w-sm font-chunky text-3xl font-extrabold leading-tight text-plum">
          Your salon&apos;s back office, <span className="text-tomato">minus the stress.</span>
        </p>
      </section>

      {/* Right: form */}
      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-chunky text-2xl font-extrabold tracking-tight text-plum lg:invisible">
            {BRAND.name.toLowerCase()}
            <span className="text-tomato">●</span>
          </Link>
          <Link href="/" className="rounded-full px-4 py-2 text-sm font-semibold text-plum hover:bg-white">
            ← Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="w-full max-w-md"
          >
            <span className="inline-block -rotate-2 rounded-full border-2 border-plum bg-lilac px-4 py-1 text-sm font-bold text-plum">
              Salon owners &amp; staff
            </span>
            <h1 className="mt-4 font-chunky text-5xl font-extrabold leading-[0.95] tracking-tight text-plum sm:text-6xl">
              Sign <span className="text-tomato">in</span>
            </h1>
            <p className="mt-3 font-medium text-plum/75">Manage bookings, your team and your shop page.</p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-8 space-y-5 rounded-[2rem] border-[3px] border-plum bg-white p-6 shadow-[8px_8px_0_0_#3b1a3f] sm:p-8"
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-plum">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  placeholder="you@yoursalon.com"
                  className={fieldClass}
                />
                {errors.email && (
                  <span id="email-error" role="alert" className="mt-1.5 block text-sm font-semibold text-red-700">
                    {errors.email}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-plum">Password</span>
                <span className="relative block">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    placeholder="••••••••"
                    className={`${fieldClass} pr-20`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 min-h-9 -translate-y-1/2 rounded-full px-3 text-sm font-bold text-plum hover:bg-cream"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
                {errors.password && (
                  <span id="password-error" role="alert" className="mt-1.5 block text-sm font-semibold text-red-700">
                    {errors.password}
                  </span>
                )}
              </label>

              {formError && (
                <motion.p
                  role="alert"
                  animate={{ x: [0, -6, 6, -4, 4, 0] }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl border-2 border-plum bg-tomato/25 px-4 py-3 text-sm font-bold text-plum"
                >
                  {formError}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isSigningIn}
                className={`${popButton("plum")} w-full disabled:cursor-wait disabled:opacity-70`}
              >
                {isSigningIn ? "Signing in…" : "Sign in →"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm font-medium leading-relaxed text-plum/75">
              Forgot your password?{" "}
              <a
                href={`mailto:${BRAND.contact.email}?subject=Password%20reset`}
                className="font-bold text-plum underline underline-offset-2"
              >
                Ask us to reset it
              </a>
              <br />
              Not on {BRAND.name} yet?{" "}
              <Link href="/contact" className="font-bold text-plum underline underline-offset-2">
                List your salon
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-cream" />}>
      <LoginForm />
    </Suspense>
  );
}
