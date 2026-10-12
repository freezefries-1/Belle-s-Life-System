"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Brand } from "./brand";
import { DemoNotice } from "./demo-notice";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-ink-border/60 bg-ink transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[72px]" : "w-[252px]",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "px-5")}>
        <Brand collapsed={collapsed} />
      </div>

      <div className={cn("flex-1 overflow-y-auto pt-3 pb-4", collapsed ? "px-3" : "px-3")}>
        <SidebarNav collapsed={collapsed} />
      </div>

      <div className={cn("flex shrink-0 flex-col gap-3 border-t border-ink-border/60 p-3")}>
        {!collapsed && <DemoNotice />}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "flex h-9 cursor-pointer items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-ink-muted transition-colors hover:bg-ink-2/70 hover:text-ink-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
                collapsed && "justify-center px-0",
              )}
            >
              <ToggleIcon className="size-[18px]" strokeWidth={1.9} />
              {!collapsed && <span>Collapse</span>}
              {!collapsed && (
                <kbd className="ml-auto rounded border border-ink-border px-1.5 text-[10px] font-semibold text-ink-muted">
                  [
                </kbd>
              )}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Expand sidebar</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
