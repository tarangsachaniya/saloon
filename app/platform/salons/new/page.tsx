"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { popButton } from "@/components/marketing/pop/ui";
import {
  AccentPicker,
  card,
  CredentialsCard,
  EMPTY_PLAN,
  Field,
  planFromDraft,
  planPreview,
  PlanFields,
  slugify,
  ThemePicker,
  type PlanDraft,
} from "@/components/platform/fields";
import { toErrorMessage } from "@/lib/admin/useAdminData";
import { createPlatformSalon, fieldErrorsOf, type Credentials } from "@/lib/api/platform";
import { HEX_COLOR, readableOn, resolveAccent, THEMES, type ThemeId } from "@/lib/themes";

type Created = { id: string; slug: string; name: string; credentials: Credentials };

export default function NewSalonPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [tagline, setTagline] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [theme, setTheme] = useState<ThemeId>("SPA");
  const [accent, setAccent] = useState<string | null>(null);
  const [owner, setOwner] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "" });
  const [plan, setPlan] = useState<PlanDraft>(EMPTY_PLAN);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const shownSlug = slugEdited ? slug : slugify(name);
  const accentResolved = resolveAccent(theme, accent);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);

    const next: Record<string, string> = {};
    if (name.trim().length < 2) next["salon.name"] = "Enter the salon's name.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(shownSlug) || shownSlug.length < 2)
      next["salon.slug"] = "Use lowercase letters, numbers and single hyphens.";
    if (accent && !HEX_COLOR.test(accent)) next["salon.accentColor"] = "Use a colour like #7d8f7a.";
    if (!owner.firstName.trim()) next["owner.firstName"] = "Enter the owner's first name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email.trim())) next["owner.email"] = "Enter a valid email.";
    const planResult = planFromDraft(plan);
    if ("error" in planResult) next.plan = planResult.error;
    setErrors(next);
    if (Object.keys(next).length > 0 || "error" in planResult) {
      setFailure("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await createPlatformSalon({
        salon: {
          name: name.trim(),
          slug: shownSlug,
          tagline: tagline.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          theme,
          accentColor: accent,
        },
        owner: {
          firstName: owner.firstName.trim(),
          lastName: owner.lastName.trim() || null,
          email: owner.email.trim(),
          phoneNumber: owner.phoneNumber.trim() || null,
        },
        plan: planResult.plan,
      });
      setCreated({ ...res.salon, credentials: res.credentials });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const fe = fieldErrorsOf(error);
      setErrors(fe);
      setFailure(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <span className="inline-block -rotate-2 rounded-full border-2 border-plum bg-mint px-4 py-1 text-sm font-bold">
            Salon created ✓
          </span>
          <h1 className="mt-4 font-chunky text-5xl font-extrabold tracking-tight">{created.name} is live!</h1>
          <p className="mt-2 font-medium text-plum/75">
            Its shop page, booking settings, a default week of opening hours and the owner login are ready.
          </p>
        </div>
        <CredentialsCard
          title="Owner sign-in details"
          email={created.credentials.email}
          password={created.credentials.temporaryPassword}
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/platform/salons/${created.id}`} className={popButton("plum", "md")}>
            Manage salon →
          </Link>
          <a href={`/s/${created.slug}`} target="_blank" rel="noreferrer" className={popButton("white", "md")}>
            View shop page ↗
          </a>
          <Link href="/platform" className={popButton("butter", "md")}>
            Back to salons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <Link href="/platform" className="text-sm font-bold text-plum underline-offset-2 hover:underline">
        ← All salons
      </Link>
      <h1 className="mt-3 font-chunky text-5xl font-extrabold tracking-tight">New salon</h1>
      <p className="mt-1 font-medium text-plum/75">Create the salon, its owner login and how it pays.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-8">
          <section className={card} aria-labelledby="s1">
            <h2 id="s1" className="font-chunky text-2xl font-extrabold">1. The salon</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="Salon name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors["salon.name"]}
                maxLength={120}
                className="sm:col-span-2"
              />
              <Field
                label="Web address"
                required
                value={shownSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                error={errors["salon.slug"]}
                hint={
                  <>
                    Shop page: <span className="font-mono font-bold">/s/{shownSlug || "your-salon"}</span>
                  </>
                }
                maxLength={60}
                className="sm:col-span-2"
              />
              <Field
                label="Tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={160}
                hint="One line shown under the name, e.g. “Precision cuts since 2012”."
                className="sm:col-span-2"
                error={errors["salon.tagline"]}
              />
              <Field label="Salon phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} error={errors["salon.phone"]} />
              <Field label="Salon email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={180} error={errors["salon.email"]} />
              <Field
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={300}
                hint="Street, area, city. The city is shown on salon cards."
                className="sm:col-span-2"
                error={errors["salon.address"]}
              />
            </div>
          </section>

          <section className={card} aria-labelledby="s2">
            <h2 id="s2" className="font-chunky text-2xl font-extrabold">2. Look &amp; feel</h2>
            <p className="mt-1 text-sm font-medium text-plum/70">The owner can change this later from their dashboard.</p>
            <div className="mt-6 flex flex-col gap-6">
              <ThemePicker value={theme} onChange={setTheme} />
              <AccentPicker theme={theme} value={accent} onChange={setAccent} error={errors["salon.accentColor"]} />
            </div>
          </section>

          <section className={card} aria-labelledby="s3">
            <h2 id="s3" className="font-chunky text-2xl font-extrabold">3. Owner login</h2>
            <p className="mt-1 text-sm font-medium text-plum/70">
              We&apos;ll generate a temporary password and show it to you once.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="First name"
                required
                value={owner.firstName}
                onChange={(e) => setOwner({ ...owner, firstName: e.target.value })}
                error={errors["owner.firstName"]}
                maxLength={80}
              />
              <Field
                label="Last name"
                value={owner.lastName}
                onChange={(e) => setOwner({ ...owner, lastName: e.target.value })}
                maxLength={80}
              />
              <Field
                label="Owner email (their login)"
                type="email"
                required
                value={owner.email}
                onChange={(e) => setOwner({ ...owner, email: e.target.value })}
                error={errors["owner.email"]}
                maxLength={180}
              />
              <Field
                label="Owner phone"
                type="tel"
                value={owner.phoneNumber}
                onChange={(e) => setOwner({ ...owner, phoneNumber: e.target.value })}
                maxLength={30}
              />
            </div>
          </section>

          <section className={card} aria-labelledby="s4">
            <h2 id="s4" className="font-chunky text-2xl font-extrabold">4. Billing plan</h2>
            <div className="mt-6">
              <PlanFields value={plan} onChange={setPlan} error={errors.plan ?? errors["plan.monthlyFee"] ?? errors["plan.commissionValue"]} />
            </div>
          </section>
        </div>

        {/* Live summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border-[3px] border-plum bg-butter p-6 shadow-[6px_6px_0_0_#3b1a3f]">
            <p className="text-sm font-bold text-plum/70">Summary</p>
            <div
              className="mt-3 overflow-hidden rounded-2xl border-2 border-plum"
              style={{ background: THEMES[theme].swatch[0] }}
            >
              <div className="p-4" style={{ color: THEMES[theme].swatch[2] }}>
                <p className="font-chunky text-xl font-extrabold leading-tight">{name || "Salon name"}</p>
                <p className="text-sm opacity-75">{tagline || THEMES[theme].name}</p>
                <span
                  className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: accentResolved, color: readableOn(accentResolved) }}
                >
                  Book now
                </span>
              </div>
            </div>
            <dl className="mt-5 flex flex-col gap-2 text-sm">
              <div>
                <dt className="font-bold text-plum/60">Address</dt>
                <dd className="break-all font-mono font-bold">/s/{shownSlug || "…"}</dd>
              </div>
              <div>
                <dt className="font-bold text-plum/60">Theme</dt>
                <dd className="font-bold">{THEMES[theme].name}</dd>
              </div>
              <div>
                <dt className="font-bold text-plum/60">Owner</dt>
                <dd className="break-all font-bold">{owner.email || "…"}</dd>
              </div>
              <div>
                <dt className="font-bold text-plum/60">Plan</dt>
                <dd className="font-bold">{planPreview(plan)}</dd>
              </div>
            </dl>

            {failure && (
              <p role="alert" className="mt-5 rounded-2xl border-2 border-plum bg-tomato/30 px-3 py-2 text-sm font-bold">
                {failure}
              </p>
            )}

            <button type="submit" disabled={saving} className={`${popButton("plum")} mt-6 w-full disabled:opacity-70`}>
              {saving ? "Creating…" : "Create salon →"}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
