import type { LadderCheck, LadderStage, Sport, TrackId } from "@/types";

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
  sport: Sport;
  name: string;
  /** Letter that stage ids start with (R, S, N, M). */
  prefix: string;
  stages: StageDef[];
}

export type Ladder = Record<TrackId, TrackDef> & { tracks: TrackDef[] };

type Builtin = [id: string, name: string, focus: string, checks: string[]];

const BUILTIN: { id: TrackId; sport: Sport; name: string; prefix: string; stages: Builtin[] }[] = [
  {
    id: "rally",
    sport: "tennis",
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
    sport: "tennis",
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
    sport: "tennis",
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
    sport: "tennis",
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
  // Pickleball (My Pickleball): stages line up with DUPR levels — 1 ≈ 4.0, 2 ≈ 4.5, 3 ≈ 5.0, 4 ≈ 5.5+.
  {
    id: "kitchen",
    sport: "pickleball",
    name: "Kitchen (dinks)",
    prefix: "K",
    stages: [
      ["K1", "Consistent dinks (4.0)", "Crosscourt dinks that stay low and land in the kitchen", ["20-ball crosscourt dink rally, both sides", "Few dinks pop up above the net"]],
      ["K2", "Patient dinking (4.5)", "Long dink exchanges without forcing", ["30-ball crosscourt dink rally without a miss", "Stays patient in long dink battles — no unforced dink errors in a game"]],
      ["K3", "Dink placement (5.0)", "Moving opponents with placement, forehand and backhand", ["50 dinks with at least 3 direction changes", "Dinks to targets: crosscourt, middle and down the line", "Mixes pace and spin on dinks"]],
      ["K4", "Kitchen control (5.5+)", "Attacking only the right balls; neutralising strong dinkers", ["Attacks only pop-ups above the net", "Resets speed-ups at the kitchen line"]],
    ],
  },
  {
    id: "transition",
    sport: "pickleball",
    name: "Third shot and transition",
    prefix: "T",
    stages: [
      ["T1", "Third shot in (4.0)", "Third-shot drop and following it in", ["Third-shot drop into the kitchen 5 out of 10", "Follows the drop in towards the kitchen"]],
      ["T2", "Reliable drop and reset (4.5)", "Dependable drops; resets from mid-court", ["Third-shot drop into the kitchen 7 out of 10", "Resets into the kitchen from mid-court 6 out of 10", "Gets to the kitchen in 3 shots or fewer"]],
      ["T3", "Reset anything (5.0)", "Resets every ball from mid-court; good drop-or-drive choices", ["Third-shot drop 8 out of 10, forehand and backhand", "Resets hard drives into the kitchen 8 out of 10", "Chooses drop or drive well (drives the short or high returns)"]],
      ["T4", "Transition weapon (5.5+)", "Turns resets into counters on the right balls", ["Counters waist-high balls instead of resetting them", "Drops and drives with disguise"]],
    ],
  },
  {
    id: "serve_return",
    sport: "pickleball",
    name: "Serve and return",
    prefix: "SR",
    stages: [
      ["SR1", "In play (4.0)", "No free points on serve or return", ["Serves in 10 out of 10", "Returns in 9 out of 10"]],
      ["SR2", "Depth (4.5)", "Deep serves and returns, then to the kitchen", ["Deep serves 7 out of 10", "Deep returns 8 out of 10, and gets to the kitchen line"]],
      ["SR3", "Pressure (5.0)", "Serve and return that set up the point", ["Deep serves 8 out of 10 with spin or placement", "Deep returns 9 out of 10, aimed at the weaker player or the middle"]],
    ],
  },
  {
    id: "hands",
    sport: "pickleball",
    name: "Hands (volleys)",
    prefix: "H",
    stages: [
      ["H1", "Blocks and punches (4.0)", "Blocking low; punch volleys with direction", ["Punch volleys with direction and depth 7 out of 10", "Blocks hard balls back low"]],
      ["H2", "Quick hands (4.5)", "Holding up in hand battles; consistent overheads", ["Resets speed-ups aimed at the body", "Overheads in 8 out of 10"]],
      ["H3", "Earned attacks (5.0)", "Speeds up only on pop-ups; counters well; covers more court", ["Speeds up only after earning a pop-up", "Wins more hand battles than loses", "Covers more than half the court at the kitchen"]],
    ],
  },
  {
    id: "play",
    sport: "pickleball",
    name: "Competition",
    prefix: "P",
    stages: [
      ["P1", "Rated play (4.0)", "Regular DUPR-rated matches, with notes afterwards", ["Plays DUPR-rated matches every month", "Writes a note after each match"]],
      ["P2", "Medals at 4.5 (4.5)", "Medalling in 4.0–4.5 events", ["Medals in a 4.5 tournament", "Under 5 unforced errors a game in rated matches"]],
      ["P3", "Open level (5.0)", "Competing in 5.0 and open events", ["DUPR 5.0 or above", "Wins matches in 5.0+ or open events", "Changes the game plan mid-match when it isn't working"]],
      ["P4", "Pro qualifiers (5.5+)", "Entering and winning PPA qualifier matches", ["Plays a PPA qualifier", "Wins a qualifier match"]],
      ["P5", "PPA main draw", "Reaching the main draw", ["Reaches a PPA main draw"]],
    ],
  },
];

export const TRACK_IDS: TrackId[] = BUILTIN.map((t) => t.id);
export const SPORT_OF_TRACK = Object.fromEntries(BUILTIN.map((t) => [t.id, t.sport])) as Record<TrackId, Sport>;

const stageNumber = (prefix: string, id: string) => (id.startsWith(prefix) ? Number(id.slice(prefix.length)) : NaN);

/** The ladder as you use it: the built-in stages with your edits, plus any stages you added. `tracks` lists one sport's tracks. */
export function buildLadder(edits: LadderStage[] = [], sport: Sport = "tennis"): Ladder {
  const all = BUILTIN.map((t): TrackDef => {
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
    return { id: t.id, sport: t.sport, name: t.name, prefix: t.prefix, stages: [...builtIn, ...added] };
  });
  return Object.assign(Object.fromEntries(all.map((t) => [t.id, t])) as Record<TrackId, TrackDef>, { tracks: all.filter((t) => t.sport === sport) });
}

/** The built-in tennis ladder, with no edits (every sport's tracks are available by id). */
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
