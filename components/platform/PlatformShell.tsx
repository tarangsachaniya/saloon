"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { listSalonRequests } from "@/lib/api/platform";
import { useAuth } from "@/lib/auth/useAuth";
import { BRAND } from "@/lib/brand";

const NAV = [
  { href: "/platform", label: "Salons", exact: true },
  { href: "/platform/requests", label: "Salon requests", badge: true },
  { href: "/platform/salons/new", label: "+ New salon" },
];

/**
 * Platform-operator chrome in the playful theme. Client-side role routing:
 * signed out -> /login, salon staff -> /dashboard. (The real authorisation is
 * the SUPER_ADMIN check on every /api/platform request.)
 */
export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, isLoading, logout } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!token) router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`);
    else if (user && user.role !== "SUPER_ADMIN") router.replace(user.role === "CUSTOMER" ? "/" : "/dashboard");
  }, [isLoading, token, user, pathname, router]);

  const ready = !isLoading && token && user?.role === "SUPER_ADMIN";

  // Notification badge: pending requests no admin has opened yet. Re-read on every
  // navigation, so opening the requests page clears it.
  const [unseen, setUnseen] = useState(0);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    listSalonRequests("PENDING")
      .then((r) => !cancelled && setUnseen(r.counts.unseen))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ready, pathname]);

  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-40 border-b-[3px] border-plum bg-butter">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/platform" className="font-chunky text-2xl font-extrabold tracking-tight text-plum">
            {BRAND.name.toLowerCase()}
            <span className="text-tomato">●</span>
          </Link>
          <span className="rounded-full border-2 border-plum bg-white px-3 py-0.5 text-xs font-bold text-plum">
            Platform admin
          </span>

          <nav aria-label="Platform" className="order-3 flex w-full gap-1 sm:order-none sm:ml-6 sm:w-auto">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-bold text-plum transition ${
                    active ? "border-2 border-plum bg-white shadow-[2px_2px_0_0_#3b1a3f]" : "hover:bg-white/70"
                  }`}
                >
                  {item.label}
                  {"badge" in item && item.badge && unseen > 0 && (
                    <span
                      aria-label={`${unseen} new request${unseen === 1 ? "" : "s"}`}
                      className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-plum bg-tomato px-1.5 text-xs font-extrabold"
                    >
                      {unseen}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden text-sm font-semibold text-plum/80 md:inline">{user.email}</span>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="rounded-full border-2 border-plum bg-white px-4 py-1.5 text-sm font-bold text-plum transition hover:bg-tomato"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {ready ? (
          children
        ) : (
          <p className="py-24 text-center font-chunky text-xl font-bold text-plum/60" role="status">
            Checking your access…
          </p>
        )}
      </main>
    </div>
  );
}
