import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { StudentsPage } from "@/components/pages/students-page";

export const metadata: Metadata = { title: "Students" };

export default function Page() {
  return (
    <ClientPage>
      <StudentsPage />
    </ClientPage>
  );
}
