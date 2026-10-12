"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Task } from "@/types";

import { SprintQuickAssign } from "./sprint-quick-assign";
import { SortableTaskCard, SprintTaskCard } from "./sprint-task-card";

/** Tasks without a sprint yet. Nothing is auto-classified — Belle decides. */
export function UnassignedTray({
  tasks,
  reorderable,
  filtered,
  defaultOpen = true,
  canDragAcross = true,
}: {
  tasks: Task[];
  reorderable: boolean;
  filtered: boolean;
  defaultOpen?: boolean;
  /** False on small screens, where only one column is shown at a time. */
  canDragAcross?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned", data: { type: "container" } });

  return (
    <section
      id="unassigned"
      aria-labelledby="unassigned-title"
      className={cn(
        "scroll-mt-24 rounded-xl border border-dashed bg-card/70 transition-colors",
        isOver && reorderable && "border-primary/50 bg-accent/40",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Inbox className="size-4 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="unassigned-title" className="block text-[15px] font-semibold">
            Unassigned <span className="ml-1 font-semibold text-muted-foreground tabular-nums">{tasks.length}</span>
          </span>
          <span className="block text-xs text-muted-foreground">
            Not sorted into a sprint yet. Assign with one tap{reorderable && canDragAcross ? ", or drag onto a sprint" : ""}.
          </span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* The drop zone stays mounted so tasks can be dragged here even when collapsed. */}
      <div ref={setNodeRef} className={cn("px-3 pb-3", !open && "pb-0")}>
        {open &&
          (tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
              {filtered ? "Nothing matches these filters." : "Every open task has a sprint."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {reorderable ? (
                <SortableContext id="unassigned" items={tasks.map((t) => t.id)} strategy={rectSortingStrategy}>
                  {tasks.map((t) => (
                    <SortableTaskCard key={t.id} task={t} footer={<SprintQuickAssign task={t} />} />
                  ))}
                </SortableContext>
              ) : (
                tasks.map((t) => <SprintTaskCard key={t.id} task={t} footer={<SprintQuickAssign task={t} />} />)
              )}
            </div>
          ))}
      </div>
    </section>
  );
}
