"use client";

import * as React from "react";
import { CheckCircle2, FileUp, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAccount, useSyncStatus } from "@/lib/auth/account";
import { MAX_BACKUP_BYTES, planRestore, readBackupText, verifyRestore, type RestorePlan } from "@/lib/repositories/backup-restore";
import { TABLE_LABELS, runImport, type LocalSnapshot } from "@/lib/repositories/local-migration";
import type { VerifyResult } from "@/lib/repositories/local-migration";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Step =
  | { kind: "idle" }
  | { kind: "invalid"; message: string }
  | { kind: "planning"; file: string; snap: LocalSnapshot }
  | { kind: "plan"; file: string; snap: LocalSnapshot; plan: RestorePlan }
  | { kind: "restoring"; file: string; snap: LocalSnapshot; plan: RestorePlan; done: number; total: number; label: string }
  | { kind: "done"; file: string; added: number; verify: VerifyResult }
  | { kind: "failed"; file: string; snap: LocalSnapshot; message: string };

/**
 * Settings → Data: restore from a downloaded backup file.
 * Choose a file → it's checked → a preview against the account → confirm →
 * only the missing records are added → verified. Nothing in the account is
 * changed or deleted, and it's safe to run again.
 */
export function BackupRestore() {
  const ctx = useAccount();
  const status = useSyncStatus();
  const [step, setStep] = React.useState<Step>({ kind: "idle" });
  const [confirmed, setConfirmed] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (!ctx) return null;
  const client = getSupabaseBrowserClient();
  const busy = step.kind === "planning" || step.kind === "restoring";
  const notSaved = !!status && (status.state !== "synced" || status.pending > 0);

  const compare = async (file: string, snap: LocalSnapshot) => {
    setConfirmed(false);
    setStep({ kind: "planning", file, snap });
    try {
      setStep({ kind: "plan", file, snap, plan: await planRestore(client, snap.rows) });
    } catch (e) {
      setStep({ kind: "failed", file, snap, message: (e as Error).message });
    }
  };

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_BACKUP_BYTES) return setStep({ kind: "invalid", message: "This file is too large to be a belle’s life system backup. Nothing was changed." });
    const snap = readBackupText(await f.text());
    if ("error" in snap) return setStep({ kind: "invalid", message: snap.error });
    await compare(f.name, snap);
  };

  const restore = async (file: string, snap: LocalSnapshot) => {
    if (ctx.engine.hasUnsavedChanges()) return toast("Some changes are still saving. Try again in a moment.");
    try {
      // Compare again right before adding, so anything added meanwhile (e.g. on another device) is kept as it is.
      const plan = await planRestore(client, snap.rows);
      const total = plan.toAdd;
      setStep({ kind: "restoring", file, snap, plan, done: 0, total, label: "" });
      const result = await runImport(client, ctx.account.id, plan.send, (done, all, table) =>
        setStep({ kind: "restoring", file, snap, plan, done: Math.min(done, total), total: all, label: TABLE_LABELS[table] }),
      );
      const verify = await verifyRestore(client, plan, result);
      const added = Object.values(result).reduce((n, r) => n + r.inserted, 0);
      setStep({ kind: "done", file, added, verify });
      await ctx.engine.refreshAll().catch(() => {});
      toast(added ? `Restored ${added} ${added === 1 ? "record" : "records"}` : "Nothing was missing");
    } catch (e) {
      setStep({ kind: "failed", file, snap, message: (e as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border px-3.5 py-3" data-testid="backup-restore">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Restore from a backup file</p>
          <p className="text-xs text-muted-foreground">
            Adds back anything from a downloaded backup that’s missing from your account. You’ll see a preview first. Records already in your account are never
            changed, and nothing is deleted.
          </p>
        </div>
        <input ref={inputRef} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-hidden onChange={choose} />
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={busy} onClick={() => inputRef.current?.click()}>
          <FileUp className="size-3.5" />
          Choose file
        </Button>
      </div>

      {step.kind === "invalid" && (
        <p role="alert" className="flex items-start gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {step.message}
        </p>
      )}

      {step.kind === "planning" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          <Loader2 className="size-3.5 animate-spin" /> Comparing {step.file} with your account…
        </p>
      )}

      {step.kind === "plan" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs">
            <span className="font-semibold">{step.file}</span>
            {step.snap.savedAt ? ` — backup from ${new Date(step.snap.savedAt).toLocaleString()}` : ""}
          </p>
          <RestoreTable plan={step.plan} />
          {step.snap.invalid > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {step.snap.invalid} unreadable {step.snap.invalid === 1 ? "record" : "records"} in the file will be left out.
            </p>
          )}
          {step.plan.toAdd === 0 ? (
            <p role="status" className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              <CheckCircle2 className="size-3.5" /> Everything in this backup is already in your account. Nothing to restore.
            </p>
          ) : (
            <>
              <div className="flex items-start gap-2.5">
                <Checkbox id="confirm-restore" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
                <Label htmlFor="confirm-restore" className="text-xs leading-snug font-normal">
                  Add {step.plan.toAdd} missing {step.plan.toAdd === 1 ? "record" : "records"} to {ctx.account.email}. Records already in the account stay
                  exactly as they are — nothing will be overwritten or deleted.
                </Label>
              </div>
              {notSaved && <p className="text-xs text-amber-800">Waiting for your latest changes to finish saving…</p>}
              <Button size="sm" className="self-start" disabled={!confirmed || notSaved} onClick={() => restore(step.file, step.snap)}>
                Add {step.plan.toAdd} missing {step.plan.toAdd === 1 ? "record" : "records"}
              </Button>
            </>
          )}
        </div>
      )}

      {step.kind === "restoring" && (
        <div aria-live="polite">
          <Progress value={(step.done / Math.max(1, step.total)) * 100} aria-label="Restore progress" />
          <p className="mt-1 text-xs text-muted-foreground">
            Restoring {step.label}… {step.done} of {step.total}
          </p>
        </div>
      )}

      {step.kind === "failed" && (
        <div role="alert" className="flex flex-col gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <p className="font-semibold">The restore stopped: {step.message}</p>
          <p>Anything already added is safe, and nothing else was changed. Trying again compares with your account first and only adds what’s still missing.</p>
          <Button size="sm" variant="outline" className="gap-1.5 self-start bg-white" onClick={() => compare(step.file, step.snap)}>
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </div>
      )}

      {step.kind === "done" && (
        <div role="status" className={step.verify.ok ? "rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900" : "rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900"}>
          {step.verify.ok ? (
            <p className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="size-3.5" /> Restore complete and checked — {step.added} {step.added === 1 ? "record" : "records"} added.
            </p>
          ) : (
            <>
              <p className="font-semibold">Restore finished, but the check found gaps.</p>
              {step.verify.skipped.length > 0 && (
                <p>
                  {step.verify.skipped.length} {step.verify.skipped.length === 1 ? "record couldn’t" : "records couldn’t"} be added (
                  {[...new Set(step.verify.skipped.map((s) => TABLE_LABELS[s.table]))].join(", ")}): {step.verify.skipped[0].reason}
                </p>
              )}
              {step.verify.missing.length > 0 && <p>{step.verify.missing.length} records weren’t found in your account afterwards.</p>}
              {step.verify.brokenLinks > 0 && <p>{step.verify.brokenLinks} restored tasks have different links than in the backup.</p>}
              <p>Nothing in your account was overwritten. Keep the backup file.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RestoreTable({ plan }: { plan: RestorePlan }) {
  const rows = plan.rows.filter((r) => r.inBackup > 0 && r.table !== "sprint_session_tasks");
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" aria-label="Restore preview">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-3 font-semibold">Record type</th>
            <th className="py-1 pr-3 text-right font-semibold">In backup</th>
            <th className="py-1 pr-3 text-right font-semibold">Already in account</th>
            <th className="py-1 text-right font-semibold">Will be added</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.table} className="border-t">
              <td className="py-1 pr-3">{TABLE_LABELS[r.table]}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{r.inBackup}</td>
              <td className="py-1 pr-3 text-right tabular-nums">
                {r.sameId + r.sameDay}
                {r.sameDay > 0 && <span className="text-amber-700"> ({r.sameDay} same day or week)</span>}
              </td>
              <td className="py-1 text-right font-semibold tabular-nums">{r.toAdd}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-muted-foreground">
        “Already in account” keeps the account’s version, even if the backup’s copy is different — including a day or week that already has its Highlight,
        Kaizen Log or Weekly Review.
      </p>
    </div>
  );
}
