import type { TrackId } from "@/types";

/**
 * The coaching ladder: four tracks a student moves through at their own pace.
 * Stage ids (R1, S3, …) are what's saved; names and descriptions can be
 * reworded here without touching saved data.
 */

export interface StageDef {
  id: string;
  name: string;
  /** What they're working on at this stage. */
  focus: string;
  /** When they're ready to move on (empty when there's no fixed test). */
  ready: string;
}

export interface TrackDef {
  id: TrackId;
  name: string;
  stages: StageDef[];
}

export const TRACKS: TrackDef[] = [
  {
    id: "rally",
    name: "Rally",
    stages: [
      { id: "R1", name: "Contact", focus: "Fed balls, forehand and backhand: grip, ready position, swing shape", ready: "7 out of 10 fed balls over the net, both sides" },
      { id: "R2", name: "Short court", focus: "Service line to service line, centre to centre", ready: "10-ball rally" },
      { id: "R3", name: "Reading the bounce", focus: "Short court, both sides, small steps to the ball", ready: "20-ball rally; moves their feet, doesn't reach" },
      { id: "R4", name: "Move back", focus: "Baseline, centre to centre", ready: "10-ball rally" },
      { id: "R5", name: "Baseline steady", focus: "Baseline, centre to centre", ready: "20-ball rally; half the balls land past the service line" },
      { id: "R6", name: "Small movement", focus: "One or two steps left and right, back to the middle", ready: "10-ball rally with movement; split step and recovery" },
      { id: "R7", name: "Direction", focus: "Crosscourt forehand and backhand, then down the line", ready: "10+ crosscourt each side; changes direction when called" },
      { id: "R8", name: "Depth and spin", focus: "Topspin, depth, side to side", ready: "7 out of 10 deep; rally 15+ moving side to side" },
      { id: "R9", name: "Live ball", focus: "Rallies under pace; attacking short balls, defending wide balls", ready: "Keeps rallies going under pressure; picks the right ball to attack" },
    ],
  },
  {
    id: "serve",
    name: "Serve",
    stages: [
      { id: "S1", name: "Toss and motion", focus: "Toss and swing shape, no pressure on getting it in", ready: "Consistent toss, 7 out of 10" },
      { id: "S2", name: "From the service line", focus: "Short distance into the box", ready: "5 out of 10 in" },
      { id: "S3", name: "From the baseline", focus: "Full distance", ready: "5 out of 10 in, both boxes" },
      { id: "S4", name: "Reliable", focus: "A serving routine; a dependable second serve", ready: "7 out of 10 in; few double faults when playing points" },
      { id: "S5", name: "Placement", focus: "To the T and out wide, when called", ready: "Hits the called target 5 out of 10" },
      { id: "S6", name: "Spin second serve", focus: "Slice or kick", ready: "7 out of 10 spin second serves in" },
      { id: "S7", name: "Under pressure", focus: "Serving in real matches", ready: "No more than 1 double fault per game in matches" },
    ],
  },
  {
    id: "net",
    name: "Net",
    stages: [
      { id: "N1", name: "Ready at the net", focus: "Ready position; fed volleys on both sides", ready: "" },
      { id: "N2", name: "Volley to volley", focus: "Volley to volley, short court", ready: "" },
      { id: "N3", name: "Volleys off groundstrokes", focus: "Volleys off groundstroke feeds", ready: "7 out of 10 into a target" },
      { id: "N4", name: "Approach and overhead", focus: "Approach and volley; overheads", ready: "Overheads 5 out of 10" },
      { id: "N5", name: "Net in points", focus: "Coming forward at the right moment in points", ready: "" },
    ],
  },
  {
    id: "match",
    name: "Match play",
    stages: [
      { id: "M1", name: "Scoring", focus: "Knows the scoring and court rules", ready: "" },
      { id: "M2", name: "Points from a rally", focus: "Plays points starting from a rally", ready: "" },
      { id: "M3", name: "Games with serve", focus: "Plays games with serving", ready: "" },
      { id: "M4", name: "Sets and tiebreaks", focus: "Plays sets and tiebreaks", ready: "" },
      { id: "M5", name: "Club competitions", focus: "Plays club competitions", ready: "" },
      { id: "M6", name: "Tournaments", focus: "STA and other tournaments, with a match plan and a review afterwards", ready: "" },
    ],
  },
];

export const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t])) as Record<TrackId, TrackDef>;

/** Position of a stage on its track (0-based), or -1 if it isn't on the ladder. */
export function stageIndex(track: TrackId, stage: string) {
  return TRACK_BY_ID[track].stages.findIndex((s) => s.id === stage);
}

export function stageDef(track: TrackId, stage: string): StageDef | null {
  return TRACK_BY_ID[track].stages.find((s) => s.id === stage) ?? null;
}

export type Level = "Not assessed" | "Beginner" | "High beginner" | "Intermediate" | "Advanced" | "Competitive";

/**
 * The overall level comes from the Rally stage; Competitive also needs
 * competition play (Match play M5 or above).
 */
export function overallLevel(rally: string | null, match: string | null): Level {
  const r = rally ? stageIndex("rally", rally) : -1;
  if (r < 0) return "Not assessed";
  if (r <= 2) return "Beginner";
  if (r <= 4) return "High beginner";
  if (r <= 6) return "Intermediate";
  if (r === 7) return "Advanced";
  return (match ? stageIndex("match", match) : -1) >= 4 ? "Competitive" : "Advanced";
}
