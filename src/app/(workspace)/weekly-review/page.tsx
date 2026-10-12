import { Suspense } from "react";
import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { WeeklyReviewPage } from "@/components/pages/weekly-review-page";

export const metadata: Metadata = { title: "Weekly Review" };

export default function Page() {
  return (
    <ClientPage>
      {/* Reads ?week= from the URL, so it sits inside its own Suspense boundary. */}
      <Suspense fallback={<PageSkeleton />}>
        <WeeklyReviewPage />
      </Suspense>
    </ClientPage>
  );
}
