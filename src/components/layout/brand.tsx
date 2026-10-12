import { cn } from "@/lib/utils";

/** Three rising steps — small, continuous improvement. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" fill="currentColor">
        <rect x="3" y="12" width="4" height="5" rx="1.2" opacity="0.55" />
        <rect x="8" y="8" width="4" height="9" rx="1.2" opacity="0.8" />
        <rect x="13" y="3" width="4" height="14" rx="1.2" />
      </svg>
    </span>
  );
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark />
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-bold tracking-tight text-ink-foreground">
            belle’s life system
          </p>
          <p className="truncate text-[11px] font-medium text-ink-muted">Your life. Your system.</p>
        </div>
      )}
    </div>
  );
}
