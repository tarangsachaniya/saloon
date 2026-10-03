import type { Appointment } from "./types";

/** "Haircut + Beard trim" for a multi-service appointment, else its one service. */
export function appointmentServiceNames(appointment: Pick<Appointment, "services" | "service">): string {
  if (appointment.services?.length) return appointment.services.map((s) => s.name).join(" + ");
  return appointment.service?.name ?? "—";
}
