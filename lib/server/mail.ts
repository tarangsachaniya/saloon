import "server-only";

import nodemailer from "nodemailer";

/**
 * Outbound email — deliberately a no-op stub in this migration.
 *
 * The Express backend had two nodemailer senders
 * (`util/appointmentBookedMail.js`, `util/forgotPasswordMail.js`). Both were
 * already best-effort: the booking confirmation returns `{skipped}` when
 * `SMTP_USER`/`SMTP_PASS` are unset, and the reset mail's only caller wraps it
 * in a try/catch that logs and carries on. SMTP is NOT configured in this
 * environment (`backend/.env.development` has both blank), so in practice both
 * were no-ops here already.
 *
 * Email delivery was not part of the consolidation brief, so nodemailer and the
 * HTML templates were not carried over. These stubs keep the call sites — and
 * their "must never fail a booking" contract — intact and make the gap explicit
 * rather than silently deleting the calls.
 *
 * TODO: port `backend/util/*Mail.js` (or swap in a serverless-friendly provider
 * such as Resend/SES) before this app sends real customer email.
 */

const NOT_WIRED = { skipped: "email sending is not wired up in the Next.js app yet" } as const;

export async function sendAppointmentBookedMail(
  appointment: unknown,
): Promise<{ skipped: string }> {
  void appointment;
  return NOT_WIRED;
}

export async function sendForgotPasswordMail(
  to: string,
  token: string,
): Promise<{ skipped: string }> {
  void to;
  void token;
  return NOT_WIRED;
}

/* -------------------------------------------------------------------------- */
/* Transactional mail (SMTP)                                                   */
/* -------------------------------------------------------------------------- */

export type MailResult = { status: "sent" } | { status: "not_configured" };

/**
 * Sends one email over SMTP when `SMTP_HOST`, `SMTP_USER` and `SMTP_PASS` are
 * set (optional: `SMTP_PORT`, default 587; `MAIL_FROM`, default the SMTP user).
 * Without them it sends nothing and says so (`not_configured`), so callers can
 * tell "not sent" from "sent". A real delivery failure THROWS.
 */
export async function sendMail(message: { to: string; subject: string; text: string; html?: string }): Promise<MailResult> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return { status: "not_configured" };

  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || user, ...message });
  return { status: "sent" };
}

/** Heads-up to the platform admin about a new salon request (best effort; the in-app notification is the source of truth). */
export function sendAdminNewRequestMail(input: { salonName: string; ownerName: string; city: string | null; link: string }) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return Promise.resolve<MailResult>({ status: "not_configured" });
  const text = `New salon listing request received\n\nSalon: ${input.salonName}\nOwner: ${input.ownerName}\nCity: ${input.city ?? "-"}\n\nReview it: ${input.link}`;
  return sendMail({ to, subject: `New salon request: ${input.salonName}`, text });
}
