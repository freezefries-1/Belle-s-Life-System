"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REFLECTION_PROMPTS } from "@/lib/review/weekly";
import { useWorkspaceActions } from "@/lib/store/workspace-store";
import type { ISODate, WeeklyReview, WeeklyReviewInput } from "@/types";

type Key = (typeof REFLECTION_PROMPTS)[number]["key"];

/** Five optional questions. Saves as you type; a review record is created on the first word. */
export function Reflect({ weekStart, review }: { weekStart: ISODate; review: WeeklyReview | null }) {
  const actions = useWorkspaceActions();
  const [values, setValues] = React.useState<Record<Key, string>>(() =>
    Object.fromEntries(REFLECTION_PROMPTS.map((p) => [p.key, review?.[p.key] ?? ""])) as Record<Key, string>,
  );
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const pending = React.useRef<WeeklyReviewInput>({});
  const timer = React.useRef<number | null>(null);

  const flush = React.useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (Object.keys(pending.current).length) {
      actions.updateWeeklyReview(weekStart, pending.current);
      pending.current = {};
      setStatus("saved");
    }
  }, [actions, weekStart]);

  React.useEffect(() => flush, [flush]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">Reflect</h3>
          <p className="text-xs text-muted-foreground">Every question is optional. A sentence is plenty.</p>
        </div>
        <p className="flex h-4 items-center gap-1 text-[11px] text-muted-foreground" aria-live="polite">
          {status === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="size-3 text-emerald-600" /> Saved
            </>
          )}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-5">
        {REFLECTION_PROMPTS.map((p) => (
          <div key={p.key} className="flex flex-col gap-2">
            <Label htmlFor={`wr-${p.key}`} className="text-[13px] font-semibold">
              {p.label}
            </Label>
            <Textarea
              id={`wr-${p.key}`}
              value={values[p.key]}
              onChange={(e) => {
                const v = e.target.value;
                setValues((s) => ({ ...s, [p.key]: v }));
                pending.current = { ...pending.current, [p.key]: v };
                setStatus("saving");
                if (timer.current) window.clearTimeout(timer.current);
                timer.current = window.setTimeout(flush, 600);
              }}
              onBlur={flush}
              className="min-h-20"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
