import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { TERMS } from "@/lib/legal/content/terms";

export const metadata: Metadata = {
  title: TERMS.title,
  description: TERMS.summary,
};

export default function Page() {
  return <LegalPage doc={TERMS} path="/legal/terms" />;
}
