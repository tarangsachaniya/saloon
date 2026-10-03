import { get, patch, post } from "./client";
import type { RequestOptions } from "./client";

/** Owner-only worker commission API (`/api/dashboard/commissions*`). */

/** A worker's commission rule: a percentage of the amount, or a flat amount per service. */
export interface CommissionRate {
  commissionType: "PERCENT" | "FLAT";
  commissionPercentage: number;
  commissionFlatAmount: number;
}

export type CommissionSource = "ONLINE" | "WALK_IN";

export interface WorkerEarnings extends CommissionRate {
  id: string;
  name: string;
  isActive: boolean;
  completedServices: number;
  totalServiceAmount: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  pendingCount: number;
  /** Completed online bookings / walk-ins in the range. */
  onlineCount: number;
  walkInCount: number;
}

export interface CommissionRecord {
  id: string;
  appointmentId: string;
  barberId: string;
  barberName: string;
  serviceName: string;
  /** "YYYY-MM-DD" of the appointment. */
  date: string;
  /** Rule snapshotted when the appointment was completed. */
  commissionType: "PERCENT" | "FLAT";
  commissionPercentage: number;
  flatAmount: number;
  serviceCount: number;
  source: CommissionSource;
  serviceAmount: number;
  commissionAmount: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export async function getEarningsSummary(range: DateRange, options?: RequestOptions): Promise<WorkerEarnings[]> {
  const data = await get<{ workers: WorkerEarnings[] }>("/dashboard/commissions/summary", {
    ...options,
    query: { from: range.from, to: range.to },
  });
  return data.workers;
}

export async function getCommissionHistory(
  query: DateRange & { barberId: string; source?: CommissionSource },
  options?: RequestOptions,
): Promise<CommissionRecord[]> {
  const data = await get<{ commissions: CommissionRecord[] }>("/dashboard/commissions", {
    ...options,
    query: { barberId: query.barberId, from: query.from, to: query.to, source: query.source },
  });
  return data.commissions;
}

export function setCommissionRate(
  barberId: string,
  rate:
    | { commissionType: "PERCENT"; commissionPercentage: number }
    | { commissionType: "FLAT"; commissionFlatAmount: number },
) {
  return patch<{ barber: { id: string; name: string } & CommissionRate }>(
    `/dashboard/barbers/${encodeURIComponent(barberId)}/commission`,
    rate,
  );
}

export function markCommissionPaid(id: string) {
  return post<{ commission: { id: string; status: "PAID"; paidAt: string } }>(
    `/dashboard/commissions/${encodeURIComponent(id)}/pay`,
  );
}

/* ------------------------------ Worker logins ------------------------------ */

export interface WorkerLogin {
  id: string;
  email: string;
  firstName: string;
  enabled: boolean;
}

/** Shown once, right after creating a login or resetting its password. */
export interface WorkerCredentials {
  email: string;
  temporaryPassword: string;
}

const loginPath = (barberId: string) => `/dashboard/barbers/${encodeURIComponent(barberId)}/login`;

export async function getWorkerLogin(barberId: string, options?: RequestOptions): Promise<WorkerLogin | null> {
  return (await get<{ login: WorkerLogin | null }>(loginPath(barberId), options)).login;
}

export function createWorkerLogin(barberId: string, input: { email: string; firstName?: string }) {
  return post<{ login: WorkerLogin; credentials: WorkerCredentials }>(loginPath(barberId), input);
}

export function updateWorkerLogin(barberId: string, input: { enabled?: boolean; resetPassword?: true }) {
  return patch<{ login: WorkerLogin; credentials?: WorkerCredentials }>(loginPath(barberId), input);
}

/* ------------------------- A worker's own earnings ------------------------- */

export interface MyEarnings {
  worker: CommissionRate & {
    id: string;
    name: string;
    completedServices: number;
    onlineCount: number;
    walkInCount: number;
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
  };
  commissions: {
    id: string;
    serviceName: string;
    date: string;
    source: CommissionSource;
    serviceAmount: number;
    commissionAmount: number;
    status: "PENDING" | "PAID";
  }[];
}

export async function getMyEarnings(range: DateRange, options?: RequestOptions): Promise<MyEarnings> {
  return get<MyEarnings & { success: true }>("/dashboard/my-earnings", { ...options, query: { from: range.from, to: range.to } });
}
