"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { popButton } from "@/components/marketing/pop/ui";
import {
  AccentPicker,
  card,
  CredentialsCard,
  EMPTY_PLAN,
  Field,
  planFromDraft,
  PlanFields,
  ThemePicker,
  type PlanDraft,
} from "@/components/platform/fields";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import {
  changePlatformPlan,
  fieldErrorsOf,
  getPlatformSalon,
  resetOwnerPassword,
  updatePlatformSalon,
  type Credentials,
  type PlatformSalonDetail,
} from "@/lib/api/platform";
import { HEX_COLOR, type ThemeId } from "@/lib/themes";

function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-2xl border-2 border-plum px-4 py-2 text-sm font-bold ${tone === "ok" ? "bg-mint" : "bg-tomato/30"}`}
    >
      {children}
    </p>
  );
}

const STATUS_STYLE = { CURRENT: "bg-mint", SCHEDULED: "bg-butter", PAST: "bg-white text-plum/60" } as const;

function ProfileSection({ salon, onSaved }: { salon: PlatformSalonDetail; onSaved: (s: PlatformSalonDetail) => void }) {
  const [form, setForm] = useState({
    name: salon.name,
    slug: salon.slug,
    tagline: salon.tagline ?? "",
    phone: salon.phone ?? "",
    email: salon.email ?? "",
    address: salon.address ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const updated = await updatePlatformSalon(salon.id, {
        name: form.name.trim(),
        slug: form.slug.trim(),
        tagline: form.tagline.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      });
      setErrors({});
      onSaved(updated);
      setMsg({ tone: "ok", text: "Profile saved." });
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      setMsg({ tone: "error", text: toErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className={card} noValidate aria-labelledby="profile-h">
      <h2 id="profile-h" className="font-chunky text-2xl font-extrabold">Profile</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Salon name" required value={form.name} onChange={set("name")} error={errors.name} maxLength={120} className="sm:col-span-2" />
        <Field
          label="Web address"
          required
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
          error={errors.slug}
          hint="Changing this breaks links the salon has already shared."
          maxLength={60}
          className="sm:col-span-2"
        />
        <Field label="Tagline" value={form.tagline} onChange={set("tagline")} maxLength={160} className="sm:col-span-2" error={errors.tagline} />
        <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} maxLength={30} error={errors.phone} />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} maxLength={180} error={errors.email} />
        <Field label="Address" value={form.address} onChange={set("address")} maxLength={300} className="sm:col-span-2" error={errors.address} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className={`${popButton("plum", "md")} disabled:opacity-70`}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </div>
    </form>
  );
}

function LookSection({ salon, onSaved }: { salon: PlatformSalonDetail; onSaved: (s: PlatformSalonDetail) => void }) {
  const [theme, setTheme] = useState<ThemeId>(salon.theme);
  const [accent, setAccent] = useState<string | null>(salon.accentColor);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = theme !== salon.theme || accent !== salon.accentColor;

  async function save() {
    if (accent && !HEX_COLOR.test(accent)) return;
    setSaving(true);
    setMsg(null);
    try {
      onSaved(await updatePlatformSalon(salon.id, { theme, accentColor: accent }));
      setMsg({ tone: "ok", text: "Look saved." });
    } catch (error) {
      setMsg({ tone: "error", text: toErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={card} aria-labelledby="look-h">
      <h2 id="look-h" className="font-chunky text-2xl font-extrabold">Look &amp; feel</h2>
      <div className="mt-6 flex flex-col gap-6">
        <ThemePicker value={theme} onChange={setTheme} />
        <AccentPicker theme={theme} value={accent} onChange={setAccent} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={!dirty || saving} className={`${popButton("plum", "md")} disabled:opacity-50`}>
          {saving ? "Saving…" : "Save look"}
        </button>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </div>
    </section>
  );
}

function PlanSection({ salon, onChanged }: { salon: PlatformSalonDetail; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_PLAN);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | undefined>();
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const current = salon.plans.find((p) => p.status === "CURRENT");

  async function save(event: FormEvent) {
    event.preventDefault();
    const result = planFromDraft(draft);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(undefined);
    setSaving(true);
    setMsg(null);
    try {
      await changePlatformPlan(salon.id, result.plan, from);
      setOpen(false);
      setDraft(EMPTY_PLAN);
      setMsg({ tone: "ok", text: "Plan change saved." });
      onChanged();
    } catch (err) {
      setMsg({ tone: "error", text: toErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={card} aria-labelledby="plan-h">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="plan-h" className="font-chunky text-2xl font-extrabold">Billing plan</h2>
          <p className="mt-1 font-chunky text-3xl font-extrabold text-tomato">
            {current ? current.summary : "No plan in force"}
          </p>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className={popButton("butter", "md")}>
            Change plan
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={save} noValidate className="mt-6 flex flex-col gap-5 rounded-3xl border-2 border-dashed border-plum bg-cream p-5">
          <PlanFields value={draft} onChange={setDraft} error={error} />
          <Field
            label="Effective from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            hint="Earlier periods keep the plan that applied then."
            required
          />
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className={`${popButton("plum", "md")} disabled:opacity-70`}>
              {saving ? "Saving…" : "Save new plan"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={popButton("white", "md")}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {msg && <div className="mt-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      <h3 className="mt-8 text-sm font-bold text-plum/70">History</h3>
      {salon.plans.length === 0 ? (
        <p className="mt-2 font-semibold text-plum/70">No plans yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {salon.plans.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-plum bg-white px-4 py-3">
              <span className={`rounded-full border-2 border-plum px-3 py-0.5 text-xs font-bold ${STATUS_STYLE[p.status ?? "PAST"]}`}>
                {p.status === "CURRENT" ? "Current" : p.status === "SCHEDULED" ? "Scheduled" : "Past"}
              </span>
              <span className="flex-1 font-bold">{p.summary}</span>
              <span className="text-sm font-semibold text-plum/70">
                from {new Date(p.effectiveFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamSection({ salon }: { salon: PlatformSalonDetail }) {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (!window.confirm("Issue a new temporary password for the owner? Their current password will stop working.")) return;
    setBusy(true);
    setError(null);
    try {
      setCreds(await resetOwnerPassword(salon.id));
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card} aria-labelledby="team-h">
      <h2 id="team-h" className="font-chunky text-2xl font-extrabold">Logins</h2>
      <ul className="mt-5 flex flex-col gap-2">
        {salon.team.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-plum bg-white px-4 py-3">
            <span className="rounded-full border-2 border-plum bg-lilac px-3 py-0.5 text-xs font-bold">{u.role === "OWNER" ? "Owner" : "Staff"}</span>
            <span className="font-bold">
              {u.firstName} {u.lastName ?? ""}
            </span>
            <span className="break-all text-sm font-semibold text-plum/70">{u.email}</span>
            {!u.enabled && <span className="text-xs font-bold text-red-700">disabled</span>}
          </li>
        ))}
        {salon.team.length === 0 && <li className="font-semibold text-plum/70">No logins for this salon.</li>}
      </ul>
      {salon.team.some((u) => u.role === "OWNER") && (
        <button type="button" onClick={reset} disabled={busy} className={`${popButton("white", "md")} mt-6 disabled:opacity-70`}>
          {busy ? "Resetting…" : "Reset owner password"}
        </button>
      )}
      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
      {creds && (
        <div className="mt-6">
          <CredentialsCard title="New owner password" email={creds.email} password={creds.temporaryPassword} />
        </div>
      )}
    </section>
  );
}

function StatusSection({ salon, onSaved }: { salon: PlatformSalonDetail; onSaved: (s: PlatformSalonDetail) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !salon.isActive;
    const question = next
      ? `Reactivate ${salon.name}? Its shop page and logins will work again.`
      : `Disable ${salon.name}? Its shop page will disappear and its staff will be signed out. Nothing is deleted.`;
    if (!window.confirm(question)) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await updatePlatformSalon(salon.id, { isActive: next }));
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${card} ${salon.isActive ? "" : "bg-tomato/15"}`} aria-labelledby="status-h">
      <h2 id="status-h" className="font-chunky text-2xl font-extrabold">Status</h2>
      <p className="mt-2 font-medium text-plum/80">
        {salon.isActive
          ? "Active: the shop page is public and staff can sign in."
          : "Disabled: the shop page returns “not found” and staff cannot sign in."}
      </p>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`${popButton(salon.isActive ? "tomato" : "mint", "md")} mt-5 disabled:opacity-70`}
      >
        {busy ? "Saving…" : salon.isActive ? "Disable salon" : "Reactivate salon"}
      </button>
      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
    </section>
  );
}

