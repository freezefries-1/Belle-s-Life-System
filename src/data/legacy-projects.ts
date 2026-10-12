import type { ProjectColour, ProjectIcon } from "@/types";

/**
 * Before Phase 5, tasks could link to four built-in preview projects by id.
 * When upgrading, a real project is created only for ids a saved task
 * actually uses — so existing links keep working and nothing else is added.
 * The opt-in sample data reuses the same definitions.
 */
export const LEGACY_PROJECTS: Record<
  string,
  { name: string; description: string; category: string; colour: ProjectColour; icon: ProjectIcon }
> = {
  p_sportcraft: {
    name: "SportCraft OS",
    description: "Website, product catalogue and day-to-day operations for SportCraft.",
    category: "Business",
    colour: "blue",
    icon: "briefcase",
  },
  p_ladder: {
    name: "Evolve Tennis Ladder",
    description: "Season fixtures, results and the end-of-season tournament.",
    category: "Tennis Ladder",
    colour: "amber",
    icon: "trophy",
  },
  p_coaching: {
    name: "Tennis & Pickleball Coaching",
    description: "Students, clinics, scheduling and lesson planning.",
    category: "Coaching",
    colour: "teal",
    icon: "dumbbell",
  },
  p_life: {
    name: "Personal Life Management",
    description: "Home, admin, health and the everyday essentials.",
    category: "Personal",
    colour: "violet",
    icon: "house",
  },
};
