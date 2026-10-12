"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, NotebookPen, PenLine, Sprout, Star, Timer } from "lucide-react";

import { CommitmentCheck } from "@/components/commitments/commitment-check";
import { DayHistory } from "@/components/daily/day-history";
import { HighlightPickerDialog } from "@/components/daily/highlight-picker-dialog";
import { ReflectionEditor } from "@/components/daily/reflection-editor";
import { PageHeader } from "@/components/shared/page-header";
import { SprintDot } from "@/components/shared/sprint-badge";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addDays, formatClockTime, formatLongDate, localDateOf, relativeDayLabel } from "@/lib/date";
import { isDoneOn } from "@/lib/daily/commitments";
import { commitmentsForDay, resolveHighlight, tasksCompletedOn } from "@/lib/daily/day";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";
import type { ISODate } from "@/types";

const isDateKey = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function KaizenLogPage() {
  const { workspace } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("date");
  const date: ISODate = isDateKey(requested) ? requested : workspace.today;
  const isToday = date === workspace.today;
  const isFuture = date > workspace.today;

  const go = (d: ISODate) => router.push(d === workspace.today ? "/kaizen-log" : `/kaizen-log?date=${d}`, { scroll: false });

  return (
    <>
      <PageHeader
        title="Kaizen Log"
        description="One small page a day. It fills itself in from your highlight, commitments and tasks — add a few words if you like."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => go(addDays(date, -1))} className="gap-1" aria-label="Previous day">
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => go(workspace.today)} disabled={isToday}>
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => go(addDays(date, 1))}
          disabled={date >= workspace.today}
          className="gap-1"
          aria-label="Next day"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Button>
        <label className="relative ml-auto flex items-center gap-2 text-[13px] font-semibold">
          <CalendarDays className="size-4 text-muted-foreground" />
          <span>{formatLongDate(date)}</span>
          <input
            type="date"
            value={date}
            max={workspace.today}
            onChange={(e) => isDateKey(e.target.value) && e.target.value <= workspace.today && go(e.target.value)}
            aria-label="Choose a date"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {isFuture ? (
            <Card className="items-center px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">This day hasn’t happened yet.</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Its page will be ready when it arrives.</p>
              <Button className="mt-4" onClick={() => go(workspace.today)}>
                Back to today
              </Button>
            </Card>
          ) : (
            <DayView key={date} date={date} isToday={isToday} />
          )}
        </div>
        <aside className="min-w-0">
          <DayHistory selected={date} />
        </aside>
      </div>
    </>
  );
}

function DayView({ date, isToday }: { date: ISODate; isToday: boolean }) {
  const { workspace } = useWorkspace();
  const editor = useTaskEditor();
  const [picking, setPicking] = React.useState(false);
  const highlight = resolveHighlight(workspace, date);
  const commitments = commitmentsForDay(workspace, date, workspace.today);
  const commitmentsDone = commitments.filter((c) => isDoneOn(c.id, date, workspace.commitmentCompletions)).length;
  const completed = tasksCompletedOn(workspace.tasks, date).sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
  const sessions = workspace.sessions.filter((s) => s.status === "ended" && s.endedAt && localDateOf(s.endedAt) === date);
  const sessionMinutes = Math.round(sessions.reduce((sum, s) => sum + s.accumulatedElapsedSeconds, 0) / 60);

  return (
    <>
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
          {isToday ? "Today’s entry" : relativeDayLabel(date, workspace.today)}
        </p>
      </div>

      <Card className="p-5">
        <SectionTitle icon={Star} title="Daily highlight" />
        {highlight ? (
          <div className="mt-3 flex items-start gap-3">
            <Star
              className={cn("mt-0.5 size-5 shrink-0 text-amber-400", highlight.completed && "fill-amber-400")}
              aria-hidden
            />
            <div className="min-w-0">
              {highlight.task ? (
                <button
                  type="button"
                  onClick={() => editor.openEdit(highlight.task!.id)}
                  className={cn(
                    "cursor-pointer text-left text-[15px] font-semibold hover:text-primary",
                    highlight.completed && "text-muted-foreground line-through decoration-slate-300",
                  )}
                >
                  {highlight.title}
                </button>
              ) : (
                <p className="text-[15px] font-semibold text-muted-foreground">{highlight.title}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {highlight.deleted
                  ? "This task was later deleted."
                  : highlight.completed
                    ? `Completed${highlight.task?.completedAt ? ` · ${relativeDayLabel(localDateOf(highlight.task.completedAt), workspace.today).toLowerCase()}` : ""}`
                    : isToday
                      ? "In focus today"
                      : "Not completed that day — it’s still an open task."}
              </p>
            </div>
          </div>
        ) : isToday ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-[13px] text-muted-foreground">What’s your one priority today?</p>
            <Button size="sm" onClick={() => setPicking(true)}>
              Select Highlight
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-muted-foreground">No highlight chosen that day.</p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon={Sprout} title="Micro-commitments" />
          {commitments.length > 0 && (
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              {commitmentsDone} of {commitments.length}
            </span>
          )}
        </div>
        {commitments.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Nothing scheduled.{" "}
            {workspace.commitments.length === 0 && (
              <Link href="/micro-commitments" className="font-semibold text-primary hover:text-primary-hover">
                Add a commitment
              </Link>
            )}
          </p>
        ) : (
          <div className="-mx-2 mt-2 grid grid-cols-1 sm:grid-cols-2">
            {commitments.map((c) => (
              <CommitmentCheck key={c.id} commitment={c} date={date} />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon={CircleCheck} title="Completed tasks" />
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">{completed.length}</span>
        </div>
        {completed.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            {isToday ? "Nothing ticked off yet — the day isn’t over." : "No tasks completed that day."}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {completed.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 text-[13px]">
                <SprintDot sprintId={t.sprint} />
                <button type="button" onClick={() => editor.openEdit(t.id)} className="min-w-0 flex-1 cursor-pointer truncate text-left hover:text-primary">
                  {t.title}
                </button>
                <span className="shrink-0 text-xs text-muted-foreground">{formatClockTime(t.completedAt!)}</span>
              </li>
            ))}
          </ul>
        )}
        {sessions.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
            <Timer className="size-3.5" />
            {sessions.length} focus {sessions.length === 1 ? "session" : "sessions"} · {formatMinutes(sessionMinutes)}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle icon={PenLine} title="Reflection" />
        <p className="mt-1 mb-4 text-xs text-muted-foreground">Answer one, all or none. It saves as you type.</p>
        <ReflectionEditor key={`r-${date}`} date={date} section="reflection" />
      </Card>

      <Card className="p-5">
        <SectionTitle icon={NotebookPen} title="Daily notes" />
        <div className="mt-3">
          <ReflectionEditor key={`n-${date}`} date={date} section="notes" />
        </div>
      </Card>

      {picking && <HighlightPickerDialog open={picking} onOpenChange={setPicking} />}
    </>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-[15px] font-semibold">
      <Icon className="size-4 text-muted-foreground" />
      {title}
    </h3>
  );
}
