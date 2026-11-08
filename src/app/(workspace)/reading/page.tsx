import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { ReadingPage } from "@/components/pages/reading-page";

export const metadata: Metadata = { title: "Reading" };

export default function Page() {
  return (
    <ClientPage>
      <ReadingPage />
    </ClientPage>
  );
}
