import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The Salonly mark (`app/icon.svg`, also the favicon) as a data URL, for
 * `next/og` images. One source file, so the favicon, apple icon and share
 * cards never drift apart.
 */
export async function brandMarkDataUrl(): Promise<string> {
  const svg = await readFile(join(process.cwd(), "app", "icon.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}
