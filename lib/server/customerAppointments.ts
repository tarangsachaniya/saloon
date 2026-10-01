import "server-only";

import type { Prisma } from "@prisma/client";

import { minutesToHHMM, salonNow } from "./availability";
import { bucketOf, changeDecision, wallClock } from "./appointmentPolicy";

/** The relations the customer views need, and nothing that identifies other people. */
export const MY_APPOINTMENT_INCLUDE = {
  service: { select: { id: true, name: true, isActive: true } },
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
export function serializeMyAppointment(a: MyAppointmentRow, now = salonNow()) {
  const window = a.salon.settings?.cancellationWindowMinutes ?? 60;
  const cancel = changeDecision(a, now, window, "cancel");
  let reschedule = changeDecision(a, now, window, "reschedule");
  if (reschedule.allowed && (!a.salon.isActive || !a.service.isActive || !a.barber.isActive)) {
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
    service: { id: a.service.id, name: a.service.name },
    barber: { id: a.barber.id, name: a.barber.name },
    canCancel: cancel.allowed,
    cancelBlockedReason: cancel.reason ?? null,
    canReschedule: reschedule.allowed,
    rescheduleBlockedReason: reschedule.reason ?? null,
    canBookAgain: a.salon.isActive && a.service.isActive,
    startsAt: wallClock(a.appointmentDate, a.startTime).getTime(),
  };
}