export default function PlatformSalonPage() {
  const { id } = useParams<{ id: string }>();
  const { data: salon, error, isLoading, refresh, setData } = useAdminData(
    (signal) => getPlatformSalon(id, { signal }),
    [id],
  );
  const onSaved = (s: PlatformSalonDetail) => setData(() => s);

  if (isLoading && !salon) return <p className="font-bold text-plum/60" role="status">Loading salon…</p>;
  if (error && !salon)
    return (
      <div role="alert" className="rounded-2xl border-2 border-plum bg-tomato/25 p-4 font-semibold">
        {error}{" "}
        <Link href="/platform" className="font-bold underline">
          Back to salons
        </Link>
      </div>
    );
  if (!salon) return null;

  return (
    <div>
      <Link href="/platform" className="text-sm font-bold text-plum underline-offset-2 hover:underline">
        ← All salons
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-chunky text-5xl font-extrabold tracking-tight">{salon.name}</h1>
          <p className="mt-1 font-mono text-sm font-semibold text-plum/70">/s/{salon.slug}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className={`rounded-full border-2 border-plum px-4 py-2 text-sm font-bold ${salon.isActive ? "bg-mint" : "bg-tomato/40"}`}>
            {salon.isActive ? "Active" : "Disabled"}
          </span>
          {salon.isActive && (
            <a href={`/s/${salon.slug}`} target="_blank" rel="noreferrer" className={popButton("white", "md")}>
              View shop page ↗
            </a>
          )}
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Bookings", salon.counts.appointments],
          ["Clients", salon.counts.clients],
          ["Team", salon.counts.barbers],
          ["Services", salon.counts.services],
        ].map(([k, v], i) => (
          <div
            key={k}
            className={`rounded-3xl border-[3px] border-plum p-4 shadow-[4px_4px_0_0_#3b1a3f] ${["bg-lilac", "bg-mint", "bg-butter", "bg-white"][i]}`}
          >
            <dt className="text-sm font-bold text-plum/70">{k}</dt>
            <dd className="font-chunky text-3xl font-extrabold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <ProfileSection key={`p-${salon.slug}-${salon.name}`} salon={salon} onSaved={onSaved} />
          <LookSection key={`l-${salon.theme}-${salon.accentColor}`} salon={salon} onSaved={onSaved} />
        </div>
        <div className="flex flex-col gap-8">
          <PlanSection salon={salon} onChanged={refresh} />
          <TeamSection salon={salon} />
          <StatusSection salon={salon} onSaved={onSaved} />
        </div>
      </div>
    </div>
  );
}
