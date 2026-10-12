import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { SprintsPage } from "@/components/pages/sprints-page";

export const metadata: Metadata = { title: "Sprints" };

export default function Page() {
  return (
    <ClientPage>
      <SprintsPage />
    </ClientPage>
  );
}
