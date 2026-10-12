"use client";

import Link from "next/link";
import { Sprout } from "lucide-react";

import { CommitmentWeek } from "@/components/shared/commitment-week";
import { SectionHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { isCommitmentDone } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

export function MicroCommitmentsCard({ className }: { className?: string }) {
  const { workspace, actions } = useWorkspace();
  const doneCount = workspace.commitments.filter((c) => isCommitmentDone(c, workspace.today)).length;

  return (
    <Card className={cn("p-5", className)}>
      <SectionHeader
        title="Micro-commitments"
        description="Tiny actions. Done most days."
        icon={<Sprout className="size-4" />}
        action={
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {doneCount}/{workspace.commitments.length}
          </span>
        }
      />
      <ul className="mt-4 flex flex-col gap-1">
        {workspace.commitments.map((c) => {
          const done = isCommitmentDone(c, workspace.today);
          const id = `commit-${c.id}`;
          return (
            <li key={c.id} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
              <Checkbox id={id} checked={done} onCheckedChange={() => actions.toggleCommitment(c.id)} className="mt-[3px]" />
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                <span
                  className={cn(
                    "block text-[13.5px] leading-snug font-medium",
                    done && "text-muted-foreground line-through decoration-slate-300",
                  )}
                >
                  {c.title}
                </span>
                {c.cue && <span className="mt-0.5 block text-xs text-muted-foreground">{c.cue}</span>}
              </label>
              <CommitmentWeek commitment={c} today={workspace.today} className="mt-1.5" />
            </li>
          );
        })}
      </ul>
      <Link
        href="/micro-commitments"
        className="mt-3 self-start text-xs font-semibold text-primary hover:text-primary-hover"
      >
        View all commitments
      </Link>
    </Card>
  );
}
