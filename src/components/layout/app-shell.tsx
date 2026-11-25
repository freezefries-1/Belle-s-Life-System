"use client";

import * as React from "react";

import { SessionPlannerProvider } from "@/components/sprints/session-planner-provider";
import { TaskEditorProvider } from "@/components/tasks/task-editor-provider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CloudWorkspaceProvider } from "@/components/cloud/cloud-workspace-provider";
import { WorkspaceProvider } from "@/lib/store/workspace-store";
import { isCloudEnabled } from "@/lib/supabase/config";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import { BottomNav } from "./bottom-nav";
import { GlobalSearch } from "./global-search";
import { QuickAddDialog } from "./quick-add-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const COLLAPSED_KEY = "belles-life-system:sidebar-collapsed";

/** Your last choice, if any. Storage can be blocked (private mode), so this never throws. */
function readCollapsedChoice(): boolean | null {
  try {
    const v = window.localStorage.getItem(COLLAPSED_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

function saveCollapsedChoice(collapsed: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Not saved; the sidebar still works for this visit.
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  // Tablets in portrait (iPad, 768–1023px wide) always get the slim sidebar; it can be expanded from 1024px up.
  const canExpand = useMediaQuery("(min-width: 1024px)");
  const slim = collapsed || !canExpand;

  // Start slim on iPad-sized screens (under 1280px, e.g. iPad in landscape) unless you chose otherwise.
  React.useEffect(() => {
    const choice = readCollapsedChoice();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the browser once after mount (not available on the server)
    setCollapsed(choice ?? window.innerWidth < 1280);
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((c) => {
      saveCollapsedChoice(!c);
      return !c;
    });
  }, []);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const focusSearch = React.useCallback(() => {
    const input = searchInputRef.current;
    // The inline search is hidden on small screens; fall back to the dialog.
    if (input && input.offsetParent !== null) input.focus();
    else setMobileSearchOpen(true);
  }, []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector("[role=dialog]")) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setQuickAddOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "[") {
        if (window.matchMedia("(min-width: 1024px)").matches) toggleCollapsed();
      } else if (e.key === "?") {
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusSearch, toggleCollapsed]);

  // Cloud mode when Supabase is configured; otherwise browser-only storage as before.
  const DataProvider = isCloudEnabled ? CloudWorkspaceProvider : WorkspaceProvider;

  return (
    <DataProvider>
      <TooltipProvider>
        <TaskEditorProvider>
          <SessionPlannerProvider>
            {/* Keyboard users: the first Tab press offers a jump past the navigation. */}
            <a
              href="#main"
              className="sr-only z-50 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              Skip to main content
            </a>
            <Sidebar collapsed={slim} canToggle={canExpand} onToggleCollapsed={toggleCollapsed} />

            <div
              className={cn(
                // min-w-0 + overflow-x-clip: nothing can make the page wider than the screen
            // (which would make phones zoom out); clip keeps the sticky top bar working.
            "flex min-h-dvh min-w-0 flex-col overflow-x-clip transition-[padding] duration-200 ease-out",
                // Room for the sidebar from tablet width up (slim rail is 88px on touch screens).
                "md:pl-[72px] md:pointer-coarse:pl-[88px]",
                collapsed ? "lg:pl-[72px] lg:pointer-coarse:pl-[88px]" : "lg:pl-[252px] lg:pointer-coarse:pl-[252px]",
              )}
            >
              <Topbar
                onQuickAdd={() => setQuickAddOpen(true)}
                onOpenMobileSearch={() => setMobileSearchOpen(true)}
                onShowShortcuts={() => setShortcutsOpen(true)}
                searchInputRef={searchInputRef}
              />
              {/* On phones the bottom bar covers the last 56px (plus the iPhone home indicator area). */}
              <main id="main" tabIndex={-1} className="mx-auto outline-none w-full max-w-[1360px] flex-1 px-[max(1rem,env(safe-area-inset-left))] pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-8 md:pb-[calc(3rem+env(safe-area-inset-bottom))] lg:px-8 lg:pb-16">
                {children}
              </main>
            </div>
            <BottomNav />

            <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
            <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
            <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
              <DialogContent className="top-4 translate-y-0 p-3" showCloseButton={false}>
                <DialogTitle className="sr-only">Search</DialogTitle>
                <GlobalSearch autoFocus onNavigate={() => setMobileSearchOpen(false)} />
              </DialogContent>
            </Dialog>
            <Toaster />
          </SessionPlannerProvider>
        </TaskEditorProvider>
      </TooltipProvider>
    </DataProvider>
  );
}
