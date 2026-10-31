import type { LadderCheck, LadderStage, TrackId } from "@/types";

/**
 * The coaching ladder: four tracks a student moves through at their own pace.
 *
 * The built-in stages below are the starting point. Your edits (saved as
 * LadderStage records) replace a stage's name, focus and milestones, or add
 * stages at the end of a track. Stage ids (R1, S3, …) and milestone ids
 * (R5-1, …) never change, so rewording never loses a student's progress.
 */

export interface StageDef {
  id: string;
  name: string;
  /** What they're working on at this stage. */
  focus: string;
  /** "Ready to move on when…" — the milestones for this stage (may be empty). */
  checks: LadderCheck[];
  /** One of the built-in stages (can be reset, not deleted). */
  builtIn: boolean;
  /** Reworded by you. */
  edited: boolean;
}

export interface TrackDef {
  id: TrackId;
  name: string;
  /** Letter that stage ids start with (R, S, N, M). */
  prefix: string;
  stages: StageDef[];
}

export type Ladder = Record<TrackId, TrackDef> & { tracks: TrackDef[] };

type Builtin = [id: string, name: string, focus: string, checks: string[]];

const BUILTIN: { id: TrackId; name: string; prefix: string; stages: Builtin[] }[] = [
  {
    id: "rally",
    name: "Rally",
    prefix: "R",
    stages: [
      ["R1", "Contact", "Fed balls, forehand and backhand: grip, ready position, swing shape", ["7 out of 10 fed forehands over the net", "7 out of 10 fed backhands over the net"]],
      ["R2", "Short court", "Service line to service line, centre to centre", ["10-ball rally on the short court"]],
      ["R3", "Reading the bounce", "Short court, both sides, small steps to the ball", ["20-ball rally on the short court", "Moves their feet to the ball, doesn't reach"]],
      ["R4", "Move back", "Baseline, centre to centre", ["10-ball rally from the baseline"]],
      ["R5", "Baseline steady", "Baseline, centre to centre", ["20-ball rally from the baseline", "Half the balls land past the service line"]],
      ["R6", "Small movement", "One or two steps left and right, back to the middle", ["10-ball rally with movement", "Split step and recovery to the middle"]],
      ["R7", "Direction", "Crosscourt forehand and backhand, then down the line", ["10+ crosscourt forehands in a row", "10+ crosscourt backhands in a row", "Changes direction when called"]],
      ["R8", "Depth and spin", "Topspin, depth, side to side", ["7 out of 10 balls deep", "Rally 15+ moving side to side"]],
      ["R9", "Live ball", "Rallies under pace; attacking short balls, defending wide balls", ["Keeps rallies going under pressure", "Picks the right ball to attack"]],
    ],
  },
  {
    id: "serve",
    name: "Serve",
    prefix: "S",
    stages: [
      ["S1", "Toss and motion", "Toss and swing shape, no pressure on getting it in", ["Consistent toss, 7 out of 10"]],
      ["S2", "From the service line", "Short distance into the box", ["5 out of 10 in from the service line"]],
      ["S3", "From the baseline", "Full distance", ["5 out of 10 in, deuce box", "5 out of 10 in, advantage box"]],
      ["S4", "Reliable", "A serving routine; a dependable second serve", ["7 out of 10 in", "Has a serving routine", "Few double faults when playing points"]],
      ["S5", "Placement", "To the T and out wide, when called", ["Hits the called target 5 out of 10"]],
      ["S6", "Spin second serve", "Slice or kick", ["7 out of 10 spin second serves in"]],
      ["S7", "Under pressure", "Serving in real matches", ["No more than 1 double fault per game in matches"]],
    ],
  },
  {
    id: "net",
    name: "Net",
    prefix: "N",
    stages: [
      ["N1", "Ready at the net", "Ready position; fed volleys on both sides", []],
      ["N2", "Volley to volley", "Volley to volley, short court", []],
      ["N3", "Volleys off groundstrokes", "Volleys off groundstroke feeds", ["7 out of 10 volleys into a target"]],
      ["N4", "Approach and overhead", "Approach and volley; overheads", ["Overheads 5 out of 10"]],
      ["N5", "Net in points", "Coming forward at the right moment in points", []],
    ],
  },
  {
    id: "match",
    name: "Match play",
    prefix: "M",
    stages: [
      ["M1", "Scoring", "Knows the scoring and court rules", []],
      ["M2", "Points from a rally", "Plays points starting from a rally", []],
      ["M3", "Games with serve", "Plays games with serving", []],
      ["M4", "Sets and tiebreaks", "Plays sets and tiebreaks", []],
      ["M5", "Club competitions", "Plays club competitions", []],
      ["M6", "Tournaments", "STA and other tournaments, with a match plan and a review afterwards", []],
    ],
  },
];

