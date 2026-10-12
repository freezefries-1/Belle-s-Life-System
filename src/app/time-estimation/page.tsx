import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { TimeEstimationPage } from "@/components/pages/time-estimation-page";

export const metadata: Metadata = { title: "Time Estimation" };

export default function Page() {
  return (
    <ClientPage>
      <TimeEstimationPage />
    </ClientPage>
  );
}
