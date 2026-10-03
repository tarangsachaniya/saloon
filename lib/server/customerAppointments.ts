import "server-only";

import type { Prisma } from "@prisma/client";

import { minutesToHHMM, salonNow } from "./availability";
import { bucketOf, changeDecision, wallClock } from "./appointmentPolicy";

/** The relations the customer views need, and nothing that identifies other people. */
export const MY_APPOINTMENT_INCLUDE = {
  service: { select: { id: true, name: true, isActive: true } },
  services: {
    orderBy: { sortOrder: "asc" },
    select: { serviceId: true, name: true, price: true, durationMinutes: true, service: { select: { isActive: true } } },
  },
  barber: { select: { id: true, name: true, isActive: true } },
  salon: {
    select: { name: true, slug: true, isActive: true, settings: { select: { cancellationWindowMinutes: true } } },
  },
} satisfies Prisma.AppointmentInclude;

export type MyAppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof MY_APPOINTMENT_INCLUDE }>;

export const UNAVAILABLE_FOR_RESCHEDULE =
  "This service or barber isn't available for rebooking right now. Please contact the salon.";

/**
 * Public shape of one of a customer's own appointments, with the actions the
 * UI may offer already decided by the server. No clientId/userId/notes leave.
 */
/** Every service of the booking is still offered (rows predating multi-service have none: fall back). */
export function servicesActive(a: MyAppointmentRow): boolean {
  return a.services.length ? a.services.every((s) => s.service.isActive) : a.service.isActive;
}

/** The booking's service ids, in order. */
export function bookedServiceIds(a: Pick<MyAppointmentRow, "services" | "serviceId">): string[] {
  return a.services.length ? a.services.map((s) => s.serviceId) : [a.serviceId];
}

export function serializeMyAppointment(a: MyAppointmentRow, now = salonNow()) {
  const window = a.salon.settings?.cancellationWindowMinutes ?? 60;
  const cancel = changeDecision(a, now, window, "cancel");
  let reschedule = changeDecision(a, now, window, "reschedule");
  const active = servicesActive(a);
  if (reschedule.allowed && (!a.salon.isActive || !active || !a.barber.isActive)) {
    reschedule = { allowed: false, reason: UNAVAILABLE_FOR_RESCHEDULE };
  }
  return {
    id: a.id,
    status: a.status,
    bucket: bucketOf(a, now),
    date: a.appointmentDate.toISOString().slice(0, 10),
    startTime: minutesToHHMM(a.startTime),
    endTime: minutesToHHMM(a.endTime),
    durationMinutes: a.durationMinutes,
    price: Number(a.price),
    salon: { name: a.salon.name, slug: a.salon.slug },
    service: {
      id: a.service.id,
      name: a.services.length ? a.services.map((s) => s.name).join(" + ") : a.service.name,
    },
    services: a.services.length
      ? a.services.map((s) => ({
          id: s.serviceId,
          name: s.name,
          price: Number(s.price),
          durationMinutes: s.durationMinutes,
        }))
      : [{ id: a.service.id, name: a.service.name, price: Number(a.price), durationMinutes: a.durationMinutes }],
    barber: { id: a.barber.id, name: a.barber.name },
    canCancel: cancel.allowed,
    cancelBlockedReason: cancel.reason ?? null,
    canReschedule: reschedule.allowed,
    rescheduleBlockedReason: reschedule.reason ?? null,
    canBookAgain: a.salon.isActive && active,
    startsAt: wallClock(a.appointmentDate, a.startTime).getTime(),
  };
}
