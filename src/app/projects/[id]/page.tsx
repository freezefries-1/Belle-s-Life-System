import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { ProjectWorkspacePage } from "@/components/pages/project-workspace-page";

export const metadata: Metadata = { title: "Project" };

/** Project data lives in the browser, so the page renders entirely client-side. */
export default function Page() {
  return (
    <ClientPage>
      <ProjectWorkspacePage />
    </ClientPage>
  );
}
