import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { WeeklyReviewPage } from "@/components/pages/weekly-review-page";

export const metadata: Metadata = { title: "Weekly Review" };

export default function Page() {
  return (
    <ClientPage>
      <WeeklyReviewPage />
    </ClientPage>
  );
}
