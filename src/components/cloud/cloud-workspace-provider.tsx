"use client";

import * as React from "react";

import { AccountContext, type Account } from "@/lib/auth/account";
import { createCloudRepository } from "@/lib/repositories/cloud-repository";
import { CloudSync } from "@/lib/repositories/cloud-sync";
import { WorkspaceProvider } from "@/lib/store/workspace-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Cloud mode: follows the signed-in account and gives the workspace a
 * Supabase-backed repository. Everything is keyed by the account id, so
 * one person's data can never appear for another.
 */
export function CloudWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const client = getSupabaseBrowserClient();
  const [account, setAccount] = React.useState<Account | null | undefined>(undefined);

  React.useEffect(() => {
    let active = true;
    client.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAccount(data.user ? { id: data.user.id, email: data.user.email ?? "" } : null);
    });
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) return setAccount(null);
      setAccount((current) =>
        current?.id === session.user.id ? current : { id: session.user.id, email: session.user.email ?? "" },
      );
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  // Signed out (or the session expired): leave, with a full page load so no
  // in-memory data from this account survives.
  React.useEffect(() => {
    if (account === null) {
      const next = window.location.pathname + window.location.search;
      window.location.replace(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
    }
  }, [account]);

  const accountId = account?.id;
  const engine = React.useMemo(() => (accountId ? new CloudSync(client, accountId) : null), [client, accountId]);
  React.useEffect(() => () => engine?.dispose(), [engine]);
  const repository = React.useMemo(() => (engine ? createCloudRepository(engine) : null), [engine]);

  // Warn before closing the tab with unsaved changes.
  React.useEffect(() => {
    if (!engine) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (engine.hasUnsavedChanges()) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [engine]);

  const signOut = React.useCallback(async () => {
    await client.auth.signOut();
    window.location.replace("/login");
  }, [client]);

  const value = React.useMemo(
    () => (account && engine ? { account, engine, signOut } : null),
    [account, engine, signOut],
  );

  // Still checking the session: render the page as usual (each page shows its
  // loading skeleton until data arrives) so the route segment is never dropped.
  if (!value || !repository) return <>{children}</>;

  return (
    <AccountContext.Provider value={value}>
      <WorkspaceProvider key={value.account.id} repository={repository}>
        {children}
      </WorkspaceProvider>
    </AccountContext.Provider>
  );
}
