"use client";

import { Badge } from "@/components/ui/badge";
import type { Level } from "@/lib/students/ladder";
import { cn } from "@/lib/utils";
import type { BallColour, Student, StudentStatus } from "@/types";

export const BALL_OPTIONS: { value: BallColour; label: string; dot: string }[] = [
  { value: "red", label: "Red ball", dot: "bg-red-500" },
  { value: "orange", label: "Orange ball", dot: "bg-orange-400" },
  { value: "green", label: "Green ball", dot: "bg-green-500" },
  { value: "yellow", label: "Yellow ball", dot: "bg-lime-300 ring-1 ring-lime-500/60" },
];
export const BALL_BY_ID = Object.fromEntries(BALL_OPTIONS.map((b) => [b.value, b])) as Record<BallColour, (typeof BALL_OPTIONS)[number]>;

export const STUDENT_STATUSES: { value: StudentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "finished", label: "Finished" },
];

const LEVEL_STYLES: Record<Level, string> = {
  "Not assessed": "bg-muted text-muted-foreground",
  Beginner: "bg-sky-50 text-sky-800",
  "High beginner": "bg-teal-50 text-teal-800",
  Intermediate: "bg-emerald-50 text-emerald-800",
  Advanced: "bg-violet-50 text-violet-800",
  Competitive: "bg-amber-50 text-amber-900",
};

export function LevelBadge({ level, className }: { level: Level; className?: string }) {
  return <Badge className={cn("border-transparent", LEVEL_STYLES[level], className)}>{level}</Badge>;
}

/** Junior · Orange ball · Right-handed · Two-handed backhand */
export function StudentFacts({ student, short = false }: { student: Student; short?: boolean }) {
  const ball = BALL_BY_ID[student.ball];
  const facts = [
    student.group === "junior" ? "Junior" : "Adult",
    !short && student.hand ? (student.hand === "right" ? "Right-handed" : "Left-handed") : null,
    !short && student.backhand ? (student.backhand === "two" ? "Two-handed backhand" : "One-handed backhand") : null,
  ].filter(Boolean);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>{facts.join(" · ")}</span>
      {(student.group === "junior" || student.ball !== "yellow") && (
        <span className="inline-flex items-center gap-1">
          <span className={cn("size-2.5 rounded-full", ball.dot)} aria-hidden />
          {ball.label}
        </span>
      )}
    </span>
  );
}

/** A row of choice buttons backed by real radio buttons (keyboard and screen-reader friendly). */
export function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T | null;
  options: { value: T; label: string; dot?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] pointer-coarse:py-2.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50",
              value === o.value ? "border-primary bg-accent font-semibold text-accent-foreground" : "hover:bg-muted/50",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.dot && <span className={cn("size-2.5 rounded-full", o.dot)} aria-hidden />}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
