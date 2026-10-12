"use client";

import * as React from "react";
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
import { useAccount } from "@/lib/auth/account";

export function UserMenu({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const ctx = useAccount();
  const email = ctx?.account.email ?? "";
  const initial = (email[0] ?? "B").toUpperCase();

  const signOut = () => {
    if (ctx?.engine.hasUnsavedChanges() && !window.confirm("Some changes haven’t been saved yet and will be lost if you sign out now. Sign out anyway?")) return;
    void ctx?.signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open profile menu"
        className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-ink text-[13px] font-bold text-ink-foreground ring-offset-2 transition-shadow outline-none hover:ring-2 hover:ring-border focus-visible:ring-2 focus-visible:ring-primary"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-[13px] font-semibold">Belle</p>
          <p className="truncate text-xs text-muted-foreground" data-testid="account-email">
            {ctx ? email : "Personal workspace · this browser"}
          </p>
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
        {ctx && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
