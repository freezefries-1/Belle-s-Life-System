"use client";

import * as React from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link2, ListChecks, Plus } from "lucide-react";

import { TaskItem } from "@/components/tasks/task-item";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { projectTasksOrdered } from "@/lib/projects/project-model";
import { useWorkspace } from "@/lib/store/workspace-store";
import { isActive } from "@/lib/tasks/task-model";
import type { Task } from "@/types";

import { LinkTaskDialog } from "./link-task-dialog";

/** The project's tasks — the same task records as everywhere else, in a project-specific order. */
export function ProjectTaskList({ projectId }: { projectId: string }) {
  const { workspace, actions } = useWorkspace();
  const editor = useTaskEditor();
  const [linking, setLinking] = React.useState(false);
  const ordered = projectTasksOrdered(workspace.tasks, projectId);
  const open = ordered.filter(isActive);
  const closed = ordered.filter((t) => !isActive(t));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = open.map((t) => t.id);
    const next = arrayMove(ids, ids.indexOf(active.id as string), ids.indexOf(over.id as string));
    actions.reorderProjectTasks(projectId, [...next, ...closed.map((t) => t.id)]);
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <ListChecks className="size-4 text-muted-foreground" />
          Tasks
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLinking(true)}>
            <Link2 className="size-3.5" />
            Link existing
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => editor.openCreate({ projectId })}>
            <Plus className="size-3.5" />
            Add task
          </Button>
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed px-3 py-6 text-center text-[13px] text-muted-foreground">
          No tasks yet. Add one, or link tasks you already have.
        </p>
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={open.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="mt-3 flex flex-col divide-y" aria-label="Open project tasks">
                {open.map((t) => (
                  <SortableRow key={t.id} task={t} projectId={projectId} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          {open.length === 0 && <p className="mt-3 text-[13px] text-muted-foreground">Every task here is done.</p>}
          {closed.length > 0 && (
            <details className="group mt-3">
              <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-foreground">
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span> completed & skipped ({closed.length})
              </summary>
              <ul className="mt-2 flex flex-col divide-y">
                {closed.map((t) => (
                  <li key={t.id} className="pl-6">
                    <TaskItem task={t} projectId={projectId} showDescription={false} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {linking && <LinkTaskDialog projectId={projectId} open={linking} onOpenChange={setLinking} />}
    </Card>
  );
}

function SortableRow({ task, projectId }: { task: Task; projectId: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 rounded-lg bg-card opacity-80 shadow-lg" : undefined}
    >
      <div className="flex items-start">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder “${task.title}”. Press space to pick up, arrow keys to move.`}
          className="mt-2.5 flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-subtle-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <TaskItem task={task} projectId={projectId} />
        </div>
      </div>
    </li>
  );
}
