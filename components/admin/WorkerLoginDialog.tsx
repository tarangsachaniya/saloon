"use client";

import { useState, type FormEvent } from "react";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Loader } from "@/components/ui";
import {
  createWorkerLogin,
  getWorkerLogin,
  updateWorkerLogin,
  type WorkerCredentials,
} from "@/lib/api/commissions";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import { FormError } from "./PageHeader";

/**
 * Owner-only: give a worker their own login. A signed-in worker records walk-ins
 * as themselves and sees only their own earnings. Email is not sent from the
 * platform, so the temporary password is shown here once for the owner to pass on.
 */
export function WorkerLoginDialog({
  worker,
  onClose,
}: {
  worker: { id: string; name: string; email?: string | null } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!worker} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {worker && <LoginBody key={worker.id} worker={worker} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function LoginBody({ worker, onClose }: { worker: { id: string; name: string; email?: string | null }; onClose: () => void }) {
  const login = useAdminData((signal) => getWorkerLogin(worker.id, { signal }), [worker.id]);
  const [email, setEmail] = useState(worker.email ?? "");
  const [credentials, setCredentials] = useState<WorkerCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ credentials?: WorkerCredentials }>) {
    setBusy(true);
    setError(null);
    try {
      const res = await action();
      if (res.credentials) setCredentials(res.credentials);
      login.refresh();
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function create(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return setError("Enter the worker's email.");
    void run(() => createWorkerLogin(worker.id, { email: email.trim() }));
  }

  const current = login.data;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{worker.name}&rsquo;s login</DialogTitle>
        <DialogDescription>
          With their own login, {worker.name} can record their walk-ins and see their own earnings — nothing of other
          workers.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-4">
        {login.isLoading && <Loader label="Loading…" />}

        {credentials && (
          <div role="status" className="rounded-xl bg-secondary-50 p-3 ring-1 ring-secondary">
            <p className="text-sm font-bold text-primary">Share these with {worker.name} — shown only once.</p>
            <p className="mt-1 text-sm">
              Email: <span className="font-mono">{credentials.email}</span>
            </p>
            <p className="text-sm">
              Temporary password: <span className="font-mono font-bold">{credentials.temporaryPassword}</span>
            </p>
          </div>
        )}

        {login.data === null && !login.isLoading && !login.error && (
          <form id="worker-login-form" onSubmit={create} noValidate>
            <Input
              label="Worker's email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              hint="They sign in with this email and the temporary password."
            />
          </form>
        )}

        {current && (
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-bold text-primary">{current.email}</p>
            <p className="text-xs text-slate-500">{current.enabled ? "Active" : "Disabled — cannot sign in"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => updateWorkerLogin(worker.id, { resetPassword: true }))}>
                Reset password
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => updateWorkerLogin(worker.id, { enabled: !current.enabled }))}
              >
                {current.enabled ? "Disable login" : "Enable login"}
              </Button>
            </div>
          </div>
        )}

        <FormError message={error ?? (login.error && !login.data ? login.error : null)} />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Close
        </Button>
        {login.data === null && !login.isLoading && !login.error && (
          <Button type="submit" form="worker-login-form" isLoading={busy}>
            Create login
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
