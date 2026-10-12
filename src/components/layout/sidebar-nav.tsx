"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getInbox } from "@/lib/selectors";
import { getTaskSummary } from "@/lib/tasks/task-queries";
import { useWorkspaceOptional } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

import { NAV_SECTIONS, isActivePath, type NavItem } from "./nav-config";

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const ctx = useWorkspaceOptional();

  const counts: Record<NonNullable<NavItem["countKey"]>, number | undefined> = {
    inbox: ctx ? getInbox(ctx.workspace).length : undefined,
    today: ctx ? getTaskSummary(ctx.workspace.tasks, ctx.workspace.today).dueToday : undefined,
  };

  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="flex flex-col gap-0.5">
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-6 bg-ink-border/70 first:hidden" aria-hidden />
          ) : (
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-ink-muted/70 uppercase">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const active = isActivePath(pathname, item.href);
            const count = item.countKey ? counts[item.countKey] : undefined;
            const link = (
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-ink-muted transition-colors outline-none hover:bg-ink-2/70 hover:text-ink-foreground focus-visible:ring-2 focus-visible:ring-primary/60",
                  active && "bg-ink-2 text-ink-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                {active && (
                  <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-primary" aria-hidden />
                )}
                <item.icon
                  className={cn(
                    "size-[18px] shrink-0 transition-colors",
                    active ? "text-primary-hover" : "text-ink-muted group-hover:text-ink-foreground",
                  )}
                  strokeWidth={1.9}
                />
                {!collapsed && <span className="truncate">{item.title}</span>}
                {!collapsed && count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "ml-auto rounded-md px-1.5 py-px text-[11px] font-semibold tabular-nums",
                      active ? "bg-primary/20 text-blue-200" : "bg-ink-2 text-ink-muted",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );

            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">
                  {item.title}
                  {count ? <span className="ml-1.5 text-ink-muted">{count}</span> : null}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div key={item.href}>{link}</div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
