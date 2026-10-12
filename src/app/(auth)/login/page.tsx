import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    // Reads ?next= from the URL.
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
