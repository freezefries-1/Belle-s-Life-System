import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { MicroCommitmentsPage } from "@/components/pages/micro-commitments-page";

export const metadata: Metadata = { title: "Micro-Commitments" };

export default function Page() {
  return (
    <ClientPage>
      <MicroCommitmentsPage />
    </ClientPage>
  );
}
