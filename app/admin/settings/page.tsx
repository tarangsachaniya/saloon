"use client";

import Image from "next/image";
import { useState } from "react";
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
  Input,
  Loader,
} from "@/components/ui";
import { getSettings, updateSettings } from "@/lib/api";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import type { SalonSettings } from "@/lib/booking/types";
import { formatDuration } from "@/lib/utils/time";
import {
  bookingRulesSchema,
  openingHourRowSchema,
  salonProfileSchema,
} from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/booking";

/**
 * Salon settings, in three independently-savable cards.
 *
 * WHY THREE SAVE BUTTONS AND NOT ONE: `PATCH /api/admin/settings` accepts any
 * subset of fields, the three groups are validated by three different schemas
 * (`salonProfileSchema`, `bookingRulesSchema`, the opening-hours array), and
 * they are edited on completely different occasions — a new phone number is a
 * two-second job that should not be blocked by an unrelated half-finished
 * change to Thursday's closing time. Each card sends only its own fields.
 *
 * The opening-hours editor is the SAME component the barber schedule uses; see
 * `components/admin/WeeklyHoursEditor.tsx` for why that is shared.
 */
export default function SettingsPage() {
  const { toasts, push, dismiss } = useToasts();

  const { data, error, isLoading, isRefreshing, refresh } = useAdminData(
    (signal) => getSettings({ signal }),
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

      {isLoading && <Loader label="Loading settings…" />}

      {error && !data && <LoadError message={error} onRetry={refresh} />}

      {data && (
        <div className="flex flex-col gap-5">
          {/* Keyed on the loaded values so a Reload genuinely resets the forms. */}
          <ProfileCard key={`profile-${data.name}`} settings={data} onSaved={push} />
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const parsed = salonProfileSchema.safeParse({
      name,
      logo,
      phone,
      email,
      address,
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
      await updateSettings({
        name: parsed.data.name,
        // Empty means "not set", which the columns model as null.
        logo: parsed.data.logo ? parsed.data.logo : null,
        phone: parsed.data.phone,
        email: parsed.data.email ? parsed.data.email : null,
        address: parsed.data.address ? parsed.data.address : null,
      });
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
          <div className="flex flex-col gap-2">
            <Input
              label="Logo URL or Path"
              value={logo}
              onChange={(event) => setLogo(event.target.value)}
              error={errors.logo}
              placeholder="/images/logo-light.png or https://…"
              hint="Public path (/images/...) or web URL."
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-semibold text-slate-500">Presets:</span>
              {[
                { label: "Light Logo", path: "/images/logo-light.png" },
                { label: "Dark Logo", path: "/images/logo.png" },
                { label: "Icon Badge", path: "/images/logo-icon.png" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setLogo(preset.path)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              {logo && (
                <button
                  type="button"
                  onClick={() => setLogo("")}
                  className="text-xs text-danger hover:underline ml-1"
                >
                  Clear
                </button>
              )}
            </div>

            {logo && (
              <div className="mt-1 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-900 p-2 text-white">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/10 p-1">
                  <Image
                    src={logo}
                    alt="Logo Preview"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-white">Logo Preview</span>
                  <span className="block text-[10px] text-slate-400 truncate">{logo}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <Input
          label="Address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          error={errors.address}
        />

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
