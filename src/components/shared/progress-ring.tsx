import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  className,
  trackClassName = "stroke-muted",
  indicatorClassName = "stroke-primary",
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClassName} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className={cn("transition-[stroke-dashoffset] duration-500 ease-out", indicatorClassName)}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
