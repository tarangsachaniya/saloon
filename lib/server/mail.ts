import "server-only";

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
