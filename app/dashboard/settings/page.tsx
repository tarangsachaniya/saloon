"use client";

import { useState } from "react";
import { GalleryUploader, ImageUploader } from "@/components/admin/ImageUploader";
import { RefreshIcon } from "@/components/admin/icons";
import { FormError, LoadError, PageHeader } from "@/components/admin/PageHeader";
import { ToastViewport, useToasts } from "@/components/admin/Toast";
import {
  defaultWeeklyRows,
  WeeklyHoursEditor,
  weeklyRowsFrom,
  weeklyRowToMinutes,
  type WeeklyHoursRow,
} from "@/components/admin/WeeklyHoursEditor";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
} from "@/components/ui";
import { getAdminSettings, updateSettings } from "@/lib/api";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import { useAuth } from "@/lib/auth/useAuth";
import type { SalonSettings } from "@/lib/booking/types";
import { normalizeMapInput, osmEmbedUrl, parseLocation } from "@/lib/geo";
import { formatDuration } from "@/lib/utils/time";
import {
  bookingRulesSchema,
  openingHourRowSchema,
  salonProfileSchema,
} from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/booking";
import { AdminFormSkeleton } from "@/components/loading/admin";

/**
 * Salon settings, in three independently-savable cards.
 *
 * WHY THREE SAVE BUTTONS AND NOT ONE: `PATCH /api/dashboard/settings` accepts any
 * subset of fields, the three groups are validated by three different schemas
 * (`salonProfileSchema`, `bookingRulesSchema`, the opening-hours array), and
 * they are edited on completely different occasions — a new phone number is a
 * two-second job that should not be blocked by an unrelated half-finished
 * change to Thursday's closing time. Each card sends only its own fields.
 *
 * The opening-hours editor is the SAME component the barber schedule uses; see
 * `components/admin/WeeklyHoursEditor.tsx` for why that is shared.
 */
/** Salon settings are the owner's: a worker login only records its own offline data. */
export default function SettingsPage() {
  const { user } = useAuth();
  if (user && user.role !== "OWNER") {
    return (
      <>
        <PageHeader title="Settings" />
        <EmptyState title="Owner access only" description="Only the salon owner can change the salon's settings." />
      </>
    );
  }
  return <SettingsEditor />;
}

