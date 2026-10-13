"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLogFor } from "@/lib/daily/day";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { ISODate, KaizenLogInput } from "@/types";

type Fields = Required<KaizenLogInput>;

const PROMPTS: { key: keyof Fields; label: string; placeholder: string }[] = [
  { key: "reflectionWentWell", label: "What went well today?", placeholder: "Big or small — it counts." },
  { key: "reflectionImprove", label: "What could I improve tomorrow?", placeholder: "One gentle tweak is plenty." },
  { key: "reflectionLearned", label: "What’s one thing I learned?", placeholder: "Optional." },
];

/**
 * Reflection + daily notes for one day. Everything is optional and saves as
 * you type (partial answers are fine). Remount with `key={date}` per day.
 */
export function ReflectionEditor({ date, section }: { date: ISODate; section: "reflection" | "notes" }) {
  const { workspace, actions } = useWorkspace();
  const log = getLogFor(workspace, date);
  const stored: Fields = {
    reflectionWentWell: log?.reflectionWentWell ?? "",
    reflectionImprove: log?.reflectionImprove ?? "",
    reflectionLearned: log?.reflectionLearned ?? "",
    notes: log?.notes ?? "",
  };
  const [fields, setFields] = React.useState<Fields>(stored);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const pending = React.useRef<Partial<Fields> | null>(null);
  const timer = React.useRef<number | null>(null);

  const flush = React.useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) {
      actions.updateLog(date, pending.current);
      pending.current = null;
      setStatus("saved");
    }
  }, [actions, date]);

  // Save anything still pending when leaving the page or switching days.
  React.useEffect(() => flush, [flush]);

  function change(key: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    pending.current = { ...pending.current, [key]: value };
    setStatus("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 600);
  }

  const statusLine = (
    <p className="flex h-4 items-center gap-1 text-[11px] text-muted-foreground" aria-live="polite">
      {status === "saving" && (
        <>
          <Loader2 className="size-3 animate-spin" /> Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3 text-emerald-600" /> Your progress has been saved.
        </>
      )}
    </p>
  );

  if (section === "notes") {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={`notes-${date}`} className="sr-only">
          Daily notes
        </Label>
        <Textarea
          id={`notes-${date}`}
          value={fields.notes}
          onChange={(e) => change("notes", e.target.value)}
          onBlur={flush}
          placeholder="Thoughts, observations, how the day felt…"
          className="min-h-28"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            For journaling. Things to do belong in the{" "}
            <Link href="/brain-dump" className="font-semibold text-primary hover:text-primary-strong">
              Brain Dump
            </Link>
            .
          </p>
          {statusLine}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PROMPTS.map((p) => (
          <div key={p.key} className="flex flex-col gap-2">
            <Label htmlFor={`${p.key}-${date}`} className="text-xs text-muted-foreground">
              {p.label}
            </Label>
            <Textarea
              id={`${p.key}-${date}`}
              value={fields[p.key]}
              onChange={(e) => change(p.key, e.target.value)}
              onBlur={flush}
              placeholder={p.placeholder}
              className="min-h-24"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">{statusLine}</div>
    </div>
  );
}
