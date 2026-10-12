import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 py-8 text-center", className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="text-[13px] font-semibold">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
