"use client";

import { LoadErrorPanel, SyncBanner } from "@/components/cloud/sync-status";
import { WorkspaceReady, useWorkspaceLoadState } from "@/lib/store/workspace-store";

import { PageSkeleton } from "./page-skeleton";

/**
 * Wraps a page's interactive content: a skeleton while data loads, a clear
 * error with a retry if it can't, and the sync banner when saving needs
 * attention.
 */
export function ClientPage({ children }: { children: React.ReactNode }) {
  const load = useWorkspaceLoadState();
  if (load?.error) return <LoadErrorPanel message={load.error} onRetry={load.retry} />;
  return (
    <WorkspaceReady fallback={<PageSkeleton />}>
      <SyncBanner />
      {children}
    </WorkspaceReady>
  );
}
