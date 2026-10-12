"use client";

import * as React from "react";

import { TaskEditorProvider } from "@/components/tasks/task-editor-provider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

import { GlobalSearch } from "./global-search";
import { MobileNav } from "./mobile-nav";
import { QuickAddDialog } from "./quick-add-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
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
        setCollapsed((c) => !c);
      } else if (e.key === "?") {
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusSearch]);

  return (
    <WorkspaceProvider>
      <TooltipProvider>
        <TaskEditorProvider>
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
        <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

        <div
          className={cn(
            "flex min-h-dvh flex-col transition-[padding] duration-200 ease-out",
            collapsed ? "lg:pl-[72px]" : "lg:pl-[252px]",
          )}
        >
          <Topbar
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onQuickAdd={() => setQuickAddOpen(true)}
            onOpenMobileSearch={() => setMobileSearchOpen(true)}
            onShowShortcuts={() => setShortcutsOpen(true)}
            searchInputRef={searchInputRef}
          />
          <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-8">
            {children}
          </main>
        </div>

        <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
        <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
          <DialogContent className="top-4 translate-y-0 p-3" showCloseButton={false}>
            <DialogTitle className="sr-only">Search</DialogTitle>
            <GlobalSearch autoFocus onNavigate={() => setMobileSearchOpen(false)} />
          </DialogContent>
        </Dialog>
          <Toaster />
        </TaskEditorProvider>
      </TooltipProvider>
    </WorkspaceProvider>
  );
}
