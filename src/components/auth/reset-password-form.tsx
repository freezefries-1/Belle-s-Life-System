"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { AuthCard } from "./auth-card";

/** Reached from the reset email (which signs you in for this step). */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(!!data.user));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(/should be|weak/i.test(error.message) ? "Choose a longer password (at least 8 characters)." : error.message);
    router.replace("/");
  }

  if (hasSession === false) {
    return (
      <AuthCard title="This link has expired" description="Password reset links work once and expire after a while.">
        <Button asChild className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" description="You’ll stay signed in on this device.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </div>
        <Button type="submit" disabled={busy || password.length < 8 || hasSession === null} className="gap-1.5">
          {busy && <Loader2 className="size-4 animate-spin" />}
          Save password
        </Button>
      </form>
    </AuthCard>
  );
}
