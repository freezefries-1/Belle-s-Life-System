"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { getInbox } from "@/lib/selectors";
import { useWorkspaceOptional } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

import { DemoNotice } from "./demo-notice";
import { NAV_SECTIONS, isActivePath, type NavItem } from "./nav-config";

/** The four sections used most during the day; everything else is under More. */
const PRIMARY_HREFS = ["/", "/tasks", "/brain-dump", "/projects"];
const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
const PRIMARY = PRIMARY_HREFS.map((href) => ALL_ITEMS.find((i) => i.href === href)!);
const MORE = ALL_ITEMS.filter((i) => !PRIMARY_HREFS.includes(i.href));

/**
 * Phones and tablets: a bottom bar (Today, Tasks, Brain Dump, Projects, More).
 * The desktop sidebar is unchanged. Sits above the iPhone home indicator.
 */
export function BottomNav() {
  return (
    <React.Suspense fallback={<BottomNavBar pathname="" />}>
      <BottomNavWithPath />
    </React.Suspense>
  );
}

function BottomNavWithPath() {
  return <BottomNavBar pathname={usePathname()} />;
}

function BottomNavBar({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const ctx = useWorkspaceOptional();
  const inbox = ctx ? getInbox(ctx.workspace).length : 0;
  const moreActive = MORE.some((i) => isActivePath(pathname, i.href));

  return (
    <>
      <nav
        aria-label="Main"
        data-testid="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-border bg-ink pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] lg:hidden"
      >
        <ul className="mx-auto flex h-14 max-w-xl items-stretch">
          {PRIMARY.map((item) => (
            <li key={item.href} className="flex-1">
              <BarLink item={item} active={isActivePath(pathname, item.href)} badge={item.href === "/brain-dump" ? inbox : 0} />
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={barItemClass(moreActive)}
            >
              <Ellipsis className="size-5" strokeWidth={1.9} />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="border-t border-ink-border bg-ink px-4 pt-4 lg:hidden">
          <SheetTitle className="px-1 text-[13px] text-ink-muted">More</SheetTitle>
          <SheetDescription className="sr-only">Every other section of belle’s life system.</SheetDescription>
          <ul className="mt-3 mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MORE.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-xl bg-ink-2/60 px-3.5 text-[13px] font-semibold text-ink-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                      active && "bg-ink-2 ring-1 ring-primary/50",
                    )}
                  >
                    <item.icon className={cn("size-[18px] shrink-0", active ? "text-primary-hover" : "text-ink-muted")} strokeWidth={1.9} />
                    <span className="min-w-0 leading-tight">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <DemoNotice className="mb-4" />
        </SheetContent>
      </Sheet>
    </>
  );
}

function barItemClass(active: boolean) {
  return cn(
    "relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold tracking-tight outline-none transition-colors focus-visible:bg-ink-2",
    active ? "text-primary-hover" : "text-ink-muted hover:text-ink-foreground",
  );
}

function BarLink({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={barItemClass(active)}>
      {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-primary" aria-hidden />}
      <span className="relative">
        <item.icon className="size-5" strokeWidth={1.9} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-primary px-1 text-center text-[9.5px] leading-4 font-bold text-white tabular-nums">
            {badge > 99 ? "99+" : badge}
            <span className="sr-only"> in inbox</span>
          </span>
        )}
      </span>
      <span>{item.title}</span>
    </Link>
  );
}
