"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Flag, Hourglass, List, Repeat, Target } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { useTaskEditor } from "@/components/tasks/task-editor-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CALENDAR_KIND_LABEL, getCalendarItems, type CalendarItem, type CalendarItemKind } from "@/lib/calendar/calendar-items";
import { addDays, formatLongDate, formatMonthYear, formatWeekday, parseISODate, relativeDayLabel, startOfWeek, toISODate } from "@/lib/date";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { ISODate } from "@/types";

/** Restrained markers: shape + a muted tone, so the grid stays calm. */
const KIND_STYLE: Record<CalendarItemKind, { chip: string; dot: string; icon?: React.ComponentType<{ className?: string }> }> = {
  task: { chip: "border-slate-200 bg-card text-foreground", dot: "bg-slate-600" },
  recurring: { chip: "border-slate-200 bg-card text-foreground", dot: "bg-slate-600", icon: Repeat },
  planned: { chip: "border-dashed border-slate-300 bg-transparent text-muted-foreground", dot: "border border-slate-400 bg-transparent", icon: Repeat },
  project: { chip: "border-blue-200 bg-blue-50 text-blue-800", dot: "bg-primary", icon: Target },
  milestone: { chip: "border-violet-200 bg-violet-50 text-violet-800", dot: "bg-violet-500", icon: Flag },
  prep: { chip: "border-dashed border-amber-300 bg-amber-50/60 text-amber-800", dot: "bg-amber-400", icon: Hourglass },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const firstOfMonth = (iso: ISODate) => {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
};
const shiftMonth = (iso: ISODate, delta: number) => {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
};
const lastOfMonth = (iso: ISODate) => addDays(shiftMonth(iso, 1), -1);

/** Opens whatever a calendar item points at. */
function useOpenItem() {
  const editor = useTaskEditor();
  const router = useRouter();
  return (item: CalendarItem) => {
    if (item.taskId) editor.openEdit(item.taskId);
    else if (item.templateId) editor.openSeries(item.templateId);
    else if (item.projectId) router.push(`/projects/${item.projectId}${item.milestoneId ? `#milestone-${item.milestoneId}` : ""}`);
  };
}

export function CalendarPage() {
  const { workspace } = useWorkspace();
  const { today } = workspace;
  const [view, setView] = React.useState<"month" | "list">("month");
  const [month, setMonth] = React.useState(() => firstOfMonth(today));
  const [selected, setSelected] = React.useState<ISODate>(today);

  const monthIndex = parseISODate(month).getMonth();
  const gridStart = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = days.slice(35).some((d) => parseISODate(d).getMonth() === monthIndex) ? 6 : 5;
  const visible = days.slice(0, weeks * 7);

  const items = React.useMemo(() => getCalendarItems(workspace, visible[0], visible[visible.length - 1]), [workspace, visible[0], visible.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const byDay = React.useMemo(() => {
    const out: Record<string, CalendarItem[]> = {};
    for (const i of items) (out[i.date] ??= []).push(i);
    return out;
  }, [items]);
  const monthItems = items.filter((i) => i.date >= month && i.date <= lastOfMonth(month));

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Due dates, project deadlines, milestones and preparation dates in one place."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-lg border bg-card p-0.5" role="group" aria-label="Calendar view">
              {(
                [
                  { id: "month", label: "Month", icon: CalendarDays },
                  { id: "list", label: "List", icon: List },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={view === v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                    view === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <v.icon className="size-3.5" />
                  {v.label}
                </button>
              ))}
            </div>
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
            <Legend />
          </div>

          {view === "list" ? (
            <MonthList items={monthItems} today={today} />
          ) : (
            <>
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
                  const dayItems = byDay[date] ?? [];
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelected(date)}
                      aria-label={`${formatLongDate(date)}${dayItems.length ? `, ${dayItems.length} ${dayItems.length === 1 ? "item" : "items"}` : ""}`}
                      aria-pressed={date === selected}
                      className={cn(
                        "relative flex min-h-16 min-w-0 cursor-pointer flex-col gap-1 border-b p-1.5 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary/50 md:min-h-28 md:p-2",
                        (i + 1) % 7 !== 0 && "border-r",
                        !inMonth && "bg-muted/30",
                        date === selected && "bg-accent/60 hover:bg-accent/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                          !inMonth && "text-subtle-foreground",
                          date === today && "bg-primary text-primary-foreground",
                        )}
                      >
                        {parseISODate(date).getDate()}
                      </span>
                      <span className="flex flex-wrap gap-0.5 md:hidden">
                        {dayItems.slice(0, 4).map((it) => (
                          <span key={it.key} className={cn("size-1.5 rounded-full", KIND_STYLE[it.kind].dot, it.done && "opacity-40")} />
                        ))}
                      </span>
                      <span className="hidden min-w-0 flex-col gap-1 md:flex">
                        {dayItems.slice(0, 3).map((it) => (
                          <ItemChip key={it.key} item={it} />
                        ))}
                        {dayItems.length > 3 && <span className="px-1 text-[11px] text-muted-foreground">+{dayItems.length - 3} more</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {view === "month" && <DayAgenda date={selected} items={byDay[selected] ?? []} />}
      </div>
    </>
  );
}

function ItemChip({ item }: { item: CalendarItem }) {
  const style = KIND_STYLE[item.kind];
  const Icon = style.icon;
  return (
    <span className={cn("flex min-w-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold", style.chip, item.done && "line-through opacity-50")}>
      {Icon && <Icon className="size-3 shrink-0" />}
      <span className="truncate">{item.title}</span>
    </span>
  );
}

function Legend() {
  const shown: CalendarItemKind[] = ["task", "recurring", "project", "milestone", "prep"];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {shown.map((k) => {
        const Icon = KIND_STYLE[k].icon;
        return (
          <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            {Icon ? <Icon className="size-3" /> : <span className={cn("size-2 rounded-full", KIND_STYLE[k].dot)} />}
            {CALENDAR_KIND_LABEL[k]}
          </span>
        );
      })}
    </div>
  );
}

function ItemRow({ item }: { item: CalendarItem }) {
  const open = useOpenItem();
  const style = KIND_STYLE[item.kind];
  const Icon = style.icon;
  return (
    <li>
      <button type="button" onClick={() => open(item)} className="flex w-full cursor-pointer items-start gap-2.5 rounded-md py-1 text-left hover:text-primary">
        <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border", style.chip)}>
          {Icon ? <Icon className="size-3" /> : <span className={cn("size-1.5 rounded-full", style.dot)} />}
        </span>
        <span className="min-w-0">
          <span className={cn("block text-[13px] font-semibold", item.done && "text-muted-foreground line-through")}>{item.title}</span>
          <span className="block text-xs text-muted-foreground">
            {CALENDAR_KIND_LABEL[item.kind]}
            {item.done && " · done"}
            {item.meta && ` · ${item.meta}`}
          </span>
        </span>
      </button>
    </li>
  );
}

function DayAgenda({ date, items }: { date: ISODate; items: CalendarItem[] }) {
  const { workspace } = useWorkspace();
  return (
    <Card className="h-fit p-5">
      <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">{date === workspace.today ? "Today" : "Selected day"}</p>
      <h3 className="mt-0.5 text-base font-semibold">{formatLongDate(date)}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground">Nothing scheduled — open space.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5" aria-label={`Items on ${formatLongDate(date)}`}>
          {items.map((it) => (
            <ItemRow key={it.key} item={it} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function MonthList({ items, today }: { items: CalendarItem[]; today: ISODate }) {
  if (!items.length) return <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">Nothing dated this month.</p>;
  const dates = [...new Set(items.map((i) => i.date))];
  return (
    <ol className="flex flex-col divide-y" aria-label="Calendar list">
      {dates.map((d) => (
        <li key={d} className={cn("flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4 sm:px-5", d === today && "bg-accent/40")}>
          <p className="w-32 shrink-0 pt-1 text-xs font-semibold text-muted-foreground">
            <span className="text-foreground">{formatWeekday(d)}</span> {parseISODate(d).getDate()} · {relativeDayLabel(d, today)}
          </p>
          <ul className="flex min-w-0 flex-1 flex-col gap-1">
            {items
              .filter((i) => i.date === d)
              .map((it) => (
                <ItemRow key={it.key} item={it} />
              ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
