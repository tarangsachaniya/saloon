import { Suspense } from "react";

import { GoogleDone } from "@/components/auth/GoogleDone";

export default function GoogleDonePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-cream" />}>
      <GoogleDone />
    </Suspense>
  );
}
