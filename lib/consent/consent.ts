/**
 * Cookie consent store (client only).
 *
 * The visitor's choice lives in ONE localStorage record, `salonly_cookie_consent`:
 *   { essential: true, analytics, marketing, version, timestamp }
 * Nothing else goes in it - no identity, no tokens. It persists across browser
 * restarts, is browser-local (no database), and is shared between tabs.
 *
 * Essential is always true and cannot be turned off. Analytics and marketing
 * default to OFF and are only ever true after an explicit choice.
 *
 * Authentication/session cookies are ESSENTIAL and are deliberately independent
 * of this module: nothing here reads, writes or deletes them.
 *
 * Gating optional services: today Salonly runs NO analytics or marketing
 * scripts. If one is ever added, load it only when `hasConsent("analytics")`
 * (or "marketing") is true, re-check via `subscribeConsent`, and stop it and
 * remove the cookies it set when consent is withdrawn.
 */

export const CONSENT_STORAGE_KEY = "salonly_cookie_consent";

/** Bump (e.g. "1.0" -> "1.1") when the cookie policy changes materially; everyone is asked again. */
export const COOKIE_CONSENT_VERSION = "1.0";

export type ConsentCategory = "analytics" | "marketing";

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: string;
}

export interface ConsentState {
  /** False during SSR / before the first client read, so the banner never flashes. */
  ready: boolean;
  /** The saved, current-version decision, or null when the visitor still has to choose. */
  consent: CookieConsent | null;
  /** Whether the Cookie Preferences modal is open. */
  prefsOpen: boolean;
}

const SERVER_STATE: ConsentState = { ready: false, consent: null, prefsOpen: false };

let state: ConsentState | null = null;
/** Fallback when storage is blocked, so a choice still holds for the session. */
let memoryRaw: string | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CookieConsent>;
    if (
      value.version !== COOKIE_CONSENT_VERSION ||
      typeof value.analytics !== "boolean" ||
      typeof value.marketing !== "boolean" ||
      typeof value.timestamp !== "string"
    ) {
      return null; // missing, malformed or an older policy version: ask again
    }
    return {
      essential: true,
      analytics: value.analytics,
      marketing: value.marketing,
      version: value.version,
      timestamp: value.timestamp,
    };
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function getConsentSnapshot(): ConsentState {
  if (!state) state = { ready: true, consent: parse(readRaw()), prefsOpen: false };
  return state;
}

export function getConsentServerSnapshot(): ConsentState {
  return SERVER_STATE;
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CONSENT_STORAGE_KEY) return;
    state = { ...getConsentSnapshot(), consent: parse(readRaw()) };
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Persist a decision. Optional categories are explicit booleans; essential is always on. */
export function saveConsent(choice: { analytics: boolean; marketing: boolean }): void {
  const consent: CookieConsent = {
    essential: true,
    analytics: choice.analytics === true,
    marketing: choice.marketing === true,
    version: COOKIE_CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };
  const raw = JSON.stringify(consent);
  memoryRaw = raw;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, raw);
  } catch {
    // Storage blocked: the in-memory copy still applies for this page session.
  }
  state = { ...getConsentSnapshot(), consent, prefsOpen: false };
  emit();
}

export const acceptAll = () => saveConsent({ analytics: true, marketing: true });
export const rejectNonEssential = () => saveConsent({ analytics: false, marketing: false });

export function openPreferences(): void {
  state = { ...getConsentSnapshot(), prefsOpen: true };
  emit();
}

export function closePreferences(): void {
  state = { ...getConsentSnapshot(), prefsOpen: false };
  emit();
}

/** True only when the visitor has explicitly allowed this optional category. */
export function hasConsent(category: ConsentCategory): boolean {
  if (typeof window === "undefined") return false;
  return getConsentSnapshot().consent?.[category] === true;
}
