import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { KaizenLogPage } from "@/components/pages/kaizen-log-page";

export const metadata: Metadata = { title: "Kaizen Log" };

export default function Page() {
  return (
    <ClientPage>
      <KaizenLogPage />
    </ClientPage>
  );
}
