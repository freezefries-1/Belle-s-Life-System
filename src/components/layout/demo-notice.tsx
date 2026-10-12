"use client";

import { Cloud, HardDrive, TriangleAlert } from "lucide-react";

import { useAccount } from "@/lib/auth/account";

import { useWorkspaceOptional } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";

/** Says plainly where data lives — your account (cloud mode) or this browser. */
export function DemoNotice({ className }: { className?: string }) {
  const ctx = useWorkspaceOptional();
  const cloud = useAccount();
  const unavailable = !cloud && ctx?.storage.status === "unavailable";
  const Icon = cloud ? Cloud : unavailable ? TriangleAlert : HardDrive;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-ink-border/70 bg-ink-2/50 px-3 py-2.5 text-[11px] leading-snug text-ink-muted",
        className,
      )}
    >
      <Icon className={cn("mt-px size-3.5 shrink-0", unavailable && "text-amber-400")} />
      {cloud ? (
        <span>
          <span className="font-semibold text-ink-foreground">Synced to your account.</span> Available on any device
          you sign in to.
        </span>
      ) : unavailable ? (
        <span>
          <span className="font-semibold text-ink-foreground">Not saving.</span> This browser is blocking storage, so
          changes last until you close the tab.
        </span>
      ) : (
        <span>
          <span className="font-semibold text-ink-foreground">Saved in this browser.</span> Your data stays on this
          device. Download a backup from Preferences now and then.
        </span>
      )}
    </div>
  );
}
