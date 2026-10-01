/**
 * Guards for live image previews (a URL being typed). `next/image` THROWS on a
 * value that isn't a root-relative path or an absolute URL, so a half-typed "p"
 * would crash the whole form.
 */

/** "/images/x.jpg" or a complete http(s) URL; anything else is not previewable yet. */
export function isPreviewableImageSrc(value: string): boolean {
  const src = value.trim();
  if (src.startsWith("/")) return !src.startsWith("//") && !src.startsWith("/\\");
  try {
    const url = new URL(src);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Absolute URLs may be on a host not in `next.config` remotePatterns: skip the optimizer for them. */
export function isRemoteImageSrc(value: string): boolean {
  return !value.trim().startsWith("/");
}
