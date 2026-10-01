"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import { disableTwoFactor, enableTwoFactor, startTwoFactorSetup } from "@/lib/api/account";
import { isApiError } from "@/lib/api/client";
import { popButton } from "@/components/marketing/pop/ui";
import { AuthField, FormAlert, SubmitButton } from "@/components/auth/fields";

type Step = { name: "idle" } | { name: "setup"; secret: string; qr: string } | { name: "disable" };

const errorText = (e: unknown, fallback: string) =>
  isApiError(e) && e.status >= 400 && e.status < 500 ? e.message : fallback;

/** Status + enable (QR, then confirm a code) / disable (password + code). */
export function TwoFactorSettings({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [step, setStep] = useState<Step>({ name: "idle" });
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<{ code?: string; password?: string }>({});
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  function reset() {
    setStep({ name: "idle" });
    setCode("");
    setPassword("");
    setFieldError({});
  }

  async function begin() {
    setMessage(null);
    setBusy(true);
    try {
      const { secret, qr } = await startTwoFactorSetup();
      setStep({ name: "setup", secret, qr });
    } catch (e) {
      setMessage({ tone: "error", text: errorText(e, "Unable to update security settings. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!/^\d{6}$/.test(code)) return setFieldError({ code: "Enter the 6-digit code from your authenticator app." });
    setFieldError({});
    setBusy(true);
    try {
      await enableTwoFactor(code);
      reset();
      onChange(true);
      setMessage({ tone: "success", text: "Two-factor authentication enabled." });
    } catch (e) {
      setFieldError({ code: errorText(e, "Unable to update security settings. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const found: { code?: string; password?: string } = {};
    if (!password) found.password = "Enter your password.";
    if (!/^\d{6}$/.test(code)) found.code = "Enter the 6-digit code from your authenticator app.";
    setFieldError(found);
    if (found.code || found.password) return;
    setBusy(true);
    try {
      await disableTwoFactor(password, code);
      reset();
      onChange(false);
      setMessage({ tone: "success", text: "Two-factor authentication disabled." });
    } catch (e) {
      if (isApiError(e) && e.status === 400) {
        const p = e.payload as { fieldErrors?: { code?: string; password?: string } } | null;
        setFieldError(p?.fieldErrors ?? {});
      } else {
        setMessage({ tone: "error", text: "Unable to update security settings. Please try again." });
      }
    } finally {
      setBusy(false);
    }
  }

  const codeField = (
    <AuthField
      label="Authentication code"
      name="code"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="123456"
      disabled={busy}
      value={code}
      error={fieldError.code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-chunky text-xl font-extrabold text-plum">Two-factor authentication</h3>
          <p className="mt-1 text-sm font-medium text-plum/75">
            Ask for a code from an authenticator app when you sign in.
          </p>
        </div>
        <span
          className={`rounded-full border-2 border-plum px-3 py-1 text-sm font-bold text-plum ${enabled ? "bg-mint" : "bg-butter"}`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {message && <FormAlert tone={message.tone}>{message.text}</FormAlert>}

      {step.name === "idle" && (
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={enabled ? () => (setMessage(null), setStep({ name: "disable" })) : begin}
          className={`${popButton(enabled ? "white" : "plum", "md")} disabled:cursor-wait disabled:opacity-70`}
        >
          {busy ? "Setting up…" : enabled ? "Disable 2FA" : "Enable 2FA"}
        </button>
      )}

      {step.name === "setup" && (
        <form onSubmit={confirm} noValidate className="space-y-5 rounded-2xl border-2 border-plum bg-cream p-4 sm:p-5">
          <ol className="list-decimal space-y-1 pl-5 text-sm font-medium text-plum/85">
            <li>Open your authenticator app and scan this QR code.</li>
            <li>Enter the 6-digit code it shows to finish.</li>
          </ol>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <Image
              src={step.qr}
              alt="QR code to add Salonly to your authenticator app"
              width={180}
              height={180}
              unoptimized
              className="rounded-xl border-2 border-plum bg-white"
            />
            <div className="min-w-0 text-sm">
              <p className="font-bold text-plum">Can&apos;t scan? Enter this key:</p>
              <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm font-semibold tracking-wider text-plum">
                {step.secret}
              </p>
            </div>
          </div>
          {codeField}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="sm:flex-1">
              <SubmitButton loading={busy} loadingLabel="Verifying…">
                Verify &amp; enable
              </SubmitButton>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={reset}
              className="min-h-11 rounded-full px-5 text-sm font-bold text-plum hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-lilac disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {step.name === "disable" && (
        <form onSubmit={disable} noValidate className="space-y-5 rounded-2xl border-2 border-plum bg-cream p-4 sm:p-5">
          <p className="text-sm font-medium text-plum/85">Confirm it&apos;s you to turn two-factor authentication off.</p>
          <AuthField
            label="Password"
            type="password"
            autoComplete="current-password"
            disabled={busy}
            value={password}
            error={fieldError.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {codeField}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="sm:flex-1">
              <SubmitButton loading={busy} loadingLabel="Disabling…">
                Disable 2FA
              </SubmitButton>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={reset}
              className="min-h-11 rounded-full px-5 text-sm font-bold text-plum hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-lilac disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
