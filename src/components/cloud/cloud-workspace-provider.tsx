"use client";

import * as React from "react";
import { toast } from "sonner";

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
    // Read the session stored in this browser. A network problem is not the same
    // as being signed out, so only a missing session sends you to sign in.
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      setAccount(user ? { id: user.id, email: user.email ?? "" } : null);
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
  const engine = React.useMemo(() => {
    if (!accountId) return null;
    const e = new CloudSync(client, accountId);
    // Things the engine settled by itself (e.g. merging two copies of today's log).
    e.onNotice = (message) => toast(message, { duration: 7000 });
    return e;
  }, [client, accountId]);
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
    // Signing out on purpose (after any unsaved-changes warning) forgets changes kept on this device.
    engine?.discardPending();
    const { error } = await client.auth.signOut();
    if (error) {
      // Couldn't reach the server: still end the session in this browser.
      const local = await client.auth.signOut({ scope: "local" });
      if (local.error) {
        toast.error("Couldn’t sign out. Check your connection and try again.");
        return;
      }
    }
    window.location.replace("/login");
  }, [client, engine]);

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
