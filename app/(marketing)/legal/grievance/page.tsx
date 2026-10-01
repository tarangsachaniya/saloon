import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { GRIEVANCE } from "@/lib/legal/content/grievance";

export const metadata: Metadata = {
  title: GRIEVANCE.title,
  description: GRIEVANCE.summary,
};

export default function Page() {
  return <LegalPage doc={GRIEVANCE} path="/legal/grievance" />;
}
