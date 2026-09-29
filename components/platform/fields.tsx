"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import type { CommissionType, PlanInput, PlanType } from "@/lib/api/platform";
import { HEX_COLOR, readableOn, resolveAccent, THEME_IDS, THEMES, type ThemeId } from "@/lib/themes";

export const inputClass =
  "w-full rounded-2xl border-2 border-plum bg-white px-4 py-3 text-base font-medium text-plum shadow-[3px_3px_0_0_#3b1a3f] placeholder:text-plum/35 transition focus:bg-cream focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-lilac aria-[invalid=true]:border-red-700 disabled:opacity-60";

export const card = "rounded-[2rem] border-[3px] border-plum bg-white p-6 shadow-[6px_6px_0_0_#3b1a3f] sm:p-8";

export function Field({
  label,
  error,
  hint,
  className = "",
  ...props
}: { label: string; error?: string; hint?: ReactNode; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-plum">
        {label}
        {props.required && <span className="text-tomato"> *</span>}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined}
        className={inputClass}
        {...props}
      />
      {error ? (
        <p id={`${id}-e`} role="alert" className="mt-1.5 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-h`} className="mt-1.5 text-sm text-plum/65">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Pill segmented control (radio group). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-plum">{label}</legend>
      <div className="inline-flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-full border-2 border-plum px-5 py-2 text-sm font-bold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lilac ${
              value === o.value
                ? "bg-plum text-butter shadow-[3px_3px_0_0_#ff6b4a]"
                : "bg-white text-plum hover:bg-cream"
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Four theme cards with swatches; radio semantics. */
export function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (t: ThemeId) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold text-plum">Shop page theme</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_IDS.map((id) => {
          const t = THEMES[id];
          const selected = value === id;
          return (
            <label
              key={id}
              className={`relative cursor-pointer rounded-3xl border-[3px] border-plum p-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lilac ${
                selected ? "bg-lilac shadow-[5px_5px_0_0_#3b1a3f]" : "bg-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#3b1a3f]"
              }`}
            >
              <input type="radio" name="theme" className="sr-only" checked={selected} onChange={() => onChange(id)} />
              <span className="flex h-12 overflow-hidden rounded-xl border-2 border-plum">
                {t.swatch.map((c, i) => (
                  <span key={i} className="flex-1" style={{ background: c }} />
                ))}
              </span>
              <span className="mt-3 block font-chunky text-lg font-extrabold text-plum">{t.name}</span>
              <span className="block text-sm font-medium text-plum/75">{t.bestFor}</span>
              {selected && (
                <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-plum bg-butter text-sm font-extrabold">
                  ✓
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Accent colour: native picker + hex text, with a "theme default" reset. */
export function AccentPicker({
  theme,
  value,
  onChange,
  error,
}: {
  theme: ThemeId;
  value: string | null;
  onChange: (v: string | null) => void;
  error?: string;
}) {
  const resolved = resolveAccent(theme, value);
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-plum">
        Accent colour
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          aria-label="Pick accent colour"
          value={resolved}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-14 cursor-pointer rounded-xl border-2 border-plum bg-white p-1"
        />
        <input
          id={id}
          value={value ?? ""}
          placeholder={`${THEMES[theme].defaultAccent} (theme default)`}
          onChange={(e) => onChange(e.target.value.trim() || null)}
          aria-invalid={!!error || (!!value && !HEX_COLOR.test(value))}
          className={`${inputClass} max-w-[15rem] font-mono`}
          maxLength={7}
        />
        <span
          className="rounded-full border-2 border-plum px-4 py-2 text-sm font-bold"
          style={{ background: resolved, color: readableOn(resolved) }}
        >
          Book now
        </span>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="text-sm font-bold text-plum underline">
            Use theme default
          </button>
        )}
      </div>
      {(error || (value && !HEX_COLOR.test(value))) && (
        <p role="alert" className="mt-1.5 text-sm font-semibold text-red-700">
          {error ?? "Use a colour like #7d8f7a."}
        </p>
      )}
    </div>
  );
}

export interface PlanDraft {
  planType: PlanType;
  commissionType: CommissionType;
  /** Raw text from the amount input. */
  amount: string;
}

export const EMPTY_PLAN: PlanDraft = { planType: "MONTHLY", commissionType: "PERCENT", amount: "" };

/** Draft -> API payload, or an error message. */
export function planFromDraft(d: PlanDraft): { plan: PlanInput } | { error: string } {
  const n = Number(d.amount);
  if (d.amount.trim() === "" || !Number.isFinite(n)) return { error: "Enter an amount." };
  if (Math.round(n * 100) !== n * 100) return { error: "At most 2 decimal places." };
  if (d.planType === "MONTHLY") {
    if (n < 0) return { error: "The fee can't be negative." };
    return { plan: { planType: "MONTHLY", monthlyFee: n } };
  }
  if (n <= 0) return { error: "Must be more than 0." };
  if (d.commissionType === "PERCENT" && n > 100) return { error: "A percentage can't exceed 100." };
  return { plan: { planType: "COMMISSION", commissionType: d.commissionType, commissionValue: n } };
}

export function planPreview(d: PlanDraft): string {
  const n = Number(d.amount);
  if (!d.amount || !Number.isFinite(n)) return "Choose a plan";
  const inr = `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  if (d.planType === "MONTHLY") return `${inr} / month`;
  return d.commissionType === "PERCENT" ? `${n}% of completed bookings` : `${inr} per completed booking`;
}

export function PlanFields({ value, onChange, error }: { value: PlanDraft; onChange: (d: PlanDraft) => void; error?: string }) {
  const isMonthly = value.planType === "MONTHLY";
  const isPercent = value.commissionType === "PERCENT";
  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label="How does this salon pay?"
        value={value.planType}
        onChange={(planType) => onChange({ ...value, planType })}
        options={[
          { value: "MONTHLY", label: "Monthly fee" },
          { value: "COMMISSION", label: "Commission" },
        ]}
      />
      {!isMonthly && (
        <Segmented
          label="Commission type"
          value={value.commissionType}
          onChange={(commissionType) => onChange({ ...value, commissionType })}
          options={[
            { value: "PERCENT", label: "% of booking value" },
            { value: "FLAT", label: "Flat ₹ per booking" },
          ]}
        />
      )}
      <Field
        label={isMonthly ? "Monthly fee (₹)" : isPercent ? "Commission (%)" : "Amount per completed booking (₹)"}
        type="number"
        inputMode="decimal"
        min={0}
        max={!isMonthly && isPercent ? 100 : undefined}
        step="0.01"
        value={value.amount}
        onChange={(e) => onChange({ ...value, amount: e.target.value })}
        error={error}
        hint={
          isMonthly
            ? "Charged every month, whatever the booking volume."
            : "Only COMPLETED appointments count; cancellations and no-shows earn nothing."
        }
        required
      />
    </div>
  );
}

/** Shows a one-time password with copy buttons. */
export function CredentialsCard({ email, password, title }: { email: string; password: string; title: string }) {
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable: the value is visible to copy by hand */
    }
  }
  return (
    <div className="rounded-[2rem] border-[3px] border-plum bg-mint p-6 shadow-[6px_6px_0_0_#3b1a3f]" role="status">
      <p className="font-chunky text-2xl font-extrabold text-plum">{title}</p>
      <p className="mt-1 text-sm font-semibold text-plum/80">
        This password is shown <strong>only once</strong>. Share it privately with the owner and ask them to change it
        after signing in.
      </p>
      <dl className="mt-5 flex flex-col gap-3">
        {[
          ["Email", email],
          ["Temporary password", password],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-plum bg-white px-4 py-3">
            <dt className="w-40 text-sm font-bold text-plum/70">{k}</dt>
            <dd className="flex-1 break-all font-mono text-base font-bold text-plum">{v}</dd>
            <button
              type="button"
              onClick={() => copy(v)}
              className="rounded-full border-2 border-plum bg-butter px-3 py-1 text-xs font-bold text-plum hover:bg-white"
            >
              Copy
            </button>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** "Classic Cuts & Co." -> "classic-cuts-co" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
