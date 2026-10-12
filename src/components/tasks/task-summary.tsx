"use client";

import { AlertCircle, CalendarClock, CircleCheck, ListTodo } from "lucide-react";

import { cn } from "@/lib/utils";

export type SummaryKey = "active" | "dueToday" | "overdue" | "completed";

/** Four compact indicators. Each one doubles as a shortcut to that list. */
export function TaskSummary({
  summary,
  onSelect,
  selected,
}: {
  summary: Record<SummaryKey, number>;
  onSelect: (key: SummaryKey) => void;
  selected: SummaryKey | null;
}) {
  const items: { key: SummaryKey; label: string; icon: typeof ListTodo; tone: string }[] = [
    { key: "active", label: "Active", icon: ListTodo, tone: "text-primary" },
    { key: "dueToday", label: "Due today", icon: CalendarClock, tone: "text-amber-600" },
    { key: "overdue", label: "Overdue", icon: AlertCircle, tone: "text-rose-500" },
    { key: "completed", label: "Completed", icon: CircleCheck, tone: "text-emerald-600" },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          aria-pressed={selected === item.key}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none",
            selected === item.key && "border-primary/40 bg-accent/40",
          )}
        >
          <item.icon className={cn("size-4 shrink-0", item.tone)} />
          <span className="min-w-0">
            <span className="block text-lg leading-tight font-bold tabular-nums">{summary[item.key]}</span>
            <span className="block truncate text-[11px] font-semibold text-muted-foreground">{item.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
