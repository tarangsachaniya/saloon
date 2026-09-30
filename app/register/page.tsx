import { Suspense } from "react";

import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-cream" />}>
      <RegisterForm />
    </Suspense>
  );
}
