import { cn } from "@/lib/utils";

export interface BarDatum {
  key: string;
  /** Short axis label. */
  label: string;
  /** Full label for screen readers and the tooltip. */
  title: string;
  value: number;
  highlight?: boolean;
}

/**
 * A plain vertical bar chart (no chart library): readable, responsive and
 * accessible as a list. Labels thin out automatically when there are many bars.
 */
export function BarChart({ data, unit, height = 140, className }: { data: BarDatum[]; unit: string; height?: number; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const every = data.length > 16 ? Math.ceil(data.length / 8) : 1;
  return (
    <div className={cn("min-w-0", className)}>
      <ul className="flex items-end gap-[3px] sm:gap-1" style={{ height }} aria-label={`Chart of ${unit}`}>
        {data.map((d) => (
          <li key={d.key} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.title}: ${d.value} ${unit}`}>
            <span className="sr-only">
              {d.title}: {d.value} {unit}
            </span>
            {d.value > 0 && <span className="mb-0.5 hidden text-center text-[10px] font-semibold text-muted-foreground tabular-nums sm:block">{data.length <= 16 ? d.value : ""}</span>}
            <span
              aria-hidden
              className={cn("w-full rounded-t-[3px]", d.value ? (d.highlight ? "bg-primary" : "bg-primary/60") : "bg-muted")}
              style={{ height: d.value ? `${Math.max(4, (d.value / max) * 100)}%` : 3 }}
            />
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex gap-[3px] sm:gap-1" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground">
            {i % every === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars for comparing a few categories. */
export function HBarList({
  rows,
  ariaLabel,
}: {
  rows: { key: string; label: React.ReactNode; value: number; display: string; barClassName?: string }[];
  ariaLabel: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3" aria-label={ariaLabel}>
      {rows.map((r) => (
        <li key={r.key} className="min-w-0">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate font-medium">{r.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{r.display}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div className={cn("h-2 rounded-full bg-primary", r.barClassName)} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Calm empty state used across analytics when records are too few. */
export function NotEnoughData({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-dashed bg-card/60 px-4 py-6 text-center", className)}>
      <p className="text-[13px] font-semibold">Not enough data yet.</p>
      <p className="mt-0.5 text-xs text-muted-foreground italic">{children ?? "Keep tracking a few tasks to discover your planning patterns."}</p>
    </div>
  );
}
