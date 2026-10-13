"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { CaptureForm } from "@/components/brain-dump/capture-form";
import { CaptureInbox } from "@/components/brain-dump/capture-inbox";
import { PageHeader } from "@/components/shared/page-header";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CAPTURE_KINDS } from "@/data/capture-kinds";
import { sortCaptures } from "@/lib/brain-dump/capture-model";
import { localDateOf, relativeDayLabel } from "@/lib/date";
import { getInbox } from "@/lib/selectors";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { CaptureKind } from "@/types";

type Filter = "all" | CaptureKind;

const WORKFLOW = ["Brain Dump", "Review", "Convert to task", "Organise", "Complete"];

export function BrainDumpPage() {
  const { workspace } = useWorkspace();
  const editor = useTaskEditor();
  const [filter, setFilter] = React.useState<Filter>("all");
  const inbox = getInbox(workspace);
  const visible = inbox.filter((c) => filter === "all" || c.kind === filter);
  const converted = sortCaptures(workspace.captures.filter((c) => c.status === "converted")).slice(0, 10);

  return (
    <>
      <PageHeader
        title="Brain Dump"
        description="Capture first, organise later. Entries stay here until you turn them into tasks or let them go."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-4 sm:p-5">
            <CaptureForm size="lg" />
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList>
                <TabsTrigger standalone value="all">All</TabsTrigger>
                {CAPTURE_KINDS.map((k) => (
                  <TabsTrigger standalone key={k.id} value={k.id}>
                    {k.label}s
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <p className="text-xs font-medium text-muted-foreground tabular-nums" aria-live="polite">
              {inbox.length} in inbox
            </p>
          </div>

          <CaptureInbox captures={visible} filtered={filter !== "all" && inbox.length > 0} />

          {converted.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-foreground">
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span> recently converted ({converted.length})
              </summary>
              <Card className="mt-3 overflow-hidden">
                <ul className="divide-y">
                  {converted.map((c) => {
                    const task = workspace.tasks.find((t) => t.id === c.convertedTaskId);
                    return (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px] sm:px-5">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.title}</span>
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                          {relativeDayLabel(localDateOf(c.updatedAt), workspace.today)}
                        </span>
                        {task ? (
                          <button
                            type="button"
                            onClick={() => editor.openEdit(task.id)}
                            className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:text-primary-strong"
                          >
                            Open task <ArrowRight className="size-3" />
                          </button>
                        ) : (
                          <span className="shrink-0 text-xs text-muted-foreground">Task deleted</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </details>
          )}
        </div>

        <aside className="flex flex-col gap-4" aria-label="How the Brain Dump works">
          <Card className="p-5">
            <h3 className="text-[15px] font-semibold">From thought to done</h3>
            <ol className="mt-3 flex flex-col gap-2.5 text-[13px]">
              {WORKFLOW.map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      i === 0 ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn(i === 0 && "font-semibold")}>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Capturing isn’t committing. Nothing here has a date or sprint until you decide it should.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="text-[15px] font-semibold">In your inbox</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {CAPTURE_KINDS.map((k) => (
                <li key={k.id} className="flex items-center gap-2.5 text-[13px]">
                  <k.icon className={cn("size-4", k.className)} />
                  <span className="flex-1">{k.label}s</span>
                  <span className="font-semibold tabular-nums">{inbox.filter((c) => c.kind === k.id).length}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