export const TRACK_IDS: TrackId[] = BUILTIN.map((t) => t.id);

const stageNumber = (prefix: string, id: string) => (id.startsWith(prefix) ? Number(id.slice(prefix.length)) : NaN);

/** The ladder as you use it: the built-in stages with your edits, plus any stages you added. */
export function buildLadder(edits: LadderStage[] = []): Ladder {
  const tracks = BUILTIN.map((t): TrackDef => {
    const mine = new Map(edits.filter((e) => e.track === t.id).map((e) => [e.stage, e]));
    const builtIn = t.stages.map(([id, name, focus, checks]): StageDef => {
      const e = mine.get(id);
      return e
        ? { id, name: e.name, focus: e.focus, checks: e.checks, builtIn: true, edited: true }
        : { id, name, focus, checks: checks.map((text, i) => ({ id: `${id}-${i + 1}`, text })), builtIn: true, edited: false };
    });
    const known = new Set(t.stages.map(([id]) => id));
    const added = [...mine.values()]
      .filter((e) => !known.has(e.stage) && Number.isInteger(stageNumber(t.prefix, e.stage)))
      .sort((a, b) => stageNumber(t.prefix, a.stage) - stageNumber(t.prefix, b.stage))
      .map((e): StageDef => ({ id: e.stage, name: e.name, focus: e.focus, checks: e.checks, builtIn: false, edited: true }));
    return { id: t.id, name: t.name, prefix: t.prefix, stages: [...builtIn, ...added] };
  });
  return Object.assign(Object.fromEntries(tracks.map((t) => [t.id, t])) as Record<TrackId, TrackDef>, { tracks });
}

/** The built-in ladder, with no edits. */
export const DEFAULT_LADDER = buildLadder();

/** The built-in version of a stage (for "Reset to default"), or null for a stage you added. */
export function builtInStage(track: TrackId, stage: string): StageDef | null {
  return DEFAULT_LADDER[track].stages.find((s) => s.id === stage) ?? null;
}

/** The id for a new stage at the end of a track, e.g. R10. */
export function nextStageId(ladder: Ladder, track: TrackId) {
  const t = ladder[track];
  const max = Math.max(0, ...t.stages.map((s) => stageNumber(t.prefix, s.id)).filter(Number.isFinite));
  return `${t.prefix}${max + 1}`;
}

/** Position of a stage on its track (0-based), or -1 if it isn't on the ladder. */
export function stageIndex(ladder: Ladder, track: TrackId, stage: string) {
  return ladder[track].stages.findIndex((s) => s.id === stage);
}

export function stageDef(ladder: Ladder, track: TrackId, stage: string): StageDef | null {
  return ladder[track].stages.find((s) => s.id === stage) ?? null;
}

export type Level = "Not assessed" | "Beginner" | "High beginner" | "Intermediate" | "Advanced" | "Competitive";

/**
 * The overall level comes from the Rally stage; Competitive also needs
 * competition play (Match play M5 or above). Stages you add after R9 count
 * the same as R9.
 */
export function overallLevel(ladder: Ladder, rally: string | null, match: string | null): Level {
  const r = rally ? stageIndex(ladder, "rally", rally) : -1;
  if (r < 0) return "Not assessed";
  if (r <= 2) return "Beginner";
  if (r <= 4) return "High beginner";
  if (r <= 6) return "Intermediate";
  if (r === 7) return "Advanced";
  return (match ? stageIndex(ladder, "match", match) : -1) >= 4 ? "Competitive" : "Advanced";
}
