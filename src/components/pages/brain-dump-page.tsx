"use client";

import * as React from "react";
import { ArrowRightLeft, Check, Inbox, MoreHorizontal, Trash2, Undo2 } from "lucide-react";

import { CaptureForm } from "@/components/shared/capture-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SprintDot } from "@/components/shared/sprint-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CAPTURE_KINDS, CAPTURE_KIND_BY_ID } from "@/data/capture-kinds";
import { SPRINTS } from "@/data/sprints";
import { relativeDayLabel } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { CaptureItem, CaptureKind } from "@/types";

type Filter = "all" | CaptureKind;

export function BrainDumpPage() {
  const { workspace } = useWorkspace();
  const [filter, setFilter] = React.useState<Filter>("all");
  const inbox = workspace.captures.filter((c) => !c.processed && (filter === "all" || c.kind === filter));
  const sorted = workspace.captures.filter((c) => c.processed);
  const unsortedCount = workspace.captures.filter((c) => !c.processed).length;

  return (
    <>
      <PageHeader
        title="Brain Dump"
        description="An inbox for everything on your mind. Capture without deciding — sort when you have a quiet moment."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-4 sm:p-5">
            <CaptureForm size="lg" />
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                {CAPTURE_KINDS.map((k) => (
                  <TabsTrigger key={k.id} value={k.id}>
                    {k.label}s
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground tabular-nums">{unsortedCount} waiting to be sorted</p>
          </div>

          <Card className="overflow-hidden">
            {inbox.length === 0 ? (
              <EmptyState icon={Inbox} title="Inbox clear" description="Nothing waiting here. Your head has a little more room." />
            ) : (
              <ul className="divide-y">
                {inbox.map((item) => (
                  <CaptureRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </Card>

          {sorted.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-foreground">
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span> sorted items ({sorted.length})
              </summary>
              <Card className="mt-3 overflow-hidden">
                <ul className="divide-y">
                  {sorted.map((item) => (
                    <CaptureRow key={item.id} item={item} />
                  ))}
                </ul>
              </Card>
            </details>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="text-[15px] font-semibold">Sorting, gently</h3>
            <ol className="mt-3 flex flex-col gap-3 text-[13px] text-muted-foreground">
              {[
                ["Under two minutes?", "Just do it, then mark it sorted."],
                ["A real task?", "Send it to the sprint that matches the kind of work."],
                ["An idea or note?", "Keep it here until it’s useful. No pressure."],
                ["No longer matters?", "Let it go. Deleting is progress too."],
              ].map(([q, a], i) => (
                <li key={q} className="flex gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">{q}</span> {a}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="p-5">
            <h3 className="text-[15px] font-semibold">In your inbox</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {CAPTURE_KINDS.map((k) => (
                <li key={k.id} className="flex items-center gap-2.5 text-[13px]">
                  <k.icon className={cn("size-4", k.className)} />
                  <span className="flex-1">{k.label}s</span>
                  <span className="font-semibold tabular-nums">
                    {workspace.captures.filter((c) => !c.processed && c.kind === k.id).length}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}

function CaptureRow({ item }: { item: CaptureItem }) {
  const { workspace, actions } = useWorkspace();
  const kind = CAPTURE_KIND_BY_ID[item.kind];

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <kind.icon className={cn("size-4", kind.className)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13.5px] font-medium", item.processed && "text-muted-foreground line-through decoration-slate-300")}>
          {item.text}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {kind.label} · {relativeDayLabel(item.capturedDate, workspace.today)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {!item.processed && (
          <Button
            variant="ghost"
            size="xs"
            className="hidden gap-1 sm:inline-flex"
            onClick={() => actions.toggleCaptureProcessed(item.id)}
          >
            <Check className="size-3.5" />
            Sorted
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label={`Actions for “${item.text}”`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {!item.processed && (
              <>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowRightLeft className="size-3.5" />
                  Turn into a task in…
                </DropdownMenuLabel>
                {SPRINTS.map((s) => (
                  <DropdownMenuItem key={s.id} onSelect={() => actions.convertCaptureToTask(item.id, s.id)}>
                    <SprintDot sprintId={s.id} className="ml-1" />
                    Sprint {s.number}: {s.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onSelect={() => actions.toggleCaptureProcessed(item.id)}>
              {item.processed ? <Undo2 /> : <Check />}
              {item.processed ? "Move back to inbox" : "Mark as sorted"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.removeCapture(item.id)} className="text-rose-600 focus:text-rose-700">
              <Trash2 className="text-rose-500" />
              Let it go
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
