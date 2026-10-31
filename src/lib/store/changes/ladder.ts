import { createId } from "@/lib/id";
import { buildLadder, nextStageId, stageDef } from "@/lib/students/ladder";
import type { ISODateTime, LadderCheck, LadderStage, LadderStageInput, PersistedData, TrackId } from "@/types";

/**
 * Coaching ladder changes: rewording stages, their milestones, and adding
 * your own stages at the end of a track.
 */

const ladderId = (track: TrackId, stage: string) => `${track}:${stage}`;

/** Milestones as typed: trimmed, empty ones dropped, new ones given an id that never changes. */
export function cleanChecks(checks: { id?: string; text: string }[]): LadderCheck[] {
  const seen = new Set<string>();
  const out: LadderCheck[] = [];
  for (const c of checks) {
    const text = c.text.trim();
    if (!text) continue;
    let id = c.id?.trim() || createId();
    if (seen.has(id)) id = createId();
    seen.add(id);
    out.push({ id, text });
  }
  return out;
}

/** Save your wording for a stage (built-in or one you added). */
export function saveLadderStage(d: PersistedData, track: TrackId, stage: string, input: LadderStageInput, now: ISODateTime): PersistedData {
  const current = stageDef(buildLadder(d.ladderStages), track, stage);
  const name = input.name.trim();
  if (!current || !name) return d;
  const id = ladderId(track, stage);
  const existing = d.ladderStages.find((s) => s.id === id);
  const next: LadderStage = {
    id,
    track,
    stage,
    name,
    focus: (input.focus ?? current.focus).trim(),
    checks: input.checks ? cleanChecks(input.checks) : current.checks,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  return { ...d, ladderStages: existing ? d.ladderStages.map((s) => (s.id === id ? next : s)) : [...d.ladderStages, next] };
}

/** Add a stage at the end of a track. Returns its id (e.g. R10). */
export function addLadderStage(d: PersistedData, track: TrackId, input: LadderStageInput, now: ISODateTime): { data: PersistedData; stage: string } | null {
  const name = input.name.trim();
  if (!name) return null;
  const stage = nextStageId(buildLadder(d.ladderStages), track);
  const entry: LadderStage = {
    id: ladderId(track, stage),
    track,
    stage,
    name,
    focus: input.focus?.trim() ?? "",
    checks: cleanChecks(input.checks ?? []),
    createdAt: now,
    updatedAt: now,
  };
  return { stage, data: { ...d, ladderStages: [...d.ladderStages, entry] } };
}

/** Is a stage in use (reached by a student, or with ticked milestones)? */
export const stageInUse = (d: PersistedData, track: TrackId, stage: string) =>
  d.studentStages.some((s) => s.track === track && s.stage === stage) || d.studentChecks.some((c) => c.track === track && c.stage === stage);

/**
 * Reset a built-in stage to its original wording, or delete a stage you added.
 * A stage you added can only be deleted while no student has reached it, and
 * only the last one on a track (so stage numbers never get gaps).
 * Returns what was removed, for Undo.
 */
export function removeLadderStage(d: PersistedData, track: TrackId, stage: string): { data: PersistedData; removed: LadderStage } | null {
  const ladder = buildLadder(d.ladderStages);
  const def = stageDef(ladder, track, stage);
  const entry = d.ladderStages.find((s) => s.id === ladderId(track, stage));
  if (!def || !entry) return null;
  if (!def.builtIn) {
    const last = ladder[track].stages.at(-1);
    if (last?.id !== stage || stageInUse(d, track, stage)) return null;
  }
  return { removed: entry, data: { ...d, ladderStages: d.ladderStages.filter((s) => s.id !== entry.id) } };
}

export const restoreLadderStage = (d: PersistedData, entry: LadderStage): PersistedData =>
  d.ladderStages.some((s) => s.id === entry.id) ? d : { ...d, ladderStages: [...d.ladderStages, entry] };
