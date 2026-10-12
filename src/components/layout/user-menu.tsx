"use client";

import Link from "next/link";
import { Keyboard, LogOut, SlidersHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open profile menu"
        className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-ink text-[13px] font-bold text-ink-foreground ring-offset-2 transition-shadow outline-none hover:ring-2 hover:ring-border focus-visible:ring-2 focus-visible:ring-primary"
      >
        B
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-[13px] font-semibold">Belle</p>
          <p className="text-xs text-muted-foreground">Personal workspace</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SlidersHorizontal />
            Preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onShowShortcuts}>
          <Keyboard />
          Keyboard shortcuts
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <LogOut />
          Sign out
          <DropdownMenuShortcut className="tracking-normal">Phase 2</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
