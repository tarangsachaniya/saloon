import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { DATA_CONSENT } from "@/lib/legal/content/data-consent";

export const metadata: Metadata = {
  title: DATA_CONSENT.title,
  description: DATA_CONSENT.summary,
};

export default function Page() {
  return <LegalPage doc={DATA_CONSENT} path="/legal/data-consent" />;
}
