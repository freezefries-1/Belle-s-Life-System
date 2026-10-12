import { projectedOccurrences } from "@/lib/recurrence/recurrence";
import type { ISODate, Workspace } from "@/types";

export type CalendarItemKind = "task" | "recurring" | "planned" | "project" | "milestone" | "prep";

export interface CalendarItem {
  key: string;
  kind: CalendarItemKind;
  date: ISODate;
  title: string;
  /** Secondary line, e.g. the project name. */
  meta: string | null;
  done: boolean;
  taskId?: string;
  templateId?: string;
  projectId?: string;
  milestoneId?: string;
}

export const CALENDAR_KIND_LABEL: Record<CalendarItemKind, string> = {
  task: "Task due",
  recurring: "Recurring task",
  planned: "Planned repeat",
  project: "Project deadline",
  milestone: "Milestone",
  prep: "Start preparing",
};

const KIND_ORDER: CalendarItemKind[] = ["project", "milestone", "prep", "task", "recurring", "planned"];

/**
 * Everything dated between `from` and `to` (inclusive), derived on the fly
 * from tasks, projects, milestones and recurrence rules — nothing is copied
 * or stored. Skipped tasks and archived projects are left out.
 */
export function getCalendarItems(ws: Workspace, from: ISODate, to: ISODate): CalendarItem[] {
  const inRange = (d: ISODate | null): d is ISODate => !!d && d >= from && d <= to;
  const projectName = (id: string | null) => (id ? (ws.projects.find((p) => p.id === id)?.name ?? null) : null);
  const items: CalendarItem[] = [];

  for (const t of ws.tasks) {
    if (!inRange(t.dueDate) || t.status === "skipped") continue;
    items.push({
      key: `t-${t.id}`,
      kind: t.recurrenceTemplateId ? "recurring" : "task",
      date: t.dueDate,
      title: t.title,
      meta: projectName(t.projectId),
      done: t.status === "completed",
      taskId: t.id,
    });
  }

  for (const r of ws.recurrences) {
    for (const date of projectedOccurrences(r, from > ws.today ? from : ws.today, to)) {
      // Already generated (or deliberately deleted) dates are covered by tasks / generatedThrough.
      if (ws.tasks.some((t) => t.recurrenceTemplateId === r.id && t.occurrenceDate === date)) continue;
      items.push({ key: `r-${r.id}-${date}`, kind: "planned", date, title: r.title, meta: projectName(r.projectId), done: false, templateId: r.id });
    }
  }

  for (const p of ws.projects) {
    if (p.status === "archived") continue;
    const done = p.status === "completed";
    if (inRange(p.targetDate)) items.push({ key: `p-${p.id}`, kind: "project", date: p.targetDate, title: p.name, meta: null, done, projectId: p.id });
    if (!done && inRange(p.preparationDate))
      items.push({ key: `pp-${p.id}`, kind: "prep", date: p.preparationDate, title: p.name, meta: "Project", done: false, projectId: p.id });
    for (const m of ws.milestones) {
      if (m.projectId !== p.id) continue;
      const mDone = m.status === "completed";
      if (inRange(m.targetDate))
        items.push({ key: `m-${m.id}`, kind: "milestone", date: m.targetDate, title: m.title, meta: p.name, done: mDone, projectId: p.id, milestoneId: m.id });
      if (!mDone && !done && inRange(m.preparationDate))
        items.push({ key: `mp-${m.id}`, kind: "prep", date: m.preparationDate, title: m.title, meta: p.name, done: false, projectId: p.id, milestoneId: m.id });
    }
  }

  return items.sort(
    (a, b) => a.date.localeCompare(b.date) || Number(a.done) - Number(b.done) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.title.localeCompare(b.title),
  );
}
