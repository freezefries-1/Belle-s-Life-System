import { createMilestone, nextProjectSortOrder } from "@/lib/projects/project-model";
import type { ISODateTime, Milestone, MilestoneInput, PersistedData, Project, ProjectInput, ProjectStatus } from "@/types";

/** Projects and milestones. */

export const addProject = (d: PersistedData, project: Project): PersistedData => ({ ...d, projects: [...d.projects, project] });

export const updateProject = (d: PersistedData, id: string, changes: Partial<ProjectInput>, now: ISODateTime): PersistedData => ({
  ...d,
  projects: d.projects.map((p) =>
    p.id === id
      ? {
          ...p,
          ...changes,
          name: changes.name?.trim() || p.name,
          description: changes.description !== undefined ? changes.description.trim() : p.description,
          category: changes.category !== undefined ? changes.category.trim() : p.category,
          archivedAt: changes.status ? (changes.status === "archived" ? (p.archivedAt ?? now) : null) : p.archivedAt,
          updatedAt: now,
        }
      : p,
  ),
});

export const setProjectStatus = (d: PersistedData, id: string, status: ProjectStatus, now: ISODateTime): PersistedData => ({
  ...d,
  projects: d.projects.map((p) =>
    p.id === id && p.status !== status ? { ...p, status, archivedAt: status === "archived" ? now : null, updatedAt: now } : p,
  ),
});

/** Deletes the project and its milestones. Never cascades: its tasks (and recurring templates) stay, just without a project. */
export const deleteProject = (d: PersistedData, id: string, now: ISODateTime): PersistedData => ({
  ...d,
  projects: d.projects.filter((p) => p.id !== id),
  milestones: d.milestones.filter((m) => m.projectId !== id),
  tasks: d.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null, milestoneId: null, updatedAt: now } : t)),
  recurrences: d.recurrences.map((r) => (r.projectId === id ? { ...r, projectId: null } : r)),
});

/** Link (or unlink with null) an existing task; it goes to the bottom of that project's list. */
export function linkTaskToProject(d: PersistedData, taskId: string, projectId: string | null, now: ISODateTime): PersistedData {
  const task = d.tasks.find((t) => t.id === taskId);
  if (!task || task.projectId === projectId) return d;
  const linked = {
    ...task,
    projectId,
    milestoneId: null,
    projectSortOrder: projectId ? nextProjectSortOrder(d.tasks, projectId) : 0,
    updatedAt: now,
  };
  return { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? linked : t)) };
}

export function reorderProjectTasks(d: PersistedData, projectId: string, orderedTaskIds: string[]): PersistedData {
  const position = new Map(orderedTaskIds.map((id, i) => [id, (i + 1) * 1000]));
  let changed = false;
  const tasks = d.tasks.map((t) => {
    const next = position.get(t.id);
    if (t.projectId !== projectId || next === undefined || next === t.projectSortOrder) return t;
    changed = true;
    return { ...t, projectSortOrder: next };
  });
  return changed ? { ...d, tasks } : d;
}

/** A new milestone at the end of its project's list, or null if the project doesn't exist. */
export function newMilestone(d: PersistedData, projectId: string, input: MilestoneInput, now: ISODateTime): Milestone | null {
  if (!input.title.trim() || !d.projects.some((p) => p.id === projectId)) return null;
  const order = d.milestones.filter((m) => m.projectId === projectId).reduce((max, m) => Math.max(max, m.sortOrder), 0) + 1000;
  return createMilestone(projectId, input, order, now);
}

export const addMilestone = (d: PersistedData, milestone: Milestone): PersistedData => ({ ...d, milestones: [...d.milestones, milestone] });

export const updateMilestone = (d: PersistedData, id: string, changes: Partial<MilestoneInput>, now: ISODateTime): PersistedData => ({
  ...d,
  milestones: d.milestones.map((m) =>
    m.id === id
      ? {
          ...m,
          ...changes,
          title: changes.title?.trim() || m.title,
          description: changes.description !== undefined ? changes.description.trim() : m.description,
          updatedAt: now,
          completedAt: changes.status === undefined ? m.completedAt : changes.status === "completed" ? (m.completedAt ?? now) : null,
        }
      : m,
  ),
});

/** Tasks linked to it stay, unlinked from the milestone. */
export const deleteMilestone = (d: PersistedData, id: string): PersistedData => ({
  ...d,
  milestones: d.milestones.filter((m) => m.id !== id),
  tasks: d.tasks.map((t) => (t.milestoneId === id ? { ...t, milestoneId: null } : t)),
});

export function reorderMilestones(d: PersistedData, projectId: string, orderedIds: string[]): PersistedData {
  const position = new Map(orderedIds.map((id, i) => [id, (i + 1) * 1000]));
  return {
    ...d,
    milestones: d.milestones.map((m) => (m.projectId === projectId && position.has(m.id) ? { ...m, sortOrder: position.get(m.id)! } : m)),
  };
}
