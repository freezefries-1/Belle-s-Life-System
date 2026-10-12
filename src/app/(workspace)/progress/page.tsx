import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { ProgressPage } from "@/components/pages/progress-page";

export const metadata: Metadata = { title: "Progress" };

export default function Page() {
  return (
    <ClientPage>
      <ProgressPage />
    </ClientPage>
  );
}
