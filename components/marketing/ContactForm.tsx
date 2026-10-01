"use client";

import { motion, useReducedMotion } from "framer-motion";
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

  if (status === "done") return <ThankYou />;

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

const CONFETTI = [
  { x: -92, y: -64, fill: "bg-tomato", size: "h-3 w-3" },
  { x: 88, y: -72, fill: "bg-butter", size: "h-3.5 w-3.5" },
  { x: -112, y: 6, fill: "bg-lilac", size: "h-2.5 w-2.5" },
  { x: 110, y: 14, fill: "bg-tomato", size: "h-2.5 w-2.5" },
  { x: -70, y: 70, fill: "bg-butter", size: "h-3 w-3" },
  { x: 74, y: 66, fill: "bg-lilac", size: "h-3 w-3" },
];

/** Confirmation card: same size as the form it replaces, content centred, with a springy check and confetti. */
function ThankYou() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay } };

  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-[2rem] border-[3px] border-plum bg-white p-10 text-center shadow-[6px_6px_0_0_#3b1a3f]"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        {!reduce &&
          CONFETTI.map((c, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className={`absolute rounded-full border-2 border-plum ${c.fill} ${c.size}`}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x: c.x, y: c.y, opacity: [0, 1, 1], scale: [0, 1.2, 1] }}
              transition={{ duration: 0.7, delay: 0.25 + i * 0.05, ease: "easeOut" }}
            />
          ))}
        {!reduce && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-4 border-mint"
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.2, ease: "easeOut" }}
          />
        )}
        <motion.span
          className="relative flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-plum bg-mint text-plum shadow-[3px_3px_0_0_#3b1a3f]"
          initial={reduce ? false : { scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
        >
          <CheckIcon className="h-9 w-9" />
        </motion.span>
      </div>
      <motion.h2 {...rise(0.3)} className="mt-6 font-chunky text-4xl font-extrabold text-plum">
        Thank you!
      </motion.h2>
      <motion.p {...rise(0.42)} className="mt-3 max-w-sm text-plum/75">
        Thank you for your interest in listing your salon on Salonly. We have received your request and our team will contact you soon.
      </motion.p>
    </div>
  );
}
