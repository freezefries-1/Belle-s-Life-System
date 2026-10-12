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
    description: "Things that need attention right now.",
    energyHint: "Quick wins — clear them to free your head.",
  },
  {
    id: "deadlines",
    number: 2,
    name: "Deadlines",
    description: "Important work with a date attached.",
    energyHint: "Best with steady focus.",
  },
  {
    id: "admin",
    number: 3,
    name: "Admin & Life",
    description: "Organising, scheduling and the household.",
    energyHint: "Good for lower-energy moments.",
  },
  {
    id: "build",
    number: 4,
    name: "Build & Create",
    description: "Creative and deep-focus work.",
    energyHint: "Save for when your mind is fresh.",
  },
];

export const SPRINT_BY_ID = Object.fromEntries(SPRINTS.map((s) => [s.id, s])) as Record<
  SprintId,
  Sprint
>;

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
    text: "text-sprint-deadlines",
    tint: "bg-amber-50",
    bar: "bg-sprint-deadlines",
    border: "border-t-sprint-deadlines",
  },
  admin: {
    dot: "bg-sprint-admin",
    text: "text-sprint-admin",
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
