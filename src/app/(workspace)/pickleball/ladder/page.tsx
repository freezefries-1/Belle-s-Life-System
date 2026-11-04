import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { LadderPage } from "@/components/pages/ladder-page";

export const metadata: Metadata = { title: "My pickleball ladder" };

export default function Page() {
  return (
    <ClientPage>
      <LadderPage sport="pickleball" />
    </ClientPage>
  );
}
