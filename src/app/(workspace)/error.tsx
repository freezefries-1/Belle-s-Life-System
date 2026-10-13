"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Shown when a page crashes while drawing. The sidebar, and the workspace
 * data held above this page (including changes still being saved), stay as
 * they are, so trying again or moving to another page loses nothing.
 */
export default function WorkspaceError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center">
      <TriangleAlert className="size-6 text-amber-500" />
      <h2 className="text-lg font-bold">Something went wrong on this page</h2>
      <p className="text-[13px] text-muted-foreground">
        Your data hasn’t been affected — the problem is only in showing this page. Try again, or go to another page.
      </p>
      {error.digest && <p className="text-[11px] text-subtle-foreground">Reference: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()} className="gap-1.5">
          <RefreshCw className="size-4" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go to Today</Link>
        </Button>
      </div>
    </div>
  );
}
