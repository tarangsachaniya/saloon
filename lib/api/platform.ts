import { get, patch, post } from "./client";
import type { RequestOptions } from "./client";
import type { ThemeId } from "@/lib/themes";

/** Client for `/api/platform/*` (SUPER_ADMIN only). Decimals arrive as strings. */

export type PlanType = "MONTHLY" | "COMMISSION";
export type CommissionType = "PERCENT" | "FLAT";

export type PlanInput =
  | { planType: "MONTHLY"; monthlyFee: number }
  | { planType: "COMMISSION"; commissionType: CommissionType; commissionValue: number };

export interface PlanRow {
  id: string;
  planType: PlanType;
  monthlyFee: string | null;
  commissionType: CommissionType | null;
  commissionValue: string | null;
  effectiveFrom: string;
  summary: string;
  status?: "CURRENT" | "SCHEDULED" | "PAST";
}

export interface PlatformSalonRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  address: string | null;
  isActive: boolean;
  theme: ThemeId;
  accentColor: string | null;
  createdAt: string;
  owner: { firstName: string; lastName: string | null; email: string } | null;
  plan: PlanRow | null;
  counts: { appointments: number; barbers: number; services: number };
}

export interface PlatformSalonDetail {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  mapUrl: string | null;
  isActive: boolean;
  theme: ThemeId;
  accentColor: string | null;
  createdAt: string;
  team: { id: string; firstName: string; lastName: string | null; email: string; role: string; enabled: boolean }[];
  counts: { appointments: number; barbers: number; services: number; clients: number };
  plans: PlanRow[];
}

export interface SalonProfileInput {
  name: string;
  slug: string;
  tagline?: string | null;
  about?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  theme: ThemeId;
  accentColor?: string | null;
}

export interface CreateSalonInput {
  salon: SalonProfileInput;
  owner: { firstName: string; lastName?: string | null; email: string; phoneNumber?: string | null };
  plan: PlanInput;
}

export interface Credentials {
  email: string;
  temporaryPassword: string;
}

export async function listPlatformSalons(options?: RequestOptions) {
  const data = await get<{ salons: PlatformSalonRow[] }>("/platform/salons", options);
  return data.salons;
}

export async function getPlatformSalon(id: string, options?: RequestOptions) {
  const data = await get<{ salon: PlatformSalonDetail }>(`/platform/salons/${encodeURIComponent(id)}`, options);
  return data.salon;
}

export function createPlatformSalon(input: CreateSalonInput) {
  return post<{ salon: { id: string; slug: string; name: string }; credentials: Credentials }>(
    "/platform/salons",
    input,
  );
}

export async function updatePlatformSalon(id: string, input: Partial<SalonProfileInput> & { isActive?: boolean }) {
  const data = await patch<{ salon: PlatformSalonDetail }>(`/platform/salons/${encodeURIComponent(id)}`, input);
  return data.salon;
}

export function changePlatformPlan(id: string, plan: PlanInput, effectiveFrom?: string) {
  return post<{ plan: PlanRow }>(`/platform/salons/${encodeURIComponent(id)}/plan`, { plan, effectiveFrom });
}

export async function resetOwnerPassword(id: string) {
  const data = await post<{ credentials: Credentials }>(
    `/platform/salons/${encodeURIComponent(id)}/owner-password`,
  );
  return data.credentials;
}

/** `{ "salon.slug": "…" }` from a 400 response, for inline field errors. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  const payload = (error as { payload?: { fieldErrors?: Record<string, string> } })?.payload;
  return payload?.fieldErrors ?? {};
}

/* ------------------------- Salon requests (approval) ------------------------ */

export type SalonRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AccessDelivery = "sent" | "not_configured" | "failed" | "not_sent";

export interface SalonRequest {
  id: string;
  status: SalonRequestStatus;
  ownerName: string;
  salonName: string;
  email: string;
  phone: string | null;
  city: string | null;
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  /** Pending and not yet opened by an admin: the "new request" notification. */
  isNew: boolean;
  salon: { id: string; slug: string; name: string } | null;
  access: { delivery: AccessDelivery; sentAt: string | null };
}

export interface SalonRequestCounts {
  pending: number;
  approved: number;
  rejected: number;
  unseen: number;
}

export interface ApprovalResult {
  request: SalonRequest;
  delivery: AccessDelivery;
  /** One-time link for the owner to set a password (also emailed when email is configured). */
  activationLink: string;
}

export async function listSalonRequests(status?: SalonRequestStatus, options?: RequestOptions) {
  return get<{ requests: SalonRequest[]; counts: SalonRequestCounts }>("/platform/requests", {
    ...options,
    query: { status },
  });
}

export async function getSalonRequest(id: string, options?: RequestOptions) {
  return (await get<{ request: SalonRequest }>(`/platform/requests/${encodeURIComponent(id)}`, options)).request;
}

export function approveSalonRequest(id: string, input: { plan: PlanInput; ownerEmail?: string }) {
  return post<ApprovalResult>(`/platform/requests/${encodeURIComponent(id)}/approve`, input);
}

export async function rejectSalonRequest(id: string, reason?: string) {
  return (await post<{ request: SalonRequest }>(`/platform/requests/${encodeURIComponent(id)}/reject`, { reason })).request;
}

export function resendSalonRequestAccess(id: string) {
  return post<ApprovalResult>(`/platform/requests/${encodeURIComponent(id)}/resend-access`, {});
}
