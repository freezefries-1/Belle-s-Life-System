import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { BrainDumpPage } from "@/components/pages/brain-dump-page";

export const metadata: Metadata = { title: "Brain Dump" };

export default function Page() {
  return (
    <ClientPage>
      <BrainDumpPage />
    </ClientPage>
  );
}
