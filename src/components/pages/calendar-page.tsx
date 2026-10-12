"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CircleDot } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SprintDot } from "@/components/shared/sprint-badge";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addDays, formatLongDate, formatMonthYear, formatTime, parseISODate, startOfWeek, toISODate } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { isActive } from "@/lib/tasks/task-model";
import { cn } from "@/lib/utils";
import type { CalendarEvent, EventKind, ISODate, Task } from "@/types";

const EVENT_STYLES: Record<EventKind, { label: string; chip: string; dot: string }> = {
  coaching: { label: "Coaching", chip: "bg-teal-50 text-teal-800 border-teal-100", dot: "bg-teal-500" },
  ladder: { label: "Tennis Ladder", chip: "bg-amber-50 text-amber-800 border-amber-100", dot: "bg-amber-500" },
  business: { label: "Business", chip: "bg-blue-50 text-blue-800 border-blue-100", dot: "bg-blue-500" },
  personal: { label: "Personal", chip: "bg-violet-50 text-violet-800 border-violet-100", dot: "bg-violet-500" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function firstOfMonth(iso: ISODate) {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function shiftMonth(iso: ISODate, delta: number) {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

export function CalendarPage() {
  const { workspace } = useWorkspace();
  const { today } = workspace;
  const [month, setMonth] = React.useState(() => firstOfMonth(today));
  const [selected, setSelected] = React.useState<ISODate>(today);

  const monthIndex = parseISODate(month).getMonth();
  const gridStart = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = days.slice(35).some((d) => parseISODate(d).getMonth() === monthIndex) ? 6 : 5;
  const visible = days.slice(0, weeks * 7);

  const eventsByDay = React.useMemo(() => groupBy(workspace.events, (e) => e.date), [workspace.events]);
  const dueByDay = React.useMemo(
    () => groupBy(workspace.tasks.filter((t) => t.dueDate && isActive(t)), (t) => t.dueDate!),
    [workspace.tasks],
  );

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Your task due dates alongside a sample coaching schedule. Calendar syncing arrives in a later phase."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMonth(firstOfMonth(today));
                setSelected(today);
              }}
            >
              Today
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
            <h3 className="text-base font-semibold">{formatMonthYear(month)}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {Object.entries(EVENT_STYLES).map(([k, s]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className={cn("size-2 rounded-full", s.dot)} />
                  {s.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <CircleDot className="size-3" />
                Deadline
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase md:text-left">
                <span className="md:hidden">{d.slice(0, 1)}</span>
                <span className="hidden md:inline">{d}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {visible.map((date, i) => {
              const inMonth = parseISODate(date).getMonth() === monthIndex;
              const events = eventsByDay[date] ?? [];
              const due = dueByDay[date] ?? [];
              const isToday = date === today;
              const isSelected = date === selected;
              const items = [...due.map((t) => ({ type: "task" as const, t })), ...events.map((e) => ({ type: "event" as const, e }))];

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  aria-label={formatLongDate(date)}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative flex min-h-16 cursor-pointer flex-col gap-1 border-b p-1.5 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary/50 md:min-h-28 md:p-2",
                    (i + 1) % 7 !== 0 && "border-r",
                    !inMonth && "bg-muted/30",
                    isSelected && "bg-accent/60 hover:bg-accent/70",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      !inMonth && "text-subtle-foreground",
                      isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {parseISODate(date).getDate()}
                  </span>

                  {/* Compact dots on small screens */}
                  <span className="flex flex-wrap gap-0.5 md:hidden">
                    {due.length > 0 && <span className="size-1.5 rounded-full bg-slate-700" />}
                    {events.slice(0, 3).map((e) => (
                      <span key={e.id} className={cn("size-1.5 rounded-full", EVENT_STYLES[e.kind].dot)} />
                    ))}
                  </span>

                  {/* Labels on larger screens */}
                  <span className="hidden flex-col gap-1 md:flex">
                    {items.slice(0, 3).map((item) =>
                      item.type === "task" ? (
                        <span key={item.t.id} className="flex items-center gap-1 truncate rounded border border-slate-200 bg-card px-1.5 py-0.5 text-[11px] font-semibold">
                          <SprintDot sprintId={item.t.sprint} className="size-1.5" />
                          <span className="truncate">{item.t.title}</span>
                        </span>
                      ) : (
                        <span key={item.e.id} className={cn("truncate rounded border px-1.5 py-0.5 text-[11px] font-medium", EVENT_STYLES[item.e.kind].chip)}>
                          {formatTime(item.e.start)} {item.e.title}
                        </span>
                      ),
                    )}
                    {items.length > 3 && <span className="px-1 text-[11px] text-muted-foreground">+{items.length - 3} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <DayAgenda date={selected} events={eventsByDay[selected] ?? []} due={dueByDay[selected] ?? []} />
      </div>
    </>
  );
}

function DayAgenda({ date, events, due }: { date: ISODate; events: CalendarEvent[]; due: Task[] }) {
  const { workspace } = useWorkspace();
  const editor = useTaskEditor();

  return (
    <Card className="h-fit p-5">
      <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
        {date === workspace.today ? "Today" : "Selected day"}
      </p>
      <h3 className="mt-0.5 text-base font-semibold">{formatLongDate(date)}</h3>

      <div className="mt-4 flex flex-col gap-4">
        <AgendaGroup title="Schedule · sample" empty="Nothing scheduled — open space.">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className={cn("mt-1 w-1 shrink-0 self-stretch rounded-full", EVENT_STYLES[e.kind].dot)} />
              <div>
                <p className="text-[13px] font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(e.start)} – {formatTime(e.end)} · {EVENT_STYLES[e.kind].label}
                </p>
              </div>
            </li>
          ))}
        </AgendaGroup>
        <AgendaGroup title="Tasks due" empty="Nothing due.">
          {due.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-[13px]">
              <SprintDot sprintId={t.sprint} />
              <button
                type="button"
                onClick={() => editor.openEdit(t.id)}
                className="cursor-pointer text-left font-medium hover:text-primary"
              >
                {t.title}
              </button>
            </li>
          ))}
        </AgendaGroup>
      </div>
    </Card>
  );
}

function AgendaGroup({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {children.length ? <ul className="flex flex-col gap-2.5">{children}</ul> : <p className="text-[13px] text-muted-foreground">{empty}</p>}
    </section>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const out: Record<string, T[]> = {};
  for (const item of items) (out[key(item)] ??= []).push(item);
  return out;
}
