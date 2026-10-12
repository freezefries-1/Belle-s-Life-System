import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** A labelled number with an optional one-line note (e.g. what it's based on). */
export function StatTile({
  label,
  value,
  note,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border bg-card px-4 py-3", className)}>
      <dt className="flex items-start gap-1.5 text-[12px] leading-tight font-semibold text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span>{label}</span>
      </dt>
      <dd className="mt-1 text-xl font-bold tracking-tight tabular-nums">{value}</dd>
      {note && <dd className="text-[11px] text-muted-foreground">{note}</dd>}
    </div>
  );
}
