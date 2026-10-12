import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { TasksPage } from "@/components/pages/tasks-page";

export const metadata: Metadata = { title: "Tasks" };

export default function Page() {
  return (
    <ClientPage>
      <TasksPage />
    </ClientPage>
  );
}
