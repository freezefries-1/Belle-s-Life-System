"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { LookAhead } from "@/components/review/look-ahead";
import { LookBack } from "@/components/review/look-back";
import { Reflect } from "@/components/review/reflect";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addDays, formatShortDate, isValidISODate, parseISODate, startOfWeek } from "@/lib/date";
import { defaultReviewWeek, getWeekSummary } from "@/lib/review/weekly";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { ISODate, WeeklyReview } from "@/types";

const STEPS = [
  { id: "back", label: "Look back" },
  { id: "reflect", label: "Reflect" },
  { id: "ahead", label: "Look ahead" },
] as const;
type Step = (typeof STEPS)[number]["id"];

const isDateKey = (v: string | null): v is ISODate => isValidISODate(v);

export function weekRangeLabel(weekStart: ISODate) {
  const end = addDays(weekStart, 6);
  const year = parseISODate(end).getFullYear();
  return `${formatShortDate(weekStart)} – ${formatShortDate(end)} ${year}`;
}

export function ReviewStatusBadge({ review }: { review: WeeklyReview | null }) {
  const status = review?.status ?? "not_started";
  const style = {
    not_started: "bg-slate-100 text-slate-600 border-slate-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-100",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }[status];
  const label = { not_started: "Not started", in_progress: "In progress", completed: "Completed" }[status];
  return (
    <Badge variant="outline" className={cn("text-[11px]", style)}>
      {label}
    </Badge>
  );
}

export function WeeklyReviewPage() {
  const { workspace, actions } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const thisWeek = startOfWeek(workspace.today);
  const requested = params.get("week");
  const weekStart = isDateKey(requested) && startOfWeek(requested) <= thisWeek ? startOfWeek(requested) : defaultReviewWeek(workspace.today, startOfWeek);
  const [step, setStep] = React.useState<Step>("back");

  const review = workspace.weeklyReviews.find((r) => r.weekStartDate === weekStart) ?? null;
  const priorities = review
    ? workspace.weeklyPriorities.filter((p) => p.weeklyReviewId === review.id).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const summary = getWeekSummary(workspace, weekStart);
  const go = (w: ISODate) => {
    setStep("back");
    router.push(`/weekly-review?week=${w}`, { scroll: false });
  };
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <>
      <PageHeader title="Weekly Review" description="Ten quiet minutes: look back, reflect, and choose what matters next week." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="flex-row flex-wrap items-center gap-3 p-4">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => go(addDays(weekStart, -7))} aria-label="Previous week">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => go(addDays(weekStart, 7))} disabled={weekStart >= thisWeek} aria-label="Next week">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                {weekStart === thisWeek ? "This week" : weekStart === addDays(thisWeek, -7) ? "Last week" : "Week of"}
              </p>
              <h3 className="text-base font-semibold" data-testid="week-range">
                {weekRangeLabel(weekStart)}
              </h3>
            </div>
            <ReviewStatusBadge review={review} />
            {weekStart !== thisWeek && (
              <Button variant="ghost" size="sm" onClick={() => go(thisWeek)}>
                This week
              </Button>
            )}
          </Card>

          <nav aria-label="Review steps" className="grid grid-cols-3 gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-current={step === s.id ? "step" : undefined}
                onClick={() => setStep(s.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left text-xs font-semibold transition-colors sm:px-3 sm:text-[13px]",
                  step === s.id ? "border-primary/40 bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                    step === s.id ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {i + 1}
                </span>
                <span className="leading-tight">{s.label}</span>
              </button>
            ))}
          </nav>

          {step === "back" && <LookBack key={weekStart} summary={summary} />}
          {step === "reflect" && <Reflect key={weekStart} weekStart={weekStart} review={review} />}
          {step === "ahead" && <LookAhead weekStart={weekStart} priorities={priorities} />}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" className="gap-1.5" disabled={stepIndex === 0} onClick={() => setStep(STEPS[stepIndex - 1].id)}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              {review?.status === "completed" ? (
                <Button
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() => {
                    actions.setWeeklyReviewStatus(weekStart, "in_progress");
                    toast("Review reopened");
                  }}
                >
                  <RotateCcw className="size-4" />
                  Reopen review
                </Button>
              ) : (
                <Button
                  variant={stepIndex === STEPS.length - 1 ? "default" : "outline"}
                  className="gap-1.5"
                  onClick={() => {
                    actions.setWeeklyReviewStatus(weekStart, "completed");
                    toast("Weekly review completed", { description: "Nice work closing the loop on this week." });
                  }}
                >
                  <CheckCircle2 className="size-4" />
                  Mark review complete
                </Button>
              )}
              {stepIndex < STEPS.length - 1 && (
                <Button className="gap-1.5" onClick={() => setStep(STEPS[stepIndex + 1].id)}>
                  Next: {STEPS[stepIndex + 1].label}
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="min-w-0">
          <ReviewHistory current={weekStart} thisWeek={thisWeek} />
        </aside>
      </div>
    </>
  );
}

function ReviewHistory({ current, thisWeek }: { current: ISODate; thisWeek: ISODate }) {
  const { workspace } = useWorkspace();
  const reviews = [...workspace.weeklyReviews].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  // Always offer this week and last week, even before a review exists.
  const weeks = [...new Set([thisWeek, addDays(thisWeek, -7), ...reviews.map((r) => r.weekStartDate)])].sort().reverse();
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold">
        <History className="size-4 text-muted-foreground" />
        Review history
      </h3>
      <ul className="mt-3 flex flex-col gap-1" aria-label="Review history">
        {weeks.map((w) => {
          const r = reviews.find((x) => x.weekStartDate === w) ?? null;
          return (
            <li key={w}>
              <Link
                href={`/weekly-review?week=${w}`}
                scroll={false}
                aria-current={w === current ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13px] hover:bg-muted",
                  w === current && "bg-accent/70 font-semibold",
                )}
              >
                <span className="truncate">{weekRangeLabel(w)}</span>
                <ReviewStatusBadge review={r} />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
