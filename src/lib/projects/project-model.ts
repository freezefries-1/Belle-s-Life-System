import { createId } from "@/lib/id";
import { addDays, daysBetween } from "@/lib/date";
import { isActive, isCompleted, isSkipped } from "@/lib/tasks/task-model";
import { isOverdue } from "@/lib/tasks/task-queries";
import type {
  ISODate,
  ISODateTime,
  Milestone,
  MilestoneInput,
  MilestoneStatus,
  Project,
  ProjectColour,
  ProjectIcon,
  ProjectInput,
  ProjectStatus,
  Task,
} from "@/types";

export const PROJECT_STATUSES: { id: ProjectStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "planning", label: "Planning" },
  { id: "on_hold", label: "On Hold" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
];
export const PROJECT_STATUS_LABEL = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.id, s.label])) as Record<ProjectStatus, string>;

export const MILESTONE_STATUSES: { id: MilestoneStatus; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];
export const MILESTONE_STATUS_LABEL = Object.fromEntries(MILESTONE_STATUSES.map((s) => [s.id, s.label])) as Record<
  MilestoneStatus,
  string
>;

export const PROJECT_COLOURS: ProjectColour[] = ["blue", "teal", "amber", "violet", "rose", "slate"];
export const PROJECT_ICONS: ProjectIcon[] = ["folder", "briefcase", "trophy", "house", "heart", "sparkles", "book", "dumbbell"];
export const CATEGORY_SUGGESTIONS = ["Business", "Coaching", "Tennis Ladder", "Personal", "Health", "Home"];

/** Is the project still being worked on (shown on Today, in deadlines, in pickers)? */
export const isOpenProject = (p: Project) => p.status !== "completed" && p.status !== "archived";

export function createProject(input: ProjectInput, now: ISODateTime): Project {
  return {
    id: createId(),
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    status: input.status ?? "active",
    priority: input.priority ?? null,
    category: input.category?.trim() ?? "",
    startDate: input.startDate ?? null,
    targetDate: input.targetDate ?? null,
    preparationDate: input.preparationDate ?? null,
    icon: input.icon ?? "folder",
    colour: input.colour ?? "blue",
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
    archivedAt: input.status === "archived" ? now : null,
  };
}

