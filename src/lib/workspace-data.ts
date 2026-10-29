import type { PersistedData } from "@/types";

/**
 * Does this workspace hold anything the person made? An auto-created, empty
 * Kaizen Log for today doesn't count. Used to guard anything that would
 * replace the workspace (such as loading sample data).
 */
export function hasAnyData(d: PersistedData) {
  return (
    d.tasks.length > 0 ||
    d.captures.length > 0 ||
    d.sessions.length > 0 ||
    d.highlights.length > 0 ||
    d.commitments.length > 0 ||
    d.commitmentCompletions.length > 0 ||
    d.projects.length > 0 ||
    d.milestones.length > 0 ||
    d.recurrences.length > 0 ||
    d.weeklyReviews.length > 0 ||
    d.weeklyPriorities.length > 0 ||
    d.students.length > 0 ||
    d.studentStages.length > 0 ||
    d.studentLessons.length > 0 ||
    d.kaizenLogs.some((l) => l.notes || l.reflectionWentWell || l.reflectionImprove || l.reflectionLearned)
  );
}
