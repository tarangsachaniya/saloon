"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";
import {
  CalendarIcon,
  DashboardIcon,
  LogoutIcon,
  ScissorsIcon,
  SettingsIcon,
  TagIcon,
  UsersIcon,
} from "./icons";

/**
 * The admin chrome: a brand-navy sidebar on desktop, a header + thumb-reach
 * bottom tab bar on mobile.
 *
 * WHY A BOTTOM BAR AND NOT A DRAWER: the front desk uses this standing up,
 * one-handed, between customers. A drawer costs a tap (open) before every
 * navigation; six tabs at the bottom of a 375px screen are ~62px each, which
 * clears the 44px touch target, and put the two screens that actually get used
 * mid-shift (Today, Appointments) under the thumb.
 *
 * The visual language is deliberately the customer site's: same `primary` navy,
 * same `secondary` teal for the active state, same Nunito, same card radius.
 * It should read as the back office of THIS salon's site, not a generic admin
 * template bolted on beside it.
 */

const LOGIN_PATH = "/admin/login";

interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the cramped mobile tab bar. */
  shortLabel: string;
  Icon: typeof DashboardIcon;
  /** `/admin` must match exactly or it would light up on every child route. */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", shortLabel: "Today", Icon: DashboardIcon, exact: true },
  { href: "/admin/appointments", label: "Appointments", shortLabel: "Diary", Icon: CalendarIcon },
  { href: "/admin/barbers", label: "Barbers", shortLabel: "Barbers", Icon: ScissorsIcon },
  { href: "/admin/services", label: "Services", shortLabel: "Services", Icon: TagIcon },
  { href: "/admin/clients", label: "Clients", shortLabel: "Clients", Icon: UsersIcon },
  { href: "/admin/settings", label: "Settings", shortLabel: "Settings", Icon: SettingsIcon },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  /*
   * The login screen lives under /admin but must NOT get the chrome — it is the
   * one admin route reachable while signed out, and wrapping a sign-in form in
   * a navigation sidebar it cannot use would be nonsense. Handled here with a
   * path check rather than a `(group)` layout so the route files stay exactly
   * where the milestone brief (and anyone reading the tree) expects them.
   */
  if (pathname === LOGIN_PATH) {
    return <>{children}</>;
  }

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "";

  return (
    <div className="min-h-dvh bg-surface-muted lg:flex">
      {/* ---------------------------- Desktop sidebar --------------------- */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-primary-800 bg-primary text-primary-foreground lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-light"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 via-amber-500/15 to-transparent border border-amber-400/40 shadow-inner">
              <svg
                className="h-5 w-5 text-amber-400 drop-shadow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                <line x1="8.12" y1="8.12" x2="12" y2="12" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-secondary-light">
                Back Office
              </span>
              <span className="block text-base font-extrabold leading-tight text-white truncate">
                Salon Admin
              </span>
            </div>
          </Link>
        </div>

        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-light",
                      active
                        ? "bg-secondary text-white shadow-md shadow-secondary/30"
                        : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <item.Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 px-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span>View Public Site</span>
              <span className="text-secondary-light">↗</span>
            </Link>
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/25 text-sm font-bold text-secondary-light"
            >
              {displayName ? initials(displayName) : "—"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">
                {displayName || "Signed in"}
              </span>
              {user && (
                <span className="block truncate text-xs text-white/60">
                  {user.role === "OWNER" ? "Owner" : "Staff"}
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-light"
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ------------------------------ Content --------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-primary-800 bg-primary px-4 py-3 text-primary-foreground lg:hidden">
          <Link
            href="/admin"
            className="min-w-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-light"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-secondary-light">
              Back office
            </span>
            <span className="block truncate text-base font-extrabold leading-tight text-white">
              Salon admin
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {displayName && (
              <span
                aria-label={`Signed in as ${displayName}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/25 text-xs font-bold text-secondary-light"
              >
                {initials(displayName)}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-light"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* `pb-24` on mobile clears the fixed bottom tab bar. */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Mobile bottom tabs */}
        <nav
          aria-label="Admin sections"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(5,59,80,0.08)] lg:hidden"
        >
          <ul className="flex items-stretch">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href} className="min-w-0 flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary",
                      active ? "text-secondary-700" : "text-slate-500",
                    )}
                  >
                    <item.Icon className={cn("h-5 w-5", active && "stroke-[2]")} />
                    <span className="w-full truncate text-center">
                      {item.shortLabel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
