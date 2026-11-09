import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { RecoveryPage } from "@/components/pages/recovery-page";

export const metadata: Metadata = { title: "Recovery & Sleep" };

export default function Page() {
  return (
    <ClientPage>
      <RecoveryPage />
    </ClientPage>
  );
}
