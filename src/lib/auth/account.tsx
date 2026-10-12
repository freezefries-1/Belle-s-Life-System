"use client";

import * as React from "react";

import type { CloudSync, SyncStatus } from "@/lib/repositories/cloud-sync";

export interface Account {
  id: string;
  email: string;
}

interface AccountContextValue {
  account: Account;
  engine: CloudSync;
  signOut: () => Promise<void>;
}

export const AccountContext = React.createContext<AccountContextValue | null>(null);

/** The signed-in account and its sync engine — null in browser-only mode. */
export function useAccount() {
  return React.useContext(AccountContext);
}

const SERVER_STATUS: SyncStatus = { state: "synced", pending: 0, message: null, conflicts: [], lastSyncedAt: null };

/** Live sync status (null in browser-only mode). */
export function useSyncStatus(): SyncStatus | null {
  const ctx = useAccount();
  const engine = ctx?.engine ?? null;
  const subscribe = React.useCallback((cb: () => void) => (engine ? engine.subscribe(cb) : () => {}), [engine]);
  const status = React.useSyncExternalStore(subscribe, () => engine?.getStatus() ?? SERVER_STATUS, () => SERVER_STATUS);
  return engine ? status : null;
}
