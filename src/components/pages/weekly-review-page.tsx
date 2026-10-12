"use client";

import * as React from "react";
import { AlertCircle, ArrowRight, Lightbulb, ListTodo, Plus, Target, Trophy, X } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SprintBadge } from "@/components/shared/sprint-badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { addDays, formatShortDate, localDateOf } from "@/lib/date";
import { isActive } from "@/lib/tasks/task-model";
import { sortTasks } from "@/lib/tasks/task-queries";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

export function WeeklyReviewPage() {
  const { workspace } = useWorkspace();
  const review = workspace.weeklyReview;
  const weekEnd = addDays(review.weekStart, 6);

  const completed = workspace.tasks.filter((t) => {
    if (t.status !== "completed" || !t.completedAt) return false;
    const day = localDateOf(t.completedAt);
    return day >= review.weekStart && day <= weekEnd;
  });
  // Open tasks that were due by the end of the review period.
  const incomplete = sortTasks(
    workspace.tasks.filter((t) => isActive(t) && t.dueDate !== null && t.dueDate <= weekEnd),
    "due",
  );
  const commitmentChecks = workspace.commitments.reduce(
    (sum, c) => sum + c.completedDates.filter((d) => d > addDays(workspace.today, -7) && d <= workspace.today).length,
    0,
  );

  return (
    <>
      <PageHeader
        title="Weekly Review"
        description={`${formatShortDate(review.weekStart)} – ${formatShortDate(weekEnd)} · Twenty quiet minutes to look back, learn, and set up next week.`}
      />

      <dl className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Tasks completed", value: completed.length, sub: "this week" },
          { label: "Still open", value: incomplete.length, sub: "due by today" },
          { label: "Commitment check-ins", value: commitmentChecks, sub: `of ${workspace.commitments.length * 7} possible` },
          { label: "Highlights done", value: workspace.kaizenEntries.filter((e) => e.highlightDone).length, sub: "this week" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <dt className="text-[11px] font-semibold text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{s.value}</dd>
            <dd className="text-xs text-muted-foreground">{s.sub}</dd>
          </Card>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EditableList icon={Trophy} iconClass="text-amber-500" title="Wins" hint="What went well, big or small?" initial={review.wins} />
        <EditableList icon={AlertCircle} iconClass="text-slate-500" title="Challenges" hint="What got in the way?" initial={review.challenges} />

        <Card className="p-5">
          <ReviewHeading icon={ListTodo} title="Incomplete tasks" hint="Carry forward, reschedule, or let go — all are fine." />
          <ul className="mt-3 divide-y">
            {incomplete.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{t.title}</p>
                  <SprintBadge sprintId={t.sprint} className="mt-0.5" />
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  Carry forward <ArrowRight className="size-3" />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <ReviewHeading icon={Target} iconClass="text-primary" title="Next week’s priorities" hint="Three is plenty." />
          <ol className="mt-3 flex flex-col gap-2">
            {review.nextWeekPriorities.map((p, i) => (
              <li key={p} className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-[13px] font-medium">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <ReviewHeading icon={Lightbulb} iconClass="text-amber-500" title="Lesson learned" hint="One kaizen to carry into next week." />
          <Textarea defaultValue={review.lessons} className="mt-3" aria-label="Lesson learned" />
          <p className="mt-2 text-xs text-muted-foreground">Preview only — saving weekly reviews arrives in a later phase.</p>
        </Card>
      </div>
    </>
  );
}

function ReviewHeading({
  icon: Icon,
  iconClass,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  title: string;
  hint: string;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Icon className={cn("size-4 text-muted-foreground", iconClass)} />
        {title}
      </h3>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Local-only list editing so the review feels usable in the preview. */
function EditableList({
  icon,
  iconClass,
  title,
  hint,
  initial,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  title: string;
  hint: string;
  initial: string[];
}) {
  const [items, setItems] = React.useState(initial);
  const [draft, setDraft] = React.useState("");

  return (
    <Card className="p-5">
      <ReviewHeading icon={icon} iconClass={iconClass} title={title} hint={hint} />
      <ul className="mt-3 flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-muted/60">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-slate-400" />
            <span className="flex-1">{item}</span>
            <button
              type="button"
              onClick={() => setItems((all) => all.filter((_, j) => j !== i))}
              aria-label={`Remove “${item}”`}
              className="cursor-pointer rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex items-center gap-2 rounded-lg border border-dashed px-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          setItems((all) => [...all, draft.trim()]);
          setDraft("");
        }}
      >
        <Plus className="size-3.5 text-muted-foreground" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Add to ${title.toLowerCase()}…`}
          aria-label={`Add to ${title}`}
          className="h-9 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle-foreground"
        />
      </form>
    </Card>
  );
}