export function createMilestone(projectId: string, input: MilestoneInput, sortOrder: number, now: ISODateTime): Milestone {
  return {
    id: createId(),
    projectId,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    targetDate: input.targetDate ?? null,
    preparationDate: input.preparationDate ?? null,
    status: input.status ?? "upcoming",
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

/* ---------------- Deadlines ---------------- */

/** Days before a deadline when it counts as "approaching". One place to tune it later. */
export const APPROACHING_DAYS = 7;

export type DeadlineStatus = "upcoming" | "approaching" | "due_today" | "overdue" | "completed";

export const DEADLINE_LABEL: Record<DeadlineStatus, string> = {
  upcoming: "Upcoming",
  approaching: "Approaching",
  due_today: "Due today",
  overdue: "Overdue",
  completed: "Completed",
};

/** Compared on local calendar dates. Finished work is never "overdue". */
export function deadlineStatus(target: ISODate, today: ISODate, done = false): DeadlineStatus {
  if (done) return "completed";
  const days = daysBetween(today, target);
  if (days < 0) return "overdue";
  if (days === 0) return "due_today";
  if (days <= APPROACHING_DAYS) return "approaching";
  return "upcoming";
}

export function daysRemainingLabel(target: ISODate, today: ISODate) {
  const days = daysBetween(today, target);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "1 day ago";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** Preparation date = N days before the target. */
export const prepDateFor = (target: ISODate, daysBefore: number) => addDays(target, -Math.max(0, Math.round(daysBefore)));

/* ---------------- Progress ---------------- */

/**
 * Completed ÷ all project tasks (skipped ones left out). `percent` is null
 * when there are no tasks — never a fake 100%. Status stays a separate,
 * manual choice.
 */
export function getProjectProgress(tasks: Task[], milestones: Milestone[], projectId: string, today: ISODate) {
  const all = tasks.filter((t) => t.projectId === projectId && !isSkipped(t));
  const done = all.filter(isCompleted).length;
  const open = all.filter(isActive);
  const projectMilestones = milestones.filter((m) => m.projectId === projectId);
  const nextTaskDue = open.map((t) => t.dueDate).filter((d): d is string => !!d && d >= today).sort()[0] ?? null;
  const nextMilestone =
    projectMilestones
      .filter((m) => m.status !== "completed" && m.targetDate && m.targetDate >= today)
      .sort((a, b) => a.targetDate!.localeCompare(b.targetDate!))[0] ?? null;
  const nextDeadline = [nextTaskDue, nextMilestone?.targetDate ?? null].filter((d): d is string => !!d).sort()[0] ?? null;
  return {
    total: all.length,
    completed: done,
    remaining: all.length - done,
    active: open.length,
    overdue: open.filter((t) => isOverdue(t, today)).length,
    percent: all.length ? Math.round((done / all.length) * 100) : null,
    upcomingMilestones: projectMilestones.filter((m) => m.status !== "completed").length,
    nextDeadline,
  };
}

export const projectTasksOrdered = (tasks: Task[], projectId: string) =>
  tasks
    .filter((t) => t.projectId === projectId)
    .sort((a, b) => a.projectSortOrder - b.projectSortOrder || a.createdAt.localeCompare(b.createdAt));

export const nextProjectSortOrder = (tasks: Task[], projectId: string) =>
  tasks.filter((t) => t.projectId === projectId).reduce((max, t) => Math.max(max, t.projectSortOrder), 0) + 1000;

export const milestonesOrdered = (milestones: Milestone[], projectId: string) =>
  milestones.filter((m) => m.projectId === projectId).sort((a, b) => a.sortOrder - b.sortOrder);

/* ---------------- Deadline overview (derived, never stored) ---------------- */

export type DeadlineItemKind = "project" | "milestone" | "project-prep" | "milestone-prep";

export interface DeadlineItem {
  key: string;
  kind: DeadlineItemKind;
  date: ISODate;
  title: string;
  projectId: string;
  projectName: string;
  milestoneId?: string;
  status: DeadlineStatus;
  /** Preparation reminders are labelled separately from real deadlines. */
  isPreparation: boolean;
}

/**
 * Project deadlines, milestones and preparation dates from open projects.
 * Preparation dates only appear once they're near (or have arrived) and
 * while the real deadline is still ahead.
 */
export function getDeadlineItems(projects: Project[], milestones: Milestone[], today: ISODate, horizonDays = 30) {
  const horizon = addDays(today, horizonDays);
  const items: DeadlineItem[] = [];
  for (const p of projects.filter(isOpenProject)) {
    if (p.targetDate) {
      items.push({ key: `p-${p.id}`, kind: "project", date: p.targetDate, title: p.name, projectId: p.id, projectName: p.name, status: deadlineStatus(p.targetDate, today), isPreparation: false });
      if (p.preparationDate && p.targetDate >= today) {
        items.push({ key: `pp-${p.id}`, kind: "project-prep", date: p.preparationDate, title: p.name, projectId: p.id, projectName: p.name, status: deadlineStatus(p.targetDate, today), isPreparation: true });
      }
    }
    for (const m of milestones.filter((x) => x.projectId === p.id && x.status !== "completed")) {
      if (!m.targetDate) continue;
      items.push({ key: `m-${m.id}`, kind: "milestone", date: m.targetDate, title: m.title, projectId: p.id, projectName: p.name, milestoneId: m.id, status: deadlineStatus(m.targetDate, today), isPreparation: false });
      if (m.preparationDate && m.targetDate >= today) {
        items.push({ key: `mp-${m.id}`, kind: "milestone-prep", date: m.preparationDate, title: m.title, projectId: p.id, projectName: p.name, milestoneId: m.id, status: deadlineStatus(m.targetDate, today), isPreparation: true });
      }
    }
  }
  return items
    .filter((i) => (i.isPreparation ? i.date <= horizon : i.status === "overdue" || i.date <= horizon))
    .sort((a, b) => {
      const rank = (i: DeadlineItem) => (i.status === "overdue" && !i.isPreparation ? 0 : 1);
      return rank(a) - rank(b) || a.date.localeCompare(b.date) || Number(a.isPreparation) - Number(b.isPreparation);
    });
}
