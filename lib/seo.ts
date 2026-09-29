/**
 * Text that search engines and share cards show (titles, descriptions,
 * JSON-LD, OG images) carries no em dashes. Salon names and taglines are
 * owner-entered, so clean them here rather than trusting the input.
 */
export function seoText(text: string): string;
export function seoText(text: string | null | undefined): string | undefined;
export function seoText(text: string | null | undefined): string | undefined {
  if (text == null) return undefined;
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/^, |, $/g, "")
    .trim();
}
