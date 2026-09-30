import { get, patch, post } from "./client";
import type { RequestOptions } from "./client";

/** Owner-only worker commission API (`/api/dashboard/commissions*`). */

export interface WorkerEarnings {
  id: string;
  name: string;
  isActive: boolean;
  commissionPercentage: number;
  completedServices: number;
  totalServiceAmount: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  pendingCount: number;
}

export interface CommissionRecord {
  id: string;
  appointmentId: string;
  barberId: string;
  barberName: string;
  serviceName: string;
  /** "YYYY-MM-DD" of the appointment. */
  date: string;
  /** Percentage snapshotted when the appointment was completed. */
  commissionPercentage: number;
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
  query: DateRange & { barberId: string },
  options?: RequestOptions,
): Promise<CommissionRecord[]> {
  const data = await get<{ commissions: CommissionRecord[] }>("/dashboard/commissions", {
    ...options,
    query: { barberId: query.barberId, from: query.from, to: query.to },
  });
  return data.commissions;
}

export function setCommissionPercentage(barberId: string, commissionPercentage: number) {
  return patch<{ barber: { id: string; name: string; commissionPercentage: number } }>(
    `/dashboard/barbers/${encodeURIComponent(barberId)}/commission`,
    { commissionPercentage },
  );
}

export function markCommissionPaid(id: string) {
  return post<{ commission: { id: string; status: "PAID"; paidAt: string } }>(
    `/dashboard/commissions/${encodeURIComponent(id)}/pay`,
  );
}
