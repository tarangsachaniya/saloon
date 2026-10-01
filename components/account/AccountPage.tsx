"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { getAccount, type Account } from "@/lib/api/account";
import { isApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { popCard } from "@/components/marketing/pop/ui";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { AppointmentsSection } from "./AppointmentsSection";
import { LogoutButton } from "./LogoutButton";
import { ProfileForm } from "./ProfileForm";
import { useMyAppointments } from "./useMyAppointments";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "appointments", label: "Appointments" },
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={`${popCard} min-w-0 bg-white p-5 sm:p-8`}>
      {title && <h2 className="mb-5 font-chunky text-2xl font-extrabold text-plum">{title}</h2>}
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b-2 border-plum/10 py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="text-sm font-bold text-plum/65 sm:w-32 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 break-words font-semibold text-plum">{value}</dd>
    </div>
  );
}

/** Signed-in customer's account: overview, profile and security in one page of pill tabs. */
export function AccountPage() {
  const router = useRouter();
  const { token, user, isLoading, updateUser } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  // Fetched the first time the tab opens, then kept and patched in place.
  const myAppointments = useMyAppointments(tab === "appointments" && !!token);

  // Only customers have an account page; everyone else has their own area.
  const wrongRole = !!user && user.role !== "CUSTOMER";
  useEffect(() => {
    if (isLoading) return;
    if (!token) router.replace("/login?redirectTo=/account");
    else if (user?.role === "SUPER_ADMIN") router.replace("/platform");
    else if (user && user.role !== "CUSTOMER") router.replace("/dashboard");
  }, [isLoading, token, user, router]);

  useEffect(() => {
    if (isLoading || !token || wrongRole) return;
    let cancelled = false;
    getAccount()
      .then((a) => !cancelled && setAccount(a))
      .catch((e) => {
        // A 401 already cleared the token, which triggers the redirect above.
        if (!cancelled && !(isApiError(e) && e.isUnauthorized)) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, token, wrongRole]);

  function saved(next: Account) {
    setAccount(next);
    // Keep the navbar / cached profile in step with the edit.
    updateUser({
      id: next.id,
      role: next.role,
      firstName: next.firstName,
      lastName: next.lastName ?? "",
      email: next.email,
      salonId: null,
      salonSlug: null,
      salonName: null,
    });
  }

  if (!token || wrongRole || (!account && !failed)) {
    return (
      <p role="status" className="py-32 text-center font-chunky text-xl font-bold text-plum/60">
        Loading your account…
      </p>
    );
  }
  if (failed || !account) {
    return (
      <div role="alert" className="mx-auto my-24 max-w-md rounded-2xl border-2 border-plum bg-tomato/25 p-5 text-center font-bold text-plum">
        We couldn&apos;t load your account. Please refresh and try again.
      </div>
    );
  }

  const since = new Date(account.memberSince).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <span className="inline-block -rotate-2 rounded-full border-2 border-plum bg-lilac px-4 py-1 text-sm font-bold text-plum">
        Your account
      </span>
      <h1 className="mt-4 break-words font-chunky text-4xl font-extrabold leading-[0.95] tracking-tight text-plum min-[400px]:text-5xl sm:text-6xl">
        Hi, <span className="text-tomato">{account.firstName}</span>
      </h1>

      <div role="tablist" aria-label="Account sections" className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-11 rounded-full border-2 border-plum px-5 text-sm font-bold text-plum transition focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-lilac ${
              tab === t.id ? "bg-butter shadow-[3px_3px_0_0_#3b1a3f]" : "bg-white hover:bg-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6 space-y-6">
        {tab === "overview" && (
          <Card>
            <dl>
              <Row label="Name" value={account.name} />
              <Row label="Email" value={account.email} />
              <Row label="Phone" value={account.phone || "Not added"} />
              <Row label="Account status" value={account.status} />
              <Row label="Member since" value={since} />
            </dl>
          </Card>
        )}
        {tab === "appointments" && (
          <Card title="My appointments">
            <AppointmentsSection
              appointments={myAppointments.appointments}
              error={myAppointments.error}
              isLoading={myAppointments.isLoading}
              onReload={myAppointments.reload}
              onChanged={myAppointments.replace}
            />
          </Card>
        )}
        {tab === "profile" && (
          <Card title="Your details">
            <ProfileForm account={account} onSaved={saved} />
          </Card>
        )}
        {tab === "security" && (
          <>
            <Card title="Change password">
              <ChangePasswordForm />
            </Card>
          </>
        )}
      </div>

      <div className="mt-10">
        <LogoutButton />
      </div>
    </div>
  );
}
