"use client";

import * as React from "react";

import { parseISODate } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface TrendPoint {
  key: string;
  /** YYYY-MM-DD */
  date: string;
  value: number;
  /** Tooltip / screen-reader text for the value, e.g. "18 balls". */
  display: string;
}

/** Width of an element, kept up to date as it resizes. */
function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const shortDate = (iso: string) => parseISODate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * One series over time: a 2px line in the accent colour, a marker on each
 * result, the best result labelled, hairline gridlines, and a tooltip on
 * hover or keyboard focus (nearest point). `step` draws a staircase (stages).
 */
export function TrendChart({
  points,
  label,
  yMax,
  yMin = 0,
  ticks,
  formatTick = String,
  highlightKey,
  highlightLabel,
  step = false,
  extendTo,
  height = 132,
}: {
  points: TrendPoint[];
  /** Accessible name, e.g. "Rally, baseline: 6 results from 1 Jun to 25 Oct". */
  label: string;
  yMax: number;
  yMin?: number;
  ticks: number[];
  formatTick?: (v: number) => string;
  /** The point to label (e.g. the best result). */
  highlightKey?: string;
  highlightLabel?: string;
  step?: boolean;
  /** Carry the last value on to this date (e.g. today), for a staircase. */
  extendTo?: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const pad = { top: 18, right: 14, bottom: 22, left: 34 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const times = points.map((p) => parseISODate(p.date).getTime());
  const endTime = extendTo ? Math.max(parseISODate(extendTo).getTime(), ...times) : Math.max(...times);
  const startTime = Math.min(...times);
  const span = endTime - startTime;
  const x = (t: number) => pad.left + (span === 0 ? plotW / 2 : ((t - startTime) / span) * plotW);
  const y = (v: number) => pad.top + plotH - ((v - yMin) / Math.max(1e-9, yMax - yMin)) * plotH;

  const coords = points.map((p, i) => ({ x: x(times[i]), y: y(p.value) }));
  let d = "";
  coords.forEach((c, i) => {
    if (i === 0) d = `M${c.x},${c.y}`;
    else d += step ? ` H${c.x} V${c.y}` : ` L${c.x},${c.y}`;
  });
  if (extendTo && coords.length) d += ` H${x(endTime)}`;

  function nearest(clientX: number, rect: DOMRect) {
    const px = clientX - rect.left;
    let best = 0;
    coords.forEach((c, i) => {
      if (Math.abs(c.x - px) < Math.abs(coords[best].x - px)) best = i;
    });
    return best;
  }

  const a = active !== null ? points[active] : null;
  const ac = active !== null ? coords[active] : null;
  const hi = highlightKey ? points.findIndex((p) => p.key === highlightKey) : -1;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && points.length > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          className="overflow-visible"
          onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + plotW} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
              <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                {formatTick(t)}
              </text>
            </g>
          ))}
          <text x={pad.left} y={height - 6} className="fill-muted-foreground text-[10px]">
            {shortDate(points[0].date)}
          </text>
          {(points.length > 1 || extendTo) && (
            <text x={pad.left + plotW} y={height - 6} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {extendTo ? "Today" : shortDate(points.at(-1)!.date)}
            </text>
          )}
          {ac && <line x1={ac.x} x2={ac.x} y1={pad.top} y2={pad.top + plotH} className="stroke-muted-foreground/40" strokeWidth={1} />}
          <path d={d} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {coords.map((c, i) => (
            <g
              key={points[i].key}
              tabIndex={0}
              role="img"
              aria-label={`${shortDate(points[i].date)}: ${points[i].display}`}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none [&:focus-visible>circle:last-child]:stroke-primary/50"
            >
              <circle cx={c.x} cy={c.y} r={12} fill="transparent" />
              <circle cx={c.x} cy={c.y} r={i === active || i === hi ? 5 : 4} className="fill-primary stroke-card" strokeWidth={2} />
              <circle cx={c.x} cy={c.y} r={9} fill="none" strokeWidth={2} className="stroke-transparent" />
            </g>
          ))}
          {hi >= 0 && highlightLabel && (
            <text
              x={Math.min(Math.max(coords[hi].x, pad.left + 20), pad.left + plotW - 20)}
              y={coords[hi].y - 10}
              textAnchor="middle"
              className="fill-foreground text-[10px] font-semibold"
            >
              {highlightLabel}
            </text>
          )}
        </svg>
      )}
      {a && ac && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-card px-2 py-1 text-xs whitespace-nowrap shadow-md"
          style={{ left: Math.min(Math.max(ac.x, 50), width - 50), top: ac.y - 10 }}
        >
          <span className="font-semibold">{a.display}</span>
          <span className="ml-1.5 text-muted-foreground">{shortDate(a.date)}</span>
        </div>
      )}
    </div>
  );
}

/** Clean axis ticks from 0 to a little above the largest value. */
export function niceTicks(max: number, count = 3) {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const stepSize = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / stepSize) * stepSize;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += stepSize) ticks.push(Math.round(v * 100) / 100);
  return { top, ticks };
}

/** Wins above the line and losses below, per month, with a legend and hover/focus details. */
export function WinLossChart({ months }: { months: { month: string; wins: number; losses: number }[] }) {
  const [active, setActive] = React.useState<number | null>(null);
  const max = Math.max(1, ...months.flatMap((m) => [m.wins, m.losses]));
  const half = 56;
  const label = (m: string) => parseISODate(`${m}-01`).toLocaleDateString("en-GB", { month: "short" });
  const full = (m: string) => parseISODate(`${m}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const text = (m: { month: string; wins: number; losses: number }) =>
    `${full(m.month)}: ${m.wins} ${m.wins === 1 ? "win" : "wins"}, ${m.losses} ${m.losses === 1 ? "loss" : "losses"}`;
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> Wins
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-orange-600" /> Losses
        </span>
      </div>
      <ul className="flex items-stretch" aria-label="Wins and losses by month">
        {months.map((m, i) => (
          <li
            key={m.month}
            tabIndex={0}
            aria-label={text(m)}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className={cn("relative flex min-w-0 flex-1 flex-col items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/50", active === i && "bg-muted/60")}
          >
            <div className="flex w-full flex-col items-center justify-end" style={{ height: half }}>
              {m.wins > 0 && (
                <>
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{m.wins}</span>
                  <span className="w-full max-w-6 rounded-t bg-primary" style={{ height: (m.wins / max) * (half - 14) }} />
                </>
              )}
            </div>
            <span className="h-px w-full bg-border" />
            <div className="flex w-full flex-col items-center" style={{ height: half }}>
              {m.losses > 0 && (
                <>
                  <span className="w-full max-w-6 rounded-b bg-orange-600" style={{ height: (m.losses / max) * (half - 14) }} />
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{m.losses}</span>
                </>
              )}
            </div>
            <span className="mt-1 text-[10px] text-muted-foreground">{label(m.month)}</span>
            {active === i && (
              <span
                role="presentation"
                className={cn(
                  "pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-md border bg-card px-2 py-1 text-xs whitespace-nowrap shadow-md",
                  i < months.length / 2 ? "left-0" : "right-0",
                )}
              >
                {text(m)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
