"use client";

import { LogOut, ShieldCheck } from "lucide-react";

import { SyncIndicator } from "@/components/cloud/sync-status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccount, useSyncStatus } from "@/lib/auth/account";

/** Signed-in account (cloud mode only). */
export function AccountSettings() {
  const ctx = useAccount();
  const status = useSyncStatus();
  if (!ctx) return null;
  return (
    <Card className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[200px_minmax(0,1fr)] md:p-6">
      <div>
        <h3 className="text-[15px] font-semibold">Account</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Signed in and syncing.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
            <ShieldCheck className="size-4 text-emerald-600" />
            {ctx.account.email}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <SyncIndicator />
            {status?.lastSyncedAt && <span>Last checked {new Date(status.lastSyncedAt).toLocaleTimeString()}</span>}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            if (ctx.engine.hasUnsavedChanges() && !window.confirm("Some changes haven’t been saved yet. Sign out anyway?")) return;
            void ctx.signOut();
          }}
        >
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </div>
    </Card>
  );
}
