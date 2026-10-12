"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_LINK_ERRORS, safeNextPath } from "@/lib/auth/redirect";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isCloudEnabled } from "@/lib/supabase/config";

import { AuthCard } from "./auth-card";

type Mode = "sign-in" | "sign-up" | "forgot";

const COPY: Record<Mode, { title: string; description: string; submit: string }> = {
  "sign-in": { title: "Welcome back", description: "Sign in to your workspace.", submit: "Sign in" },
  "sign-up": { title: "Create your account", description: "Your data stays private to you.", submit: "Create account" },
  forgot: { title: "Reset your password", description: "We’ll email you a link to choose a new one.", submit: "Send reset link" },
};

/** Friendly wording for the auth errors people actually hit. */
function explain(message: string) {
  if (/invalid login credentials/i.test(message)) return "That email and password don’t match. Check them and try again.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first — check your inbox for the link.";
  if (/already registered|already been registered/i.test(message)) return "There’s already an account with this email. Try signing in.";
  if (/password should be|weak password/i.test(message)) return "Choose a longer password (at least 8 characters).";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  if (/fetch|network/i.test(message)) return "Can’t reach the server. Check your connection and try again.";
  if (/signups? not allowed|signup is disabled/i.test(message)) return "New accounts are switched off for this workspace.";
  return message;
}

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [mode, setMode] = React.useState<Mode>("sign-in");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  // Only known messages are shown — never arbitrary text from the address bar.
  const [error, setError] = React.useState<string | null>(AUTH_LINK_ERRORS[params.get("error") ?? ""] ?? null);
  const [notice, setNotice] = React.useState<string | null>(null);

  if (!isCloudEnabled) {
    return (
      <AuthCard title="Cloud sync isn’t set up" description="This workspace is saving to this browser only, so there’s nothing to sign in to.">
        <Button asChild className="w-full">
          <Link href="/">Open the workspace</Link>
        </Button>
      </AuthCard>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = getSupabaseBrowserClient();
    const confirmUrl = (to: string) => `${window.location.origin}/auth/confirm?next=${encodeURIComponent(to)}`;
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // Full navigation so the server sees the new session cookie.
        window.location.assign(next);
        return;
      }
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: confirmUrl(next) } });
        if (error) throw error;
        if (data.session) {
          window.location.assign(next);
          return;
        }
        setNotice("Check your email to confirm your account, then sign in.");
        setMode("sign-in");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: confirmUrl("/reset-password") });
        if (error) throw error;
        setNotice("If there’s an account for that email, a reset link is on its way.");
        setMode("sign-in");
      }
    } catch (err) {
      setError(explain(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  const copy = COPY[mode];
  return (
    <AuthCard title={copy.title} description={copy.description}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {notice && (
          <p role="status" className="rounded-lg bg-accent px-3 py-2 text-[13px] text-accent-foreground">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        {mode !== "forgot" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "sign-in" && (
                <button type="button" onClick={() => (setMode("forgot"), setError(null))} className="cursor-pointer text-xs font-semibold text-primary hover:text-primary-hover">
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        <Button type="submit" disabled={busy || !email.trim() || (mode !== "forgot" && password.length < (mode === "sign-up" ? 8 : 1))} className="gap-1.5">
          {busy && <Loader2 className="size-4 animate-spin" />}
          {copy.submit}
        </Button>
      </form>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            New here?{" "}
            <button type="button" onClick={() => (setMode("sign-up"), setError(null))} className="cursor-pointer font-semibold text-primary hover:text-primary-hover">
              Create an account
            </button>
          </>
        ) : (
          <button type="button" onClick={() => (setMode("sign-in"), setError(null))} className="cursor-pointer font-semibold text-primary hover:text-primary-hover">
            Back to sign in
          </button>
        )}
      </p>
    </AuthCard>
  );
}
