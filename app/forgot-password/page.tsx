import { Suspense } from "react";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-cream" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
