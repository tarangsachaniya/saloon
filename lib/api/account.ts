import { get, patch, post } from "./client";
import type { UserRole } from "@/lib/booking/types";

/** Customer account API (`/api/account/*`). The server identifies the user from the token. */

export interface Account {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string | null;
  name: string;
  email: string;
  phone: string | null;
  twoFactorEnabled: boolean;
  status: "Active" | "Disabled";
  memberSince: string;
}

export async function getAccount(): Promise<Account> {
  return (await get<{ user: Account }>("/account")).user;
}

export async function updateProfile(input: { name: string; email: string; phone: string }): Promise<Account> {
  return (await patch<{ user: Account }>("/account/profile", input)).user;
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  return post("/account/password", input);
}

export function startTwoFactorSetup(): Promise<{ secret: string; qr: string }> {
  return post("/account/2fa/setup");
}

export function enableTwoFactor(code: string): Promise<{ message: string }> {
  return post("/account/2fa/enable", { code });
}

export function disableTwoFactor(password: string, code: string): Promise<{ message: string }> {
  return post("/account/2fa/disable", { password, code });
}

/* ------------------------------ My appointments ----------------------------- */

export interface MyAppointment {
  id: string;
  status: "PENDING" | "CONFIRMED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  bucket: "upcoming" | "past" | "cancelled";
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  salon: { name: string; slug: string };
  service: { id: string; name: string };
  barber: { id: string; name: string };
  canCancel: boolean;
  cancelBlockedReason: string | null;
  canReschedule: boolean;
  rescheduleBlockedReason: string | null;
  canBookAgain: boolean;
  startsAt: number;
}

export async function getMyAppointments(options?: { signal?: AbortSignal }): Promise<MyAppointment[]> {
  return (await get<{ appointments: MyAppointment[] }>("/account/appointments", options)).appointments;
}

export async function cancelMyAppointment(id: string): Promise<MyAppointment> {
  return (await post<{ appointment: MyAppointment }>(`/account/appointments/${encodeURIComponent(id)}/cancel`)).appointment;
}

export async function rescheduleMyAppointment(
  id: string,
  input: { date: string; startTime: string },
): Promise<MyAppointment> {
  return (
    await post<{ appointment: MyAppointment }>(`/account/appointments/${encodeURIComponent(id)}/reschedule`, input)
  ).appointment;
}
