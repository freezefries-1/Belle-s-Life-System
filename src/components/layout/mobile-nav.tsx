"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { Brand } from "./brand";
import { DemoNotice } from "./demo-notice";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="border-r border-ink-border bg-ink lg:hidden">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Move between sections of belle’s life system.</SheetDescription>
        <div className="flex h-16 shrink-0 items-center px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
          <SidebarNav onNavigate={() => onOpenChange(false)} />
        </div>
        <div className="border-t border-ink-border/60 p-3">
          <DemoNotice />
        </div>
      </SheetContent>
    </Sheet>
  );
}
