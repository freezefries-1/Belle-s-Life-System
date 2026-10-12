"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Sprout } from "lucide-react";

import { CommitmentCheck } from "@/components/commitments/commitment-check";
import { CommitmentEditorDialog } from "@/components/commitments/commitment-editor-dialog";
import { SectionHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { getCommitmentProgress, getScheduledFor } from "@/lib/daily/commitments";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

export function MicroCommitmentsCard({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const [creating, setCreating] = React.useState(false);
  const { commitments, commitmentCompletions, today } = workspace;
  const scheduled = getScheduledFor(commitments, today, commitmentCompletions);
  const progress = getCommitmentProgress(commitments, today, commitmentCompletions);

  return (
    <Card className={cn("p-5", className)}>
      <SectionHeader
        title="Micro-commitments"
        description="Small actions, repeated."
        icon={<Sprout className="size-4" />}
        action={
          progress.scheduled > 0 && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {progress.done}/{progress.scheduled}
            </span>
          )
        }
      />
      {scheduled.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed px-3 py-4 text-center">
          <p className="text-[13px] text-muted-foreground">
            {commitments.some((c) => c.status === "active") ? "Nothing scheduled today. Enjoy the space." : "No commitments yet."}
          </p>
          {commitments.length === 0 && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
            >
              <Plus className="size-3.5" />
              Add a small one
            </button>
          )}
        </div>
      ) : (
        <div className="-mx-2 mt-3 flex flex-col">
          {scheduled.map((c) => (
            <CommitmentCheck key={c.id} commitment={c} date={today} />
          ))}
        </div>
      )}
      <Link href="/micro-commitments" className="mt-3 self-start text-xs font-semibold text-primary hover:text-primary-hover">
        Manage commitments
      </Link>
      {creating && <CommitmentEditorDialog open={creating} onOpenChange={setCreating} />}
    </Card>
  );
}
