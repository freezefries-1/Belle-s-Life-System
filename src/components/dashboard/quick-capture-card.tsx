"use client";

import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

import { CaptureForm } from "@/components/shared/capture-form";
import { SectionHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { CAPTURE_KIND_BY_ID } from "@/data/capture-kinds";
import { relativeDayLabel } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

export function QuickCaptureCard({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const inbox = workspace.captures.filter((c) => !c.processed);
  const recent = inbox.slice(0, 3);

  return (
    <Card className={cn("p-5", className)}>
      <SectionHeader
        title="Brain dump"
        description="Capture it now. Sort it later."
        icon={<Inbox className="size-4" />}
      />
      <CaptureForm className="mt-4" />

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Recently captured</p>
        <span className="text-[11px] text-muted-foreground tabular-nums">{inbox.length} in inbox</span>
      </div>
      <ul className="mt-2 flex flex-col">
        {recent.map((item) => {
          const kind = CAPTURE_KIND_BY_ID[item.kind];
          return (
            <li key={item.id} className="flex items-center gap-2.5 border-b border-dashed py-2 last:border-0">
              <kind.icon className={cn("size-3.5 shrink-0", kind.className)} aria-label={kind.label} />
              <span className="min-w-0 flex-1 truncate text-[13px]">{item.text}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {relativeDayLabel(item.capturedDate, workspace.today)}
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        href="/brain-dump"
        className="group mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-primary hover:text-primary-hover"
      >
        Sort your brain dump
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Card>
  );
}
