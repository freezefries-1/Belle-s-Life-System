"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  closestCorners,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SPRINTS, SPRINT_STYLES, sprintLabel } from "@/data/sprints";
import { useWorkspace } from "@/lib/store/workspace-store";
import {
  canReorder,
  getColumnTasks,
  getManualOrder,
  isBoardFiltered,
  orderUpdatesFor,
  sprintFor,
  type BoardContainer,
  type BoardQuery,
} from "@/lib/tasks/sprint-board";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

import { SprintColumn } from "./sprint-column";
import { SprintTaskCard } from "./sprint-task-card";
import { UnassignedTray } from "./unassigned-tray";

const CONTAINERS: BoardContainer[] = ["unassigned", ...SPRINTS.map((s) => s.id)];
type Arrangement = Record<BoardContainer, string[]>;

const containerLabel = (c: BoardContainer) => (c === "unassigned" ? "Unassigned" : sprintLabel(c));

function readHash(): BoardContainer | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1) as BoardContainer;
  return CONTAINERS.includes(hash) ? hash : null;
}

export function SprintBoard({ query }: { query: BoardQuery }) {
  const { workspace, actions } = useWorkspace();
  const { tasks, today } = workspace;
  const reorderable = canReorder(query);
  const filtered = isBoardFiltered(query);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mobileTab, setMobileTab] = React.useState<BoardContainer>(() => readHash() ?? "urgent");

  // Scroll to a sprint when arriving from a dashboard link (e.g. /sprints#admin),
  // and follow later hash changes (back/forward, edited URL).
  React.useEffect(() => {
    const show = () => {
      const target = readHash();
      if (!target) return;
      setMobileTab(target);
      if (isDesktop) document.getElementById(target)?.scrollIntoView({ block: "start" });
    };
    show();
    window.addEventListener("hashchange", show);
    return () => window.removeEventListener("hashchange", show);
  }, [isDesktop]);

  const taskById = React.useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const saved = React.useMemo(
    () => Object.fromEntries(CONTAINERS.map((c) => [c, getManualOrder(tasks, c).map((t) => t.id)])) as Arrangement,
    [tasks],
  );

  // While dragging, a local arrangement previews the move; it's saved on drop.
  const [draft, setDraft] = React.useState<Arrangement | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const arrangement = draft ?? saved;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Keep the live arrangement reachable from the collision callback.
  const arrangementRef = React.useRef(arrangement);
  React.useEffect(() => {
    arrangementRef.current = arrangement;
  }, [arrangement]);

  /**
   * Prefer the card under the pointer. If the pointer is over a column's
   * empty space, snap to the nearest card in that column so drops land in a
   * predictable spot; an empty column accepts the drop itself.
   */
  const collisionDetection = React.useCallback<CollisionDetection>((args) => {
    const pointer = pointerWithin(args);
    const hits = pointer.length > 0 ? pointer : rectIntersection(args);
    let overId = getFirstCollision(hits, "id");
    if (overId == null) return closestCorners(args);
    if (CONTAINERS.includes(overId as BoardContainer)) {
      const items = arrangementRef.current[overId as BoardContainer];
      if (items.length > 0) {
        const nearest = closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((c) => items.includes(c.id as string)),
        });
        overId = nearest[0]?.id ?? overId;
      }
    }
    return [{ id: overId }];
  }, []);

  const findContainer = (id: UniqueIdentifier, from: Arrangement): BoardContainer | null => {
    if (CONTAINERS.includes(id as BoardContainer)) return id as BoardContainer;
    return CONTAINERS.find((c) => from[c].includes(id as string)) ?? null;
  };

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
    setDraft(saved);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    // Insert below the hovered card when the dragged card's top is past its middle.
    const dragged = active.rect.current.translated;
    const below = !!dragged && dragged.top > over.rect.top + over.rect.height / 2;
    setDraft((prev) => {
      const current = prev ?? saved;
      const from = findContainer(active.id, current);
      const to = findContainer(over.id, current);
      if (!from || !to || from === to) return current;
      const target = current[to];
      const overIndex = target.indexOf(over.id as string);
      const insertAt = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length;
      return {
        ...current,
        [from]: current[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, insertAt), active.id as string, ...target.slice(insertAt)],
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const current = draft ?? saved;
    setActiveId(null);
    setDraft(null);
    if (!over) return;

    const id = active.id as string;
    const origin = findContainer(id, saved);
    const to = findContainer(over.id, current);
    if (!origin || !to) return;

    // Moves between sprints were already positioned while hovering (onDragOver);
    // within a sprint, reorder to the card it was dropped on.
    let final = current;
    if (origin === to) {
      const list = current[to];
      const oldIndex = list.indexOf(id);
      const newIndex = over.id === to ? list.length - 1 : list.indexOf(over.id as string);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        final = { ...current, [to]: arrayMove(list, oldIndex, newIndex) };
      }
    }

    const touched = new Set<BoardContainer>([origin, to]);
    const unchanged = [...touched].every((c) => final[c].join() === saved[c].join());
    if (unchanged) return;

    actions.applyBoardOrder([...touched].flatMap((c) => orderUpdatesFor(c, final[c])));
    if (origin !== to) {
      const task = taskById.get(id);
      toast(`Moved to ${containerLabel(to)}`, {
        description: task?.title,
        action: { label: "Undo", onClick: () => actions.moveTaskToSprint(id, sprintFor(origin)) },
      });
    }
  }

  const titleOf = (id: UniqueIdentifier) => taskById.get(id as string)?.title ?? "task";
  const where = (id: UniqueIdentifier | undefined) => {
    if (id === undefined) return "";
    const c = findContainer(id, draft ?? saved);
    if (!c) return "";
    const position = (draft ?? saved)[c].indexOf(id as string);
    return position >= 0 ? `${containerLabel(c)}, position ${position + 1}` : containerLabel(c);
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${titleOf(active.id)} is over ${where(over.id)}.` : `${titleOf(active.id)} is not over a sprint.`),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${titleOf(active.id)} in ${where(over.id)}.` : `${titleOf(active.id)} was dropped back.`),
    onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled.`,
  };

  /** Cards for a column: the live arrangement when reordering, otherwise filtered/sorted. */
  const columnTasks = (c: BoardContainer): Task[] =>
    reorderable
      ? arrangement[c].map((id) => taskById.get(id)).filter((t): t is Task => !!t)
      : getColumnTasks(tasks, c, query, today);

  const activeTask = activeId ? taskById.get(activeId) : undefined;
  const unassignedCount = getManualOrder(tasks, "unassigned").length;

  const renderColumn = (c: BoardContainer) =>
    c === "unassigned" ? (
      <UnassignedTray
        key="unassigned"
        tasks={columnTasks("unassigned")}
        reorderable={reorderable}
        filtered={filtered}
        defaultOpen={unassignedCount > 0}
        canDragAcross={isDesktop}
      />
    ) : (
      <SprintColumn
        key={c}
        sprint={SPRINTS.find((s) => s.id === c)!}
        tasks={columnTasks(c)}
        reorderable={reorderable}
        filtered={filtered}
      />
    );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDraft(null);
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "To pick up a task, press space or enter. Use the arrow keys to move it within or between sprints. Press space or enter again to drop it, or escape to cancel.",
        },
      }}
    >
      {isDesktop ? (
        <div className="flex flex-col gap-5">
          {renderColumn("unassigned")}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {SPRINTS.map((s) => renderColumn(s.id))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="-mx-4 overflow-x-auto px-4">
            <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as BoardContainer)}>
              <TabsList>
                {SPRINTS.map((s) => (
                  <TabsTrigger standalone key={s.id} value={s.id} className="gap-1.5">
                    <span className={cn("size-1.5 rounded-full", SPRINT_STYLES[s.id].dot)} />
                    {s.number}. {s.name}
                  </TabsTrigger>
                ))}
                <TabsTrigger standalone value="unassigned">Unassigned · {unassignedCount}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {renderColumn(mobileTab)}
        </div>
      )}

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {activeTask ? <SprintTaskCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
