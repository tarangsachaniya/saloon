"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui";
import { toErrorMessage } from "@/lib/admin/useAdminData";
import { MAX_GALLERY_IMAGES, uploadImage, type UploadKind } from "@/lib/api/uploads";

const ACCEPT = "image/jpeg,image/png,image/webp";

/** Upload through a hidden file input; returns the public URL, or null if no file was chosen. */
async function chooseAndUpload(input: HTMLInputElement | null, kind: UploadKind): Promise<string | null> {
  const file = input?.files?.[0];
  if (!file) return null;
  try {
    return await uploadImage(file, kind);
  } finally {
    if (input) input.value = ""; // allow choosing the same file again
  }
}

interface SingleProps {
  label: string;
  kind: Exclude<UploadKind, "gallery">;
  value: string | null;
  /** Receives the new public URL, or null when removed. May be async (e.g. saves to the API). */
  onChange: (url: string | null) => void | Promise<void>;
  round?: boolean;
}

/** One image slot: preview, choose/replace, remove. */
export function ImageUploader({ label, kind, value, onChange, round }: SingleProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(work: () => Promise<string | null | undefined>) {
    setBusy(true);
    setError(null);
    try {
      const next = await work();
      if (next !== undefined) await onChange(next);
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-primary">{label}</span>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt={`${label} preview`}
          className={round ? "h-24 w-24 rounded-full object-cover" : "h-40 w-full rounded-xl object-cover"}
        />
      ) : (
        <span className="text-xs text-slate-500">No image yet.</span>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label={`${label} file`}
        onChange={() => void run(async () => (await chooseAndUpload(input.current, kind)) ?? undefined)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Uploading..." : value ? "Replace" : "Choose photo"}
        </Button>
        {value && !busy ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => void run(async () => null)}>
            Remove
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface GalleryProps {
  values: string[];
  onChange: (urls: string[]) => void | Promise<void>;
}

/** Up to six gallery photos: add, and remove each. */
export function GalleryUploader({ values, onChange }: GalleryProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(work: () => Promise<string[] | undefined>) {
    setBusy(true);
    setError(null);
    try {
      const next = await work();
      if (next) await onChange(next);
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-primary">
        Gallery ({values.length}/{MAX_GALLERY_IMAGES})
      </span>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {values.map((url) => (
          <li key={url} className="flex flex-col gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Gallery photo" className="aspect-square w-full rounded-xl object-cover" />
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void run(async () => values.filter((v) => v !== url))}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label="Add gallery photo"
        onChange={() =>
          void run(async () => {
            const url = await chooseAndUpload(input.current, "gallery");
            return url ? [...values, url] : undefined;
          })
        }
      />
      {values.length < MAX_GALLERY_IMAGES ? (
        <div>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading..." : "Add photo"}
          </Button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
