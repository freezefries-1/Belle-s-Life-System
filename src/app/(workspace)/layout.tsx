import { AppShell } from "@/components/layout/app-shell";

/** Every workspace page shares the sidebar, top bar and data providers. */
export default function WorkspaceLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
