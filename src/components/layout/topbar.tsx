"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/date";
import { useToday } from "@/lib/use-today";

import { SyncIndicator } from "@/components/cloud/sync-status";

import { GlobalSearch } from "./global-search";
import { getNavItem } from "./nav-config";
import { UserMenu } from "./user-menu";

export function Topbar({
  onOpenMobileNav,
  onQuickAdd,
  onOpenMobileSearch,
  onShowShortcuts,
  searchInputRef,
}: {
  onOpenMobileNav: () => void;
  onQuickAdd: () => void;
  onOpenMobileSearch: () => void;
  onShowShortcuts: () => void;
  searchInputRef: React.Ref<HTMLInputElement>;
}) {
  const today = useToday();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon-sm"
        className="-ml-1.5 lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="h-[22px] truncate text-[17px] leading-tight font-bold tracking-tight">
          {/* Pathname is request-time data on dynamic routes, so it streams in. */}
          <React.Suspense fallback={null}>
            <PageTitle />
          </React.Suspense>
        </h1>
        <p className="h-4 truncate text-xs font-medium text-muted-foreground" suppressHydrationWarning>
          {today ? formatLongDate(today) : ""}
        </p>
      </div>

      <SyncIndicator />

      <GlobalSearch inputRef={searchInputRef} className="hidden w-64 md:block xl:w-80" />

      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={onOpenMobileSearch}
        aria-label="Search"
      >
        <Search className="size-[18px]" />
      </Button>

      <Button onClick={onQuickAdd} className="gap-1.5 max-sm:size-9 max-sm:px-0" aria-label="Quick add">
        <Plus className="size-4" strokeWidth={2.5} />
        <span className="hidden sm:inline">Quick Add</span>
        <kbd className="ml-0.5 hidden rounded bg-white/15 px-1.5 text-[10px] font-semibold sm:inline">N</kbd>
      </Button>

      <UserMenu onShowShortcuts={onShowShortcuts} />
    </header>
  );
}

function PageTitle() {
  return getNavItem(usePathname()).title;
}
