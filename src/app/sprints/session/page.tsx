import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { SessionView } from "@/components/sprints/session-view";

export const metadata: Metadata = { title: "Focus session" };

export default function Page() {
  return (
    <ClientPage>
      <SessionView />
    </ClientPage>
  );
}
