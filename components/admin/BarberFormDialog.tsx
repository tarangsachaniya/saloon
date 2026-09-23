"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Loader,
  Select,
  Textarea,
  TimeField,
  Toggle,
} from "@/components/ui";
import { createBarber, getAdminBarber, updateBarber } from "@/lib/api";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import type {
  Barber,
  BarberBreakInput,
  BarberDayOffInput,
  CreateBarberPayload,
  Service,
} from "@/lib/booking/types";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import {
  formatDuration,
  startOfToday,
  toDateString,
  WEEKDAY_LABELS,
} from "@/lib/utils/time";
import {
  barberFormSchema,
  breakRowSchema,
  dayOffRowSchema,
  workingHourRowSchema,
} from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/booking";
import { TrashIcon } from "./icons";
import { FormError, LoadError } from "./PageHeader";
import {
  defaultWeeklyRows,
  WeeklyHoursEditor,
  weeklyRowsFrom,
  weeklyRowToMinutes,
  WEEK_DISPLAY_ORDER,
  type WeeklyHoursRow,
} from "./WeeklyHoursEditor";

/**
 * Add or edit a barber, including their whole weekly schedule.
 *
 * TWO THINGS DRIVE THIS COMPONENT'S SHAPE:
 *
 * 1. The LIST response (`GET /api/barbers`) does not carry working hours,
 *    breaks or days off — only `GET /api/barbers/:id` does. So opening the edit
 *    dialog FETCHES the barber rather than reusing the row already on screen.
 *    Building the form from the list shape would silently show an empty
 *    schedule and then save that emptiness over the real one.
 *
 * 2. The write is a REPLACE, not a patch: any of `workingHours`, `breaks` or
 *    `daysOff` present in the body makes the backend delete every existing row
 *    and recreate from what was sent. That makes point 1 a data-loss bug rather
 *    than a display bug, and it is why all three arrays are always sent in full.
 */

export interface BarberFormDialogProps {
  /** null = create a new barber. */
  barberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  onSaved: (barber: Barber, message: string) => void;
}

