"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { popButton } from "@/components/marketing/pop/ui";
import { card, EMPTY_PLAN, Field, inputClass, PlanFields, planFromDraft, type PlanDraft } from "@/components/platform/fields";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import {
  approveSalonRequest,
  fieldErrorsOf,
  getSalonRequest,
  listSalonRequests,
  rejectSalonRequest,
  resendSalonRequestAccess,
  type AccessDelivery,
  type ApprovalResult,
  type SalonRequest,
  type SalonRequestStatus,
} from "@/lib/api/platform";

type Filter = SalonRequestStatus | "ALL";

const TABS: { value: Filter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const STATUS_STYLE: Record<SalonRequestStatus, string> = {
  PENDING: "bg-butter",
  APPROVED: "bg-mint",
  REJECTED: "bg-tomato/40",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const DELIVERY_TEXT: Record<AccessDelivery, string> = {
  sent: "Account-access email sent.",
  not_configured: "Account created, but email isn't configured on the server, so nothing was emailed.",
  failed: "Account created, but the access email could not be delivered.",
  not_sent: "Access not sent yet.",
};

export default function SalonRequestsPage() {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const { data, error, isLoading, refresh } = useAdminData(
    (signal) => listSalonRequests(filter === "ALL" ? undefined : filter, { signal }),
    [filter],
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState<SalonRequest | null>(null);
  const [rejecting, setRejecting] = useState<SalonRequest | null>(null);
  const [outcome, setOutcome] = useState<(ApprovalResult & { salonName: string }) | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  async function toggle(request: SalonRequest) {
    if (openId === request.id) return setOpenId(null);
    setOpenId(request.id);
    if (request.isNew && !seen.has(request.id)) {
      // Opening the request is what clears its "new" notification.
      setSeen((s) => new Set(s).add(request.id));
      getSalonRequest(request.id).catch(() => undefined);
    }
  }

  async function resend(request: SalonRequest) {
    setResending(request.id);
    setNotice(null);
    try {
      const result = await resendSalonRequestAccess(request.id);
      setOutcome({ ...result, salonName: request.salonName });
      refresh();
    } catch (err) {
      setNotice(toErrorMessage(err));
    } finally {
      setResending(null);
    }
  }

  const counts = data?.counts;

  return (
    <div>
      <h1 className="font-chunky text-5xl font-extrabold tracking-tight text-plum">Salon requests</h1>
      <p className="mt-1 font-medium text-plum/75">
        People who asked to list their salon. Nothing goes live until you approve it.
      </p>

      <div role="tablist" aria-label="Request status" className="mt-8 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count =
            tab.value === "PENDING" ? counts?.pending : tab.value === "APPROVED" ? counts?.approved : tab.value === "REJECTED" ? counts?.rejected : undefined;
          return (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={filter === tab.value}
              onClick={() => setFilter(tab.value)}
              className={`rounded-full border-2 border-plum px-4 py-2 text-sm font-bold text-plum transition ${
                filter === tab.value ? "bg-butter shadow-[2px_2px_0_0_#3b1a3f]" : "bg-white hover:bg-butter/50"
              }`}
            >
              {tab.label}
              {count !== undefined && <span className="ml-1.5 text-plum/60">{count}</span>}
            </button>
          );
        })}
      </div>

      {notice && (
        <div role="alert" className="mt-6 rounded-2xl border-2 border-plum bg-tomato/25 p-4 font-semibold">
          {notice}
        </div>
      )}
      {isLoading && <p className="mt-10 font-bold text-plum/60" role="status">Loading requests…</p>}
      {error && (
        <div role="alert" className="mt-8 rounded-2xl border-2 border-plum bg-tomato/25 p-4 font-semibold">
          {error}{" "}
          <button type="button" onClick={refresh} className="font-bold underline">
            Try again
          </button>
        </div>
      )}

      {data && data.requests.length === 0 && (
        <div className="mt-10 rounded-[2rem] border-[3px] border-dashed border-plum bg-white p-12 text-center">
          <p className="font-chunky text-2xl font-extrabold">No {filter === "ALL" ? "" : filter.toLowerCase() + " "}requests.</p>
        </div>
      )}

      <ul className="mt-8 grid gap-6">
        {data?.requests.map((r) => {
          const isOpen = openId === r.id;
          const isNew = r.isNew && !seen.has(r.id);
          return (
            <li key={r.id} className={`${card} !p-5 sm:!p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-chunky text-2xl font-extrabold leading-tight">{r.salonName}</h2>
                    {isNew && (
                      <span className="rounded-full border-2 border-plum bg-tomato px-2.5 py-0.5 text-xs font-extrabold">NEW</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-plum/70">Submitted {formatDate(r.createdAt)}</p>
                </div>
                <span className={`rounded-full border-2 border-plum px-3 py-0.5 text-xs font-bold ${STATUS_STYLE[r.status]}`}>
                  {r.status[0] + r.status.slice(1).toLowerCase()}
                </span>
              </div>

              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <Row label="Owner" value={r.ownerName} />
                <Row label="Email" value={r.email} />
                <Row label="Phone" value={r.phone ?? "-"} />
                <Row label="City" value={r.city ?? "-"} />
              </dl>

              {isOpen && (
                <div className="mt-4 rounded-2xl border-2 border-plum bg-cream p-4 text-sm">
                  <p className="font-bold text-plum/70">Message from the applicant</p>
                  <p className="mt-1 whitespace-pre-wrap font-medium">{r.message || "No message."}</p>
                  {r.status === "REJECTED" && (
                    <p className="mt-3 font-semibold">Rejection reason: {r.rejectionReason || "none given"}</p>
                  )}
                  {r.status === "APPROVED" && r.salon && (
                    <p className="mt-3 font-semibold">
                      Salon created: <span className="font-mono">/s/{r.salon.slug}</span>
                    </p>
                  )}
                </div>
              )}

              {r.status === "APPROVED" && (
                <p
                  className={`mt-4 rounded-2xl border-2 border-plum px-4 py-2 text-sm font-semibold ${
                    r.access.delivery === "sent" ? "bg-mint" : "bg-butter"
                  }`}
                >
                  {DELIVERY_TEXT[r.access.delivery]}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => toggle(r)} aria-expanded={isOpen} className={popButton("white", "md")}>
                  {isOpen ? "Hide details" : "View details"}
                </button>
                {r.status === "PENDING" && (
                  <>
                    <button type="button" onClick={() => setApproving(r)} className={popButton("plum", "md")}>
                      Approve
                    </button>
                    <button type="button" onClick={() => setRejecting(r)} className={popButton("tomato", "md")}>
                      Reject
                    </button>
                  </>
                )}
                {r.status === "APPROVED" && r.access.delivery !== "sent" && (
                  <button
                    type="button"
                    onClick={() => resend(r)}
                    disabled={resending === r.id}
                    className={`${popButton("butter", "md")} disabled:opacity-60`}
                  >
                    {resending === r.id ? "Sending…" : "Resend access"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {approving && (
        <ApproveDialog
          request={approving}
          onClose={() => setApproving(null)}
          onDone={(result) => {
            setApproving(null);
            setOutcome({ ...result, salonName: approving.salonName });
            refresh();
          }}
        />
      )}
      {rejecting && (
        <RejectDialog
          request={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            refresh();
          }}
        />
      )}
      {outcome && <OutcomeDialog outcome={outcome} onClose={() => setOutcome(null)} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 font-bold text-plum/60">{label}</dt>
      <dd className="min-w-0 break-words font-semibold">{value}</dd>
    </div>
  );
}

/** Minimal accessible modal: Esc closes, focus moves in and returns. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => opener?.focus?.();
  }, []);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-plum/60 p-3 sm:items-center sm:p-5"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border-[3px] border-plum bg-cream p-6 shadow-[6px_6px_0_0_#3b1a3f] outline-none"
      >
        <h2 className="font-chunky text-2xl font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ApproveDialog({
  request,
  onClose,
  onDone,
}: {
  request: SalonRequest;
  onClose: () => void;
  onDone: (result: ApprovalResult) => void;
}) {
  const [plan, setPlan] = useState<PlanDraft>(EMPTY_PLAN);
  const [ownerEmail, setOwnerEmail] = useState(request.email);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const planResult = planFromDraft(plan);
    if ("error" in planResult) {
      setErrors({ plan: planResult.error });
      return;
    }
    setBusy(true);
    setFailure(null);
    setErrors({});
    try {
      const email = ownerEmail.trim().toLowerCase();
      onDone(
        await approveSalonRequest(request.id, {
          plan: planResult.plan,
          ...(email !== request.email.toLowerCase() ? { ownerEmail: email } : {}),
        }),
      );
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setFailure(toErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={`Approve ${request.salonName}`} onClose={onClose}>
      <p className="mt-2 text-sm font-medium text-plum/80">
        This creates the salon and an owner login, then emails {request.ownerName} a secure link to set their
        password. No password is sent.
      </p>
      <div className="mt-5 flex flex-col gap-5">
        <Field
          label="Owner login email"
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          error={errors.ownerEmail}
          hint="Defaults to the applicant's email. It must not already have an account."
          disabled={busy}
        />
        <PlanFields value={plan} onChange={setPlan} error={errors.plan ?? errors["plan.monthlyFee"] ?? errors["plan.commissionValue"]} />
      </div>
      {failure && (
        <p role="alert" className="mt-4 rounded-2xl border-2 border-plum bg-tomato/25 p-3 text-sm font-semibold">
          {failure}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className={popButton("white", "md")}>
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={busy} aria-busy={busy} className={`${popButton("plum", "md")} disabled:opacity-60`}>
          {busy ? "Approving…" : "Approve & create account"}
        </button>
      </div>
    </Modal>
  );
}

function RejectDialog({ request, onClose, onDone }: { request: SalonRequest; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await rejectSalonRequest(request.id, reason.trim() || undefined);
      onDone();
    } catch (err) {
      setFailure(toErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={`Reject ${request.salonName}`} onClose={onClose}>
      <p className="mt-2 text-sm font-medium text-plum/80">
        No salon, account or login will be created.
      </p>
      <label htmlFor="reject-reason" className="mt-5 mb-1.5 block text-sm font-bold">
        Reason (optional)
      </label>
      <textarea
        id="reject-reason"
        rows={3}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={inputClass}
        disabled={busy}
      />
      {failure && (
        <p role="alert" className="mt-4 rounded-2xl border-2 border-plum bg-tomato/25 p-3 text-sm font-semibold">
          {failure}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className={popButton("white", "md")}>
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={busy} aria-busy={busy} className={`${popButton("tomato", "md")} disabled:opacity-60`}>
          {busy ? "Rejecting…" : "Reject request"}
        </button>
      </div>
    </Modal>
  );
}

/** Result of an approval / resend: states plainly whether the email actually went out. */
function OutcomeDialog({ outcome, onClose }: { outcome: ApprovalResult & { salonName: string }; onClose: () => void }) {
  const delivered = outcome.delivery === "sent";
  async function copy() {
    try {
      await navigator.clipboard.writeText(outcome.activationLink);
    } catch {
      /* clipboard unavailable: the link is visible to copy by hand */
    }
  }
  return (
    <Modal title={delivered ? "Approved - access email sent" : "Approved - access email NOT delivered"} onClose={onClose}>
      <p className={`mt-3 rounded-2xl border-2 border-plum px-4 py-3 text-sm font-semibold ${delivered ? "bg-mint" : "bg-butter"}`}>
        {outcome.salonName}: {DELIVERY_TEXT[outcome.delivery]}
        {!delivered && " The owner has no way in yet. Share the link below privately, or use “Resend access” once email works."}
      </p>
      {!delivered && (
        <div className="mt-4">
          <p className="text-sm font-bold text-plum/70">One-time activation link (valid 7 days)</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-plum bg-white px-4 py-3">
            <code className="min-w-0 flex-1 break-all text-xs font-bold">{outcome.activationLink}</code>
            <button type="button" onClick={copy} className="rounded-full border-2 border-plum bg-butter px-3 py-1 text-xs font-bold hover:bg-white">
              Copy
            </button>
          </div>
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onClose} className={popButton("plum", "md")}>
          Done
        </button>
      </div>
    </Modal>
  );
}
