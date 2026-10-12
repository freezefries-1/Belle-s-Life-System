import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { ProjectsPage } from "@/components/pages/projects-page";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <ClientPage>
      <ProjectsPage />
    </ClientPage>
  );
}
