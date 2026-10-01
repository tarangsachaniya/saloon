import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY } from "@/lib/legal/content/privacy";

export const metadata: Metadata = {
  title: PRIVACY.title,
  description: PRIVACY.summary,
};

export default function Page() {
  return <LegalPage doc={PRIVACY} path="/legal/privacy" />;
}
