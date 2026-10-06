/**
 * Version stamp of the consent / privacy text a customer agrees to when booking.
 * Stored on `Appointment.consentVersion` so we can prove WHICH wording was
 * accepted. Bump it whenever the platform's privacy or data-consent pages change
 * materially.
 */
export const CONSENT_VERSION = "2026-10-06";

/** Human-readable date shown as "Last updated" on every legal page. Keep in step with `CONSENT_VERSION`. */
export const LEGAL_LAST_UPDATED = "6 October 2026";
