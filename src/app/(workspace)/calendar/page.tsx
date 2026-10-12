import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { CalendarPage } from "@/components/pages/calendar-page";

export const metadata: Metadata = { title: "Calendar" };

export default function Page() {
  return (
    <ClientPage>
      <CalendarPage />
    </ClientPage>
  );
}
