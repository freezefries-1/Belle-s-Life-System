import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8", className)}>
      <div className="min-w-0">
        <h2 className="text-[26px] leading-tight font-bold tracking-tight text-foreground lg:text-[30px]">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
