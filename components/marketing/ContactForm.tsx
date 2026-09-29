"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { CheckIcon } from "./icons";

type Fields = {
  name: string;
  salonName: string;
  email: string;
  phone: string;
  city: string;
  message: string;
  consent: boolean;
  website: string; // honeypot
};

const EMPTY: Fields = {
  name: "",
  salonName: "",
  email: "",
  phone: "",
  city: "",
  message: "",
  consent: false,
  website: "",
};

const inputClass =
  "w-full rounded-2xl border-2 border-plum bg-white px-4 py-3 text-base font-medium text-plum shadow-[3px_3px_0_0_#3b1a3f] placeholder:text-plum/40 transition focus:bg-cream focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-lilac aria-[invalid=true]:border-red-700";

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-plum">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-plum/75">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-xs font-medium text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

export function ContactForm() {
  const [values, setValues] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [failure, setFailure] = useState<string | null>(null);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof Fields, string>> = {};
    if (values.name.trim().length < 2) next.name = "Please enter your name.";
    if (values.salonName.trim().length < 2) next.salonName = "Please enter your salon's name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (!values.consent) next.consent = "Please agree so we can contact you.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    if (!validate()) return;

    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          phone: values.phone || null,
          city: values.city || null,
          message: values.message || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setFailure(data.message ?? "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }
      setStatus("done");
    } catch {
      setFailure("We couldn't reach the server. Check your connection and try again.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div role="status" className="rounded-[2rem] border-[3px] border-plum bg-white p-10 text-center shadow-[6px_6px_0_0_#3b1a3f]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-plum">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-6 font-chunky text-3xl font-semibold text-plum">Thank you</h2>
        <p className="mt-3 text-plum/75">
          We&apos;ve received your request and will be in touch soon to set up your salon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-[2rem] border-[3px] border-plum bg-white p-6 shadow-[6px_6px_0_0_#3b1a3f] sm:p-10">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" error={errors.name}>
          <input
            className={inputClass}
            autoComplete="name"
            value={values.name}
            aria-invalid={!!errors.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={120}
          />
        </Field>
        <Field label="Salon name" error={errors.salonName}>
          <input
            className={inputClass}
            autoComplete="organization"
            value={values.salonName}
            aria-invalid={!!errors.salonName}
            onChange={(e) => set("salonName", e.target.value)}
            maxLength={160}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" error={errors.email}>
          <input
            className={inputClass}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            aria-invalid={!!errors.email}
            onChange={(e) => set("email", e.target.value)}
            maxLength={180}
          />
        </Field>
        <Field label="Phone" hint="Optional">
          <input
            className={inputClass}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            maxLength={30}
          />
        </Field>
      </div>
      <Field label="City" hint="Optional">
        <input
          className={inputClass}
          autoComplete="address-level2"
          value={values.city}
          onChange={(e) => set("city", e.target.value)}
          maxLength={80}
        />
      </Field>
      <Field label="Anything we should know?" hint="Optional: number of chairs, services, timeline…">
        <textarea
          className={inputClass}
          rows={4}
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          maxLength={2000}
        />
      </Field>

      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </label>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-plum/75">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={!!errors.consent}
            className="mt-1 h-4 w-4 shrink-0 accent-[#3b1a3f]"
          />
          <span>
            I agree to be contacted about listing my salon and that my details will be handled as described in the{" "}
            <Link href="/legal/privacy" className="font-semibold text-plum underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.consent && (
          <p role="alert" className="mt-1 pl-7 text-xs font-medium text-red-700">
            {errors.consent}
          </p>
        )}
      </div>

      {failure && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {failure}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-plum bg-tomato px-8 text-base font-bold text-plum shadow-[5px_5px_0_0_#3b1a3f] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_0_#3b1a3f] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-plum disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
