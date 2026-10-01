import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { COOKIES } from "@/lib/legal/content/cookies";

export const metadata: Metadata = {
  title: COOKIES.title,
  description: COOKIES.summary,
};

export default function Page() {
  return <LegalPage doc={COOKIES} path="/legal/cookies" />;
}
