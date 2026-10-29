import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { StudentPage } from "@/components/pages/student-page";

export const metadata: Metadata = { title: "Student" };

/** Student data lives in the browser (and the account), so the page renders client-side. */
export default function Page() {
  return (
    <ClientPage>
      <StudentPage />
    </ClientPage>
  );
}
