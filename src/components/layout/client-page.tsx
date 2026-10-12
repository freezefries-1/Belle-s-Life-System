"use client";

import { WorkspaceReady } from "@/lib/store/workspace-store";

import { PageSkeleton } from "./page-skeleton";

/**
 * Wraps a page's interactive content. Sample data is built from the
 * viewer's local date, so content appears right after hydration with a
 * brief skeleton beforehand.
 */
export function ClientPage({ children }: { children: React.ReactNode }) {
  return <WorkspaceReady fallback={<PageSkeleton />}>{children}</WorkspaceReady>;
}
