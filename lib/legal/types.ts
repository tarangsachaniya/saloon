/** A block inside a legal section: a paragraph, or a bulleted list. */
export type LegalBlock = string | { list: readonly string[] };

export type LegalSection = {
  id: string;
  title: string;
  body: readonly LegalBlock[];
};

export type LegalDoc = {
  title: string;
  eyebrow: string;
  /** One-line summary shown under the title and used as the meta description. */
  summary: string;
  sections: readonly LegalSection[];
};
