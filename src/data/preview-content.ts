import { addDays } from "@/lib/date";
import type { ISODate, PreviewContent } from "@/types";

/**
 * Sample content for the one page whose real functionality arrives in a
 * later phase (the Weekly Review's wins, challenges and priorities).
 * Generated relative to today and kept in memory only — never saved.
 */
export function createPreviewContent(today: ISODate): PreviewContent {
  const d = (offset: number) => addDays(today, offset);

  return {
    weeklyReview: {
      id: "w_current",
      weekStart: d(-6),
      wins: [
        "Got the SportCraft product catalogue live",
        "Kept the morning reading habit going most days",
        "Ladder sign-up form is working — 24 players registered",
      ],
      challenges: [
        "Admin tasks piled up mid-week after back-to-back coaching days",
        "Underestimated how long photography and restringing take",
      ],
      lessons:
        "Batching admin into one short sprint after lunch works better than squeezing it between lessons.",
      nextWeekPriorities: [
        "Finish Evolve Tennis Ladder tournament materials",
        "Ship the first version of the SportCraft website",
        "Plan the new pickleball clinic",
      ],
    },
  };
}