export function BarberFormDialog({
  barberId,
  open,
  onOpenChange,
  services,
  onSaved,
}: BarberFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92dvh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {barberId ? (
          <ExistingBarberForm
            key={barberId}
            barberId={barberId}
            services={services}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : (
          <BarberForm
            key="new"
            barber={null}
            services={services}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Fetches the DETAIL shape before the form can be trusted to save. */
function ExistingBarberForm({
  barberId,
  services,
  onCancel,
  onSaved,
}: {
  barberId: string;
  services: Service[];
  onCancel: () => void;
  onSaved: (barber: Barber, message: string) => void;
}) {
  const { data, error, isLoading, refresh } = useAdminData(
    (signal) => getAdminBarber(barberId, { signal }),
    [barberId],
  );

  if (isLoading) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Edit barber</DialogTitle>
        </DialogHeader>
        <div className="py-8">
          <Loader label="Loading schedule…" />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Edit barber</DialogTitle>
        </DialogHeader>
        <div className="mt-5">
          <LoadError
            message={error ?? "This barber could not be loaded."}
            onRetry={refresh}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <BarberForm
      barber={data}
      services={services}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 pt-5 first:border-0 first:pt-0">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {description && (
        <p className="mt-0.5 mb-3 text-sm text-slate-600">{description}</p>
      )}
      <div className={description ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

interface BreakDraft extends BarberBreakInput {
  /** Stable key for React — break rows have no id until they are saved. */
  key: string;
  startTime: number;
  endTime: number;
}

interface DayOffDraft extends BarberDayOffInput {
  key: string;
}

let draftCounter = 0;
function nextKey(): string {
  draftCounter += 1;
  return `draft-${draftCounter}`;
}

function BarberForm({
  barber,
  services,
  onCancel,
  onSaved,
}: {
  barber: Barber | null;
  services: Service[];
  onCancel: () => void;
  onSaved: (barber: Barber, message: string) => void;
}) {
  const isEdit = barber !== null;
  const today = useMemo(() => startOfToday(), []);

  const [name, setName] = useState(barber?.name ?? "");
  const [phone, setPhone] = useState(barber?.phone ?? "");
  const [email, setEmail] = useState(barber?.email ?? "");
  const [photo, setPhoto] = useState(barber?.photo ?? "");
  const [bio, setBio] = useState(barber?.bio ?? "");
  const [specializations, setSpecializations] = useState(
    (barber?.specializations ?? []).join(", "),
  );
  const [isActive, setIsActive] = useState(barber?.isActive ?? true);

  const [serviceIds, setServiceIds] = useState<string[]>(
    () => (barber?.services ?? []).map((service) => service.id),
  );

  const [hours, setHours] = useState<WeeklyHoursRow[]>(() =>
    barber
      ? weeklyRowsFrom(barber.workingHours, (row) => ({
          weekday: row.weekday,
          enabled: row.isWorking,
          start: row.startTime,
          end: row.endTime,
        }))
      : // A new barber defaults to the salon's own Mon–Sat pattern, which is
        // right far more often than an empty week and is one toggle to change.
        defaultWeeklyRows(true),
  );

  const [breaks, setBreaks] = useState<BreakDraft[]>(() =>
    (barber?.breaks ?? []).map((row) => ({
      key: row.id,
      weekday: row.weekday,
      startTime: row.startTime,
      endTime: row.endTime,
      label: row.label ?? "",
    })),
  );

  const [daysOff, setDaysOff] = useState<DayOffDraft[]>(() =>
    (barber?.daysOff ?? []).map((row) => ({
      key: row.id,
      date: row.date,
      reason: row.reason ?? "",
    })),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hourErrors, setHourErrors] = useState<Partial<Record<number, string>>>({});
  const [breakErrors, setBreakErrors] = useState<Record<number, string>>({});
  const [dayOffErrors, setDayOffErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "services" | "schedule">("profile");
  const [scheduleSubTab, setScheduleSubTab] = useState<"hours" | "breaks" | "daysoff">("hours");

  const bookableServices = useMemo(
    () =>
      services.filter(
        (service) => service.isActive || serviceIds.includes(service.id),
      ),
    [services, serviceIds],
  );

  function toggleService(id: string) {
    setServiceIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function addBreak() {
    setBreaks((current) => [
      ...current,
      // 13:00–14:00 — the seeded salon's lunch, and the break an admin adds
      // nine times out of ten.
      { key: nextKey(), weekday: 1, startTime: 780, endTime: 840, label: "Lunch" },
    ]);
  }

  function addDayOff() {
    setDaysOff((current) => [
      ...current,
      { key: nextKey(), date: toDateString(today), reason: "Holiday" },
    ]);
  }

  /** Runs every schema and returns true when the whole form is clean. */
  function validate(): boolean {
    const basics = barberFormSchema.safeParse({
      name,
      phone,
      email,
      photo,
      bio,
      specializations,
      isActive,
      serviceIds,
    });

    const nextHourErrors: Partial<Record<number, string>> = {};
    hours.forEach((row) => {
      const { start, end } = weeklyRowToMinutes(row);
      const parsed = workingHourRowSchema.safeParse({
        weekday: row.weekday,
        isWorking: row.enabled,
        startTime: start,
        endTime: end,
      });
      if (!parsed.success) {
        nextHourErrors[row.weekday] =
          parsed.error.issues[0]?.message ?? "Invalid hours.";
      }
    });

    const nextBreakErrors: Record<number, string> = {};
    breaks.forEach((row, index) => {
      const parsed = breakRowSchema.safeParse({
        weekday: row.weekday,
        startTime: row.startTime,
        endTime: row.endTime,
        label: row.label ?? "",
      });
      if (!parsed.success) {
        nextBreakErrors[index] = parsed.error.issues[0]?.message ?? "Invalid break.";
        return;
      }
      // A break outside the barber's own hours that day is silently ignored by
      // the availability engine, so it is almost certainly a mistake.
      const day = hours[row.weekday];
      if (
        day?.enabled &&
        day.start !== null &&
        day.end !== null &&
        (row.startTime < day.start || row.endTime > day.end)
      ) {
        nextBreakErrors[index] =
          `This break falls outside ${WEEKDAY_LABELS[row.weekday]}'s working hours.`;
      }
    });

    const nextDayOffErrors: Record<number, string> = {};
    const seenDates = new Set<string>();
    daysOff.forEach((row, index) => {
      const parsed = dayOffRowSchema.safeParse({
        date: row.date,
        reason: row.reason ?? "",
      });
      if (!parsed.success) {
        nextDayOffErrors[index] = parsed.error.issues[0]?.message ?? "Invalid date.";
        return;
      }
      if (seenDates.has(row.date)) {
        nextDayOffErrors[index] = "This date is already listed.";
        return;
      }
      seenDates.add(row.date);
    });

    setErrors(basics.success ? {} : fieldErrors(basics.error));
    setHourErrors(nextHourErrors);
    setBreakErrors(nextBreakErrors);
    setDayOffErrors(nextDayOffErrors);

    if (!basics.success) {
      setActiveTab("profile");
    } else if (
      Object.keys(nextHourErrors).length > 0 ||
      Object.keys(nextBreakErrors).length > 0 ||
      Object.keys(nextDayOffErrors).length > 0
    ) {
      setActiveTab("schedule");
      if (Object.keys(nextBreakErrors).length > 0) {
        setScheduleSubTab("breaks");
      } else if (Object.keys(nextDayOffErrors).length > 0) {
        setScheduleSubTab("daysoff");
      } else {
        setScheduleSubTab("hours");
      }
    }

    return (
      basics.success &&
      Object.keys(nextHourErrors).length === 0 &&
      Object.keys(nextBreakErrors).length === 0 &&
      Object.keys(nextDayOffErrors).length === 0
    );
  }

  async function save() {
    if (!validate()) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setFormError(null);
    setIsSaving(true);

    const payload: CreateBarberPayload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      photo: photo.trim() || null,
      bio: bio.trim() || null,
      specializations: specializations
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      isActive,
      serviceIds,
      // All seven rows every time: the backend replaces the set wholesale, so
      // an omitted weekday is a deleted weekday.
      workingHours: hours.map((row) => {
        const { start, end } = weeklyRowToMinutes(row);
        return {
          weekday: row.weekday,
          isWorking: row.enabled,
          startTime: start,
          endTime: end,
        };
      }),
      breaks: breaks.map((row) => ({
        weekday: row.weekday,
        startTime: row.startTime,
        endTime: row.endTime,
        label: row.label?.trim() ? row.label.trim() : null,
      })),
      daysOff: daysOff.map((row) => ({
        date: row.date,
        reason: row.reason?.trim() ? row.reason.trim() : null,
      })),
    };

    try {
      const saved = isEdit
        ? await updateBarber(barber.id, payload)
        : await createBarber(payload);
      onSaved(saved, isEdit ? "Barber updated." : "Barber added.");
    } catch (cause) {
      setFormError(toErrorMessage(cause));
    } finally {
      setIsSaving(false);
    }
  }

  const weekdayOptions = WEEK_DISPLAY_ORDER.map((weekday) => ({
    value: String(weekday),
    label: WEEKDAY_LABELS[weekday],
  }));

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? `Edit ${barber.name}` : "Add a barber"}</DialogTitle>
        <DialogDescription>
          Working hours, breaks and days off feed the availability engine
          directly — what you set here is what customers can book.
        </DialogDescription>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-3 -mb-1 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all",
              activeTab === "profile"
                ? "border-secondary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            <span>1. Profile Details</span>
            {errors.name && <span className="h-1.5 w-1.5 rounded-full bg-danger" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all",
              activeTab === "services"
                ? "border-secondary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            <span>2. Services</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {serviceIds.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all",
              activeTab === "schedule"
                ? "border-secondary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            <span>3. Working Schedule</span>
            {(Object.keys(hourErrors).length > 0 ||
              Object.keys(breakErrors).length > 0 ||
              Object.keys(dayOffErrors).length > 0) && (
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
            )}
          </button>
        </div>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-4">
        {/* TAB 1: PROFILE DETAILS */}
        {activeTab === "profile" && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                error={errors.name}
                placeholder="Rahul"
              />
              <Input
                label="Phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                error={errors.phone}
                placeholder="+91 91234 00001"
                hint="Optional."
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
                hint="Optional."
              />
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Photo URL or Path"
                  value={photo}
                  onChange={(event) => setPhoto(event.target.value)}
                  error={errors.photo}
                  placeholder="/images/barbers/barber-rahul.jpg or https://…"
                  hint="Web URL or local path (/images/barbers/...)."
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
                  {[
                    { label: "Rahul", path: "/images/barbers/barber-rahul.jpg" },
                    { label: "Akash", path: "/images/barbers/barber-akash.jpg" },
                    { label: "Jay", path: "/images/barbers/barber-jay.jpg" },
                    { label: "Karan", path: "/images/barbers/barber-karan.jpg" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPhoto(preset.path)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-secondary transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                  {photo && (
                    <button
                      type="button"
                      onClick={() => setPhoto("")}
                      className="text-xs text-danger hover:underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {photo && (
                  <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                      <Image
                        src={photo}
                        alt="Photo Preview"
                        fill
                        className="object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-primary">Live Photo Preview</span>
                      <span className="block text-[11px] text-slate-500 truncate">{photo}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Specializations"
                value={specializations}
                onChange={(event) => setSpecializations(event.target.value)}
                error={errors["specializations"]}
                placeholder="Hair Stylist, Styling, Coloring"
                hint="Separate each one with a comma."
              />

              <Textarea
                label="Bio"
                rows={2}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                error={errors.bio}
              />
            </div>

            <Toggle
              checked={isActive}
              onCheckedChange={setIsActive}
              label="Taking bookings"
              description={
                isActive
                  ? "Shown in the booking wizard."
                  : "Hidden from customers. Existing appointments are unaffected."
              }
              block
            />
          </div>
        )}

        {/* TAB 2: SERVICES */}
        {activeTab === "services" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <p className="text-xs text-slate-500">
                {serviceIds.length} of {bookableServices.length} services assigned to this barber
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setServiceIds(bookableServices.map((s) => s.id))}
                  className="text-xs font-semibold text-secondary hover:underline"
                >
                  Select all
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setServiceIds([])}
                  className="text-xs font-semibold text-slate-500 hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>

            {bookableServices.length === 0 ? (
              <p className="text-sm text-slate-600">
                No services exist yet — add some on the Services screen first.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-3">
                {bookableServices.map((service) => {
                  const checked = serviceIds.includes(service.id);
                  return (
                    <li key={service.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                          checked
                            ? "border-secondary bg-secondary-50"
                            : "border-slate-200 hover:border-secondary-200 hover:bg-secondary-50/40",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleService(service.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#0d9488]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-primary">
                            {service.name}
                            {!service.isActive && (
                              <span className="ml-1 text-xs font-normal text-slate-500">
                                (inactive)
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {serviceIds.length === 0 && bookableServices.length > 0 && (
              <p className="text-xs font-semibold text-warning">
                With no services selected this barber cannot be booked for anything.
              </p>
            )}
          </div>
        )}

        {/* TAB 3: SCHEDULE & BREAKS */}
        {activeTab === "schedule" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setScheduleSubTab("hours")}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                  scheduleSubTab === "hours"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                Weekly Working Hours (7 days)
              </button>
              <button
                type="button"
                onClick={() => setScheduleSubTab("breaks")}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                  scheduleSubTab === "breaks"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                Recurring Breaks {breaks.length > 0 && `(${breaks.length})`}
              </button>
              <button
                type="button"
                onClick={() => setScheduleSubTab("daysoff")}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                  scheduleSubTab === "daysoff"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                Days Off {daysOff.length > 0 && `(${daysOff.length})`}
              </button>
            </div>

            {scheduleSubTab === "hours" && (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Intersected with the salon&rsquo;s own opening hours — whichever is narrower wins.
                </p>
                <WeeklyHoursEditor
                  rows={hours}
                  onChange={setHours}
                  enabledLabel="Working"
                  disabledLabel="Not working"
                  errors={hourErrors}
                  disabled={isSaving}
                />
              </div>
            )}

            {scheduleSubTab === "breaks" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500 mb-1">
                  Repeat every week — lunch, school run, or recurring unavailable slot.
                </p>
                {breaks.length === 0 && (
                  <p className="text-sm text-slate-500 py-3 text-center rounded-lg border border-dashed border-slate-200">
                    No recurring breaks set for this barber.
                  </p>
                )}
                {breaks.map((row, index) => (
                  <div
                    key={row.key}
                    className={cn(
                      "rounded-lg border px-3 py-2",
                      breakErrors[index]
                        ? "border-danger/40 bg-red-50/40"
                        : "border-slate-200",
                    )}
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <Select
                        aria-label="Break weekday"
                        options={weekdayOptions}
                        value={String(row.weekday)}
                        onValueChange={(value) =>
                          setBreaks((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, weekday: Number(value) } : item,
                            ),
                          )
                        }
                        containerClassName="w-36"
                      />
                      <TimeField
                        value={row.startTime}
                        onChange={(minutes) =>
                          setBreaks((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, startTime: minutes ?? 0 }
                                : item,
                            ),
                          )
                        }
                        label="From"
                        containerClassName="w-28"
                      />
                      <TimeField
                        value={row.endTime}
                        onChange={(minutes) =>
                          setBreaks((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, endTime: minutes ?? 0 }
                                : item,
                            ),
                          )
                        }
                        label="To"
                        containerClassName="w-28"
                      />
                      <Input
                        value={row.label ?? ""}
                        onChange={(event) =>
                          setBreaks((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, label: event.target.value }
                                : item,
                            ),
                          )
                        }
                        aria-label="Break label"
                        placeholder="Lunch"
                        containerClassName="min-w-[7rem] flex-1"
                        className="py-2"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Remove break"
                        className="text-danger hover:bg-red-50"
                        onClick={() =>
                          setBreaks((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    {breakErrors[index] && (
                      <p role="alert" className="mt-1.5 text-sm font-semibold text-danger">
                        {breakErrors[index]}
                      </p>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addBreak} className="self-start mt-1">
                  + Add a break
                </Button>
              </div>
            )}

            {scheduleSubTab === "daysoff" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500 mb-1">
                  Specific dates when this barber is absent (holiday, illness, training).
                </p>
                {daysOff.length === 0 && (
                  <p className="text-sm text-slate-500 py-3 text-center rounded-lg border border-dashed border-slate-200">
                    No days off scheduled.
                  </p>
                )}
                {daysOff.map((row, index) => (
                  <div
                    key={row.key}
                    className={cn(
                      "rounded-lg border px-3 py-2",
                      dayOffErrors[index]
                        ? "border-danger/40 bg-red-50/40"
                        : "border-slate-200",
                    )}
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(event) =>
                          setDaysOff((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, date: event.target.value } : item,
                            ),
                          )
                        }
                        aria-label="Day off date"
                        containerClassName="w-44"
                        className="py-2"
                      />
                      <Input
                        value={row.reason ?? ""}
                        onChange={(event) =>
                          setDaysOff((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, reason: event.target.value } : item,
                            ),
                          )
                        }
                        aria-label="Reason"
                        placeholder="Reason (optional)"
                        containerClassName="min-w-[8rem] flex-1"
                        className="py-2"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Remove day off"
                        className="text-danger hover:bg-red-50"
                        onClick={() =>
                          setDaysOff((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    {dayOffErrors[index] && (
                      <p role="alert" className="mt-1.5 text-sm font-semibold text-danger">
                        {dayOffErrors[index]}
                      </p>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addDayOff} className="self-start mt-1">
                  + Add a day off
                </Button>
              </div>
            )}
          </div>
        )}

        <FormError message={formError} />
      </div>

      <DialogFooter className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {activeTab === "profile" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab("services")}
            >
              Next: Services →
            </Button>
          )}
          {activeTab === "services" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab("schedule")}
            >
              Next: Schedule →
            </Button>
          )}
          <Button onClick={save} isLoading={isSaving}>
            {isEdit ? "Save changes" : "Add barber"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
