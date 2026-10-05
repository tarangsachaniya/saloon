"use client";

import { useState, type FormEvent } from "react";

import { PlatformListSkeleton } from "@/components/loading/marketing";
import { Field, card, inputClass } from "@/components/platform/fields";
import { useAdminData } from "@/lib/admin/useAdminData";
import { listReleases, publishRelease, updateRelease, type AppRelease } from "@/lib/api/releases";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const formatMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const pill =
  "rounded-full border-2 border-plum bg-white px-4 py-1.5 text-sm font-bold text-plum hover:bg-butter";

/**
 * Android app releases. Upload a signed APK; it goes straight to S3 and is
 * registered here. Installed apps poll /api/app/latest and offer (or force) the
 * update. versionCode must beat the latest release and match the APK's own.
 */
export default function ReleasesPage() {
  const { data, error, isLoading, refresh } = useAdminData((signal) => listReleases({ signal }), []);

  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [notes, setNotes] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nextCode = data?.releases[0] ? data.releases[0].versionCode + 1 : 1;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const code = Number.parseInt(versionCode, 10);
    if (!file) return setFormError("Choose the APK file.");
    if (!file.name.toLowerCase().endsWith(".apk")) return setFormError("The file must be an .apk.");
    if (!Number.isInteger(code) || code < 1) return setFormError("Enter a whole-number version code.");
    if (!versionName.trim()) return setFormError("Enter a version name, e.g. 1.0.1.");

    setBusy(true);
    setProgress(0);
    try {
      await publishRelease(
        { file, versionCode: code, versionName: versionName.trim(), notes: notes.trim(), mandatory },
        setProgress,
      );
      setFile(null);
      setVersionName("");
      setVersionCode("");
      setNotes("");
      setMandatory(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not publish the release.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function change(r: AppRelease, body: { isActive?: boolean; mandatory?: boolean }) {
    try {
      await updateRelease(r.id, body);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not update the release.");
    }
  }

  return (
    <div>
      <h1 className="font-chunky text-5xl font-extrabold tracking-tight text-plum">App releases</h1>
      <p className="mt-1 font-medium text-plum/75">
        Upload a new Android build. Installed apps will offer it, or require it when marked mandatory.
      </p>

      <form onSubmit={onSubmit} className={`${card} mt-8 grid gap-5`} noValidate>
        <div>
          <label htmlFor="apk" className="mb-1.5 block text-sm font-bold text-plum">
            APK file <span className="text-tomato">*</span>
          </label>
          <input
            id="apk"
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={inputClass}
          />
          {file && (
            <p className="mt-1.5 text-sm text-plum/65">
              {file.name} · {formatMb(file.size)}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Version name"
            required
            placeholder="1.0.1"
            value={versionName}
            disabled={busy}
            onChange={(e) => setVersionName(e.target.value)}
          />
          <Field
            label="Version code"
            required
            inputMode="numeric"
            placeholder={String(nextCode)}
            hint={`Must equal the build's android versionCode. Next: ${nextCode}.`}
            value={versionCode}
            disabled={busy}
            onChange={(e) => setVersionCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <div>
          <label htmlFor="notes" className="mb-1.5 block text-sm font-bold text-plum">
            What&apos;s new
          </label>
          <textarea
            id="notes"
            rows={3}
            maxLength={2000}
            value={notes}
            disabled={busy}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-3 font-bold text-plum">
          <input
            type="checkbox"
            checked={mandatory}
            disabled={busy}
            onChange={(e) => setMandatory(e.target.checked)}
            className="h-5 w-5 accent-plum"
          />
          Mandatory update (blocks the app until installed)
        </label>

        {progress !== null && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-4 overflow-hidden rounded-full border-2 border-plum bg-cream"
          >
            <div className="h-full bg-tomato transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {formError && (
          <p role="alert" className="rounded-2xl border-2 border-plum bg-tomato/25 p-3 font-semibold">
            {formError}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full border-[3px] border-plum bg-butter px-6 py-3 font-chunky text-lg font-extrabold text-plum shadow-[4px_4px_0_0_#3b1a3f] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy
              ? progress !== null && progress > 0
                ? `Uploading ${Math.round(progress * 100)}%…`
                : "Preparing…"
              : "Publish release"}
          </button>
        </div>
      </form>

      {isLoading && <PlatformListSkeleton header={false} label="Loading releases…" />}
      {error && (
        <div role="alert" className="mt-8 rounded-2xl border-2 border-plum bg-tomato/25 p-4 font-semibold">
          {error}{" "}
          <button type="button" onClick={refresh} className="font-bold underline">
            Try again
          </button>
        </div>
      )}
      {data && data.releases.length === 0 && (
        <div className="mt-10 rounded-[2rem] border-[3px] border-dashed border-plum bg-white p-12 text-center">
          <p className="font-chunky text-2xl font-extrabold">No releases yet.</p>
        </div>
      )}

      <ul className="mt-8 grid gap-4">
        {data?.releases.map((r, i) => (
          <li key={r.id} className={`${card} !p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-chunky text-2xl font-extrabold">
                  v{r.versionName} <span className="text-base font-bold text-plum/60">(code {r.versionCode})</span>
                </h2>
                <p className="text-sm font-semibold text-plum/70">
                  {formatDate(r.createdAt)} · {formatMb(r.sizeBytes)}
                  {i === 0 && r.isActive && " · latest"}
                  {!r.isActive && " · inactive"}
                  {r.mandatory && " · mandatory"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={r.apkUrl} className={pill}>
                  Download
                </a>
                <button type="button" onClick={() => change(r, { mandatory: !r.mandatory })} className={pill}>
                  {r.mandatory ? "Make optional" : "Make mandatory"}
                </button>
                <button type="button" onClick={() => change(r, { isActive: !r.isActive })} className={pill}>
                  {r.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
            {r.notes && <p className="mt-3 whitespace-pre-line text-sm text-plum/80">{r.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
