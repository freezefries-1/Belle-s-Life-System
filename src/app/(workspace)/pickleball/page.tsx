import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { PickleballPage } from "@/components/pages/pickleball-page";

export const metadata: Metadata = { title: "My Pickleball" };

export default function Page() {
  return (
    <ClientPage>
      <PickleballPage />
    </ClientPage>
  );
}
