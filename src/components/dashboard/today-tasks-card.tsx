"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";

import { SectionHeader } from "@/components/shared/page-header";
import { TaskItem } from "@/components/tasks/task-item";
import { Card } from "@/components/ui/card";
import { useWorkspace } from "@/lib/store/workspace-store";
import { isDueToday, isOverdue } from "@/lib/tasks/task-queries";
import { isActive } from "@/lib/tasks/task-model";
import { cn } from "@/lib/utils";

const LIMIT = 6;

/**
 * Phones and tablets: what's due today (overdue first), tickable in place.
 * On large screens the sprint overview beside it already shows this.
 */
export function TodayTasksCard({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const { tasks, today } = workspace;
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const dueToday = tasks.filter((t) => isActive(t) && isDueToday(t, today));
  const list = [...overdue, ...dueToday].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.sortOrder - b.sortOrder);
  const shown = list.slice(0, LIMIT);

  return (
    <Card className={cn("p-5", className)} data-testid="today-tasks">
      <SectionHeader
        title="Today’s tasks"
        description={overdue.length ? `${dueToday.length} due today · ${overdue.length} overdue` : `${dueToday.length} due today`}
        icon={<ListChecks className="size-4" />}
      />
      {shown.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
          Nothing due today. Pick something from a sprint, or enjoy the space.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {shown.map((task) => (
            <li key={task.id}>
              <TaskItem task={task} showDescription={false} />
            </li>
          ))}
        </ul>
      )}
      {list.length > LIMIT && (
        <Link href="/tasks" className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
          {list.length - LIMIT} more on Tasks
        </Link>
      )}
    </Card>
  );
}
