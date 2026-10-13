import { CalendarClock, House, Sparkles, Zap, type LucideIcon } from "lucide-react";

import type { Sprint, SprintId } from "@/types";

/**
 * The four sprints are kinds of work, not a priority queue.
 * Belle picks the order each day based on energy and circumstances.
 */
export const SPRINTS: Sprint[] = [
  {
    id: "urgent",
    number: 1,
    name: "Urgent",
    description: "Needs attention now — waiting would have a real consequence.",
    energyHint: "Being due today doesn’t make something urgent.",
  },
  {
    id: "deadlines",
    number: 2,
    name: "Deadlines",
    description: "Important work with a date — plan it ahead, calmly.",
    energyHint: "Best with steady focus.",
  },
  {
    id: "admin",
    number: 3,
    name: "Admin & Life",
    description: "Routine admin, organising and the household.",
    energyHint: "Often good in between other things.",
  },
  {
    id: "build",
    number: 4,
    name: "Build & Create",
    description: "Creative work, deep thinking and long-term improvement.",
    energyHint: "Protect time for fewer interruptions.",
  },
];

export const SPRINT_BY_ID = Object.fromEntries(SPRINTS.map((s) => [s.id, s])) as Record<
  SprintId,
  Sprint
>;

export const SPRINT_ICONS: Record<SprintId, LucideIcon> = {
  urgent: Zap,
  deadlines: CalendarClock,
  admin: House,
  build: Sparkles,
};

/** Tailwind classes per sprint — kept here so colours stay consistent everywhere. */
export const SPRINT_STYLES: Record<
  SprintId,
  { dot: string; text: string; tint: string; bar: string; border: string }
> = {
  urgent: {
    dot: "bg-sprint-urgent",
    text: "text-sprint-urgent",
    tint: "bg-rose-50",
    bar: "bg-sprint-urgent",
    border: "border-t-sprint-urgent",
  },
  deadlines: {
    dot: "bg-sprint-deadlines",
    text: "text-sprint-deadlines-text",
    tint: "bg-amber-50",
    bar: "bg-sprint-deadlines",
    border: "border-t-sprint-deadlines",
  },
  admin: {
    dot: "bg-sprint-admin",
    text: "text-sprint-admin-text",
    tint: "bg-teal-50",
    bar: "bg-sprint-admin",
    border: "border-t-sprint-admin",
  },
  build: {
    dot: "bg-sprint-build",
    text: "text-sprint-build",
    tint: "bg-violet-50",
    bar: "bg-sprint-build",
    border: "border-t-sprint-build",
  },
};

export function sprintLabel(id: SprintId) {
  const s = SPRINT_BY_ID[id];
  return `Sprint ${s.number}: ${s.name}`;
}
