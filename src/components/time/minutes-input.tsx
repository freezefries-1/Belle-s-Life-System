"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: number | null;
  onSave: (minutes: number | null) => void;
  label: string;
  className?: string;
};

/** A small minutes field that saves on blur/Enter. Empty means "not recorded", never zero. */
export function MinutesInput(props: Props) {
  // Re-mount when the saved value changes elsewhere, so the draft starts fresh.
  return <MinutesField key={String(props.value)} {...props} />;
}

function MinutesField({
  value,
  onSave,
  label,
  className,
}: Props) {
  const [draft, setDraft] = React.useState(value === null ? "" : String(value));
  const commit = () => {
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : Math.max(0, Math.min(99_999, Math.round(Number(trimmed))));
    if (next !== null && Number.isNaN(next)) return setDraft(value === null ? "" : String(value));
    if (next !== value) onSave(next);
  };
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      aria-label={label}
      placeholder="—"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      className={cn("h-8 w-20 text-right text-xs tabular-nums", className)}
    />
  );
}