function SettingsEditor() {
  const { toasts, push, dismiss } = useToasts();

  const { data, error, isLoading, isRefreshing, refresh } = useAdminData(
    (signal) => getAdminSettings({ signal }),
    [],
  );

  return (
    <>
      <PageHeader
        title="Settings"
        description="Salon details, booking rules and opening hours."
        actions={
          <Button
            variant="outline"
            onClick={refresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshIcon className="h-4 w-4" />}
          >
            Reload
          </Button>
        }
      />

      {isLoading && <AdminFormSkeleton label="Loading settings…" />}

      {error && !data && <LoadError message={error} onRetry={refresh} />}

      {data && (
        <div className="flex flex-col gap-5">
          {/* Keyed on the loaded values so a Reload genuinely resets the forms. */}
          <ProfileCard key={`profile-${data.name}`} settings={data} onSaved={push} />
          <PhotosCard key={`photos-${data.images?.coverUrl ?? ""}-${data.images?.gallery.length ?? 0}`} settings={data} onSaved={push} />
          <RulesCard
            key={`rules-${data.slotIntervalMinutes}`}
            settings={data}
            onSaved={push}
          />
          <HoursCard
            key={`hours-${data.openingHours.length}`}
            settings={data}
            onSaved={push}
          />
        </div>
      )}

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

type Push = (tone: "success" | "danger" | "info", text: string) => void;

/* -------------------------------------------------------------------------- */
/* Photos (cover + gallery, uploaded to S3)                                   */
/* -------------------------------------------------------------------------- */

function PhotosCard({ settings, onSaved }: { settings: SalonSettings; onSaved: Push }) {
  const [cover, setCover] = useState<string | null>(settings.images?.coverUrl ?? null);
  const [gallery, setGallery] = useState<string[]>(settings.images?.gallery ?? []);

  /** Save right away so an uploaded photo is never lost; throws so the uploader shows the error. */
  async function save(patch: { coverUrl?: string | null; gallery?: string[] }) {
    await updateSettings(patch as never);
    onSaved("success", "Photos saved.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
        <CardDescription>
          The cover and gallery shown on your public salon page. JPEG, PNG or WebP, up to 5 MB each.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ImageUploader
          label="Cover photo"
          kind="cover"
          value={cover}
          onChange={async (url) => {
            await save({ coverUrl: url });
            setCover(url);
          }}
        />
        <GalleryUploader
          values={gallery}
          onChange={async (urls) => {
            await save({ gallery: urls });
            setGallery(urls);
          }}
        />
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Salon profile                                                              */
/* -------------------------------------------------------------------------- */

function ProfileCard({
  settings,
  onSaved,
}: {
  settings: SalonSettings;
  onSaved: Push;
}) {
  const [name, setName] = useState(settings.name ?? "");
  const [logo, setLogo] = useState(settings.logo ?? "");
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [email, setEmail] = useState(settings.email ?? "");
  const [address, setAddress] = useState(settings.address ?? "");

  /**
   * Single "location" field. Accepts:
   *  • Decimal coordinates: "28.6139, 77.2090" or "28.6139 77.2090"
   *  • Full OpenStreetMap URL: openstreetmap.org/?mlat=… or #map=17/…
   *  • Full Google Maps URL: google.com/maps/@…  or …!3d…!4d…
   *  • OSM embed URL (stored form) — round-trips perfectly
   *
   * Short links (goo.gl/maps, maps.app.goo.gl) are NOT supported (SSRF risk)
   * and show a friendly message explaining what to do instead.
   */
  const [locationInput, setLocationInput] = useState(() => {
    // Reconstruct a human-readable "lat, lng" from the stored embed URL.
    if (!settings.mapUrl) return "";
    const m = settings.mapUrl.match(/marker=(-?[\d.]+),(-?[\d.]+)/);
    return m ? `${m[1]}, ${m[2]}` : settings.mapUrl;
  });
  const [locationError, setLocationError] = useState<string | null>(null);

  // Derive a live preview embed URL from whatever the admin has typed.
  const previewEmbed = (() => {
    if (!locationInput.trim()) return null;
    const r = parseLocation(locationInput);
    if (!r.ok) return null;
    return osmEmbedUrl(r.point);
  })();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    // Validate location first (independent of the profile schema).
    let resolvedMapUrl: string | null = null;
    if (locationInput.trim()) {
      const geo = normalizeMapInput(locationInput);
      if ("error" in geo) {
        setLocationError(geo.error);
        return;
      }
      resolvedMapUrl = geo.value;
    }
    setLocationError(null);

    const parsed = salonProfileSchema.safeParse({ name, logo, phone, email, address });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSaving(true);
    try {
      await updateSettings({
        name: parsed.data.name,
        logo: parsed.data.logo ? parsed.data.logo : null,
        phone: parsed.data.phone,
        email: parsed.data.email ? parsed.data.email : null,
        address: parsed.data.address ? parsed.data.address : null,
        mapUrl: resolvedMapUrl,
      } as never);
      onSaved("success", "Salon details saved.");
    } catch (cause) {
      setFormError(toErrorMessage(cause));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salon details</CardTitle>
        <CardDescription>
          Shown on the public site and on booking confirmation emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Salon name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
          />
          <Input
            label="Phone"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={errors.phone}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
          />
          <ImageUploader label="Logo" kind="logo" round value={logo || null} onChange={(url) => setLogo(url ?? "")} />
        </div>

        <Input
          label="Address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          error={errors.address}
        />

        {/* ---- Map location ---- */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <svg className="h-4 w-4 text-secondary-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Map Location
              </h4>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                Paste coordinates, an OpenStreetMap link, or a Google Maps link to pin your salon on the public page.
              </p>
            </div>
            {locationInput && (
              <button
                type="button"
                onClick={() => { setLocationInput(""); setLocationError(null); }}
                className="shrink-0 text-xs text-danger hover:underline mt-0.5"
              >
                Clear
              </button>
            )}
          </div>

          {/* Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">
              Coordinates or map link
            </label>
            <input
              type="text"
              value={locationInput}
              onChange={(e) => { setLocationInput(e.target.value); setLocationError(null); }}
              placeholder="e.g.  28.6139, 77.2090  or  https://maps.app.goo.gl/…"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
            {locationError ? (
              <p className="text-xs text-danger font-medium">{locationError}</p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Accepts: <span className="font-semibold">lat, lng</span> · OpenStreetMap URL ·
                Google Maps URL &nbsp;—&nbsp; short links (goo.gl/maps) not supported
              </p>
            )}
          </div>

          {/* Quick-help chips */}
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.openstreetmap.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
              OpenStreetMap
            </a>
            <a
              href="https://maps.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
              Google Maps
            </a>
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500">
              ℹ Right-click on the map → &ldquo;Show address&rdquo; to get coordinates
            </span>
          </div>

          {/* Live preview */}
          {previewEmbed ? (
            <div className="relative h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
              <iframe
                title="Salon location map preview"
                src={previewEmbed}
                className="absolute inset-0 w-full h-[calc(100%+42px)] border-0"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : locationInput.trim() ? (
            <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50">
              <p className="text-xs text-amber-700 font-medium">
                {locationError ?? "Paste a complete map link or coordinates to see preview"}
              </p>
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
              <p className="text-xs text-slate-400">No location set — map will not appear on your public page</p>
            </div>
          )}
        </div>

        <FormError message={formError} />

        <div className="flex justify-end">
          <Button onClick={save} isLoading={isSaving}>
            Save details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Booking rules                                                              */
/* -------------------------------------------------------------------------- */

function RulesCard({
  settings,
  onSaved,
}: {
  settings: SalonSettings;
  onSaved: Push;
}) {
  const [slot, setSlot] = useState(String(settings.slotIntervalMinutes));
  const [minAdvance, setMinAdvance] = useState(
    String(settings.minimumAdvanceBookingMinutes),
  );
  const [maxDays, setMaxDays] = useState(
    String(settings.maximumAdvanceBookingDays),
  );
  const [cancelWindow, setCancelWindow] = useState(
    String(settings.cancellationWindowMinutes),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function num(value: string): number {
    return value.trim() === "" ? Number.NaN : Number(value);
  }

  async function save() {
    const parsed = bookingRulesSchema.safeParse({
      slotIntervalMinutes: num(slot),
      minimumAdvanceBookingMinutes: num(minAdvance),
      maximumAdvanceBookingDays: num(maxDays),
      cancellationWindowMinutes: num(cancelWindow),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSaving(true);
    try {
      await updateSettings(parsed.data);
      onSaved("success", "Booking rules saved.");
    } catch (cause) {
      setFormError(toErrorMessage(cause));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking rules</CardTitle>
        <CardDescription>
          These drive the availability engine — changing them changes which
          slots customers are offered.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Slot interval (minutes)"
            type="number"
            inputMode="numeric"
            min={5}
            max={120}
            step={5}
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
            error={errors.slotIntervalMinutes}
            hint="How far apart start times are generated."
          />
          <Input
            label="Minimum notice (minutes)"
            type="number"
            inputMode="numeric"
            min={0}
            step={5}
            value={minAdvance}
            onChange={(event) => setMinAdvance(event.target.value)}
            error={errors.minimumAdvanceBookingMinutes}
            hint={
              Number.isFinite(num(minAdvance)) && num(minAdvance) > 0
                ? `Today's slots inside the next ${formatDuration(num(minAdvance))} are closed.`
                : "No notice required — customers can book the next slot."
            }
          />
          <Input
            label="Book up to (days ahead)"
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={maxDays}
            onChange={(event) => setMaxDays(event.target.value)}
            error={errors.maximumAdvanceBookingDays}
            hint="How far the customer's calendar opens."
          />
          <Input
            label="Cancellation window (minutes)"
            type="number"
            inputMode="numeric"
            min={0}
            step={15}
            value={cancelWindow}
            onChange={(event) => setCancelWindow(event.target.value)}
            error={errors.cancellationWindowMinutes}
            hint="How close to the appointment a customer may still cancel."
          />
        </div>

        <FormError message={formError} />

        <div className="flex justify-end">
          <Button onClick={save} isLoading={isSaving}>
            Save rules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Opening hours                                                              */
/* -------------------------------------------------------------------------- */

function HoursCard({
  settings,
  onSaved,
}: {
  settings: SalonSettings;
  onSaved: Push;
}) {
  const [rows, setRows] = useState<WeeklyHoursRow[]>(() =>
    settings.openingHours.length > 0
      ? weeklyRowsFrom(settings.openingHours, (row) => ({
          weekday: row.weekday,
          enabled: row.isOpen,
          start: row.openTime,
          end: row.closeTime,
        }))
      : defaultWeeklyRows(true),
  );

  const [rowErrors, setRowErrors] = useState<Partial<Record<number, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const nextErrors: Partial<Record<number, string>> = {};
    for (const row of rows) {
      if (!row.enabled) continue;
      const parsed = openingHourRowSchema.safeParse({
        weekday: row.weekday,
        isOpen: true,
        openTime: row.start ?? Number.NaN,
        closeTime: row.end ?? Number.NaN,
      });
      if (!parsed.success) {
        nextErrors[row.weekday] =
          parsed.error.issues[0]?.message ?? "Invalid times.";
      }
    }

    setRowErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted days.");
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      // All seven rows every time. The backend upserts BY WEEKDAY, so a missing
      // row silently keeps its old value rather than being cleared — sending
      // the full week is the only way "I closed Sundays" actually lands.
      await updateSettings({
        openingHours: rows.map((row) => {
          const { start, end } = weeklyRowToMinutes(row);
          return {
            weekday: row.weekday,
            isOpen: row.enabled,
            openTime: start,
            closeTime: end,
          };
        }),
      });
      onSaved("success", "Opening hours saved.");
    } catch (cause) {
      setFormError(toErrorMessage(cause));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opening hours</CardTitle>
        <CardDescription>
          The outer bound on every booking. A barber working past closing time is
          still cut off here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <WeeklyHoursEditor
          rows={rows}
          onChange={setRows}
          enabledLabel="Open"
          disabledLabel="Closed"
          errors={rowErrors}
          disabled={isSaving}
        />

        <FormError message={formError} />

        <div className="flex justify-end">
          <Button onClick={save} isLoading={isSaving}>
            Save hours
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
