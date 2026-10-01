"use client";

import { motion } from "framer-motion";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

import { popButton } from "@/components/marketing/pop/ui";

/**
 * Auth form controls in Salonly's playful style: plum outline, hard offset
 * shadow, lilac focus ring. States: default, focus, filled (white -> cream on
 * focus), error (red outline + message), success (mint tick) and disabled.
 */

const fieldClass =
  "w-full rounded-2xl border-2 border-plum bg-white px-4 py-3.5 text-base font-medium text-plum shadow-[3px_3px_0_0_#3b1a3f] placeholder:text-plum/35 transition focus:bg-cream focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-lilac aria-[invalid=true]:border-red-700 disabled:cursor-not-allowed disabled:bg-plum/5 disabled:opacity-60 disabled:shadow-none";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  error?: string;
  /** Touched and passing validation: shows the mint tick. */
  valid?: boolean;
  hint?: ReactNode;
}

export function AuthField({ label, error, valid, hint, type = "text", disabled, ...props }: AuthFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-plum">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${fieldClass} ${isPassword ? "pr-20" : valid ? "pr-11" : ""}`}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            aria-pressed={visible}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 min-h-9 -translate-y-1/2 rounded-full px-3 text-sm font-bold text-plum hover:bg-cream focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-lilac disabled:opacity-50"
          >
            {visible ? "Hide" : "Show"}
          </button>
        ) : (
          valid &&
          !error && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-plum bg-mint text-xs font-extrabold text-plum"
            >
              ✓
            </span>
          )
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm font-medium text-plum/65">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Form-level message (server errors, expired links). Shakes once, like the old login. */
export function FormAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  return (
    <motion.p
      role={tone === "error" ? "alert" : "status"}
      animate={tone === "error" ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border-2 border-plum px-4 py-3 text-sm font-bold text-plum ${
        tone === "error" ? "bg-tomato/25" : "bg-mint"
      }`}
    >
      {children}
    </motion.p>
  );
}

/** Full-width primary action with an in-flight label; blocks double submits. */
export function SubmitButton({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean;
  loadingLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className={`${popButton("plum")} w-full disabled:cursor-wait disabled:opacity-70`}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

/** The sticker-card the form sits in. */
export const formCardClass =
  "mt-8 space-y-5 rounded-[2rem] border-[3px] border-plum bg-white p-6 shadow-[8px_8px_0_0_#3b1a3f] sm:p-8";

export const linkClass = "font-bold text-plum underline underline-offset-2 hover:text-plum-soft";
