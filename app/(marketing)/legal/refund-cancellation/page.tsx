import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { REFUND_CANCELLATION } from "@/lib/legal/content/refund-cancellation";

export const metadata: Metadata = {
  title: REFUND_CANCELLATION.title,
  description: REFUND_CANCELLATION.summary,
};

export default function Page() {
  return <LegalPage doc={REFUND_CANCELLATION} path="/legal/refund-cancellation" />;
}
