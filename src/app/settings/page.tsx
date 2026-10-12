import type { Metadata } from "next";

import { ClientPage } from "@/components/layout/client-page";
import { SettingsPage } from "@/components/pages/settings-page";

export const metadata: Metadata = { title: "Preferences" };

export default function Page() {
  return (
    <ClientPage>
      <SettingsPage />
    </ClientPage>
  );
}
