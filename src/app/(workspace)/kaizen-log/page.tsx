import { Suspense } from "react";
import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { KaizenLogPage } from "@/components/pages/kaizen-log-page";

export const metadata: Metadata = { title: "Kaizen Log" };

export default function Page() {
  return (
    <ClientPage>
      {/* Reads ?date= from the URL, so it sits inside its own Suspense boundary. */}
      <Suspense fallback={<PageSkeleton />}>
        <KaizenLogPage />
      </Suspense>
    </ClientPage>
  );
}
