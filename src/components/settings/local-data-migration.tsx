"use client";

import * as React from "react";
import { CheckCircle2, CloudUpload, Download, HardDrive, Loader2, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAccount } from "@/lib/auth/account";
import {
  TABLE_LABELS,
  clearLegacyLocalData,
  countRows,
  downloadText,
  previewImport,
  readLocalSnapshot,
  readMarker,
  runImport,
  verifyImport,
  writeMarker,
  type ImportResult,
  type LocalSnapshot,
  type PreviewRow,
  type VerifyResult,
} from "@/lib/repositories/local-migration";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { TABLE_ORDER } from "@/types/database";

type Step =
  | { kind: "review" }
  | { kind: "previewing" }
  | { kind: "preview"; preview: PreviewRow[] }
  | { kind: "importing"; done: number; total: number; label: string; preview: PreviewRow[] }
  | { kind: "done"; preview: PreviewRow[]; result: ImportResult; verify: VerifyResult }
  | { kind: "failed"; message: string; preview: PreviewRow[] | null };

/**
 * Move data saved in this browser (before cloud sync) into the account.
 * 1. Review what's here and download a backup. 2. Preview against the cloud.
 * 3. Confirm and import (insert-only, retryable). 4. Verify. The local copy
 * stays until you choose to clear it.
 */
export function LocalDataMigration() {
  const ctx = useAccount();
  // Only rendered in the browser (inside the loaded workspace), so reading localStorage here is safe.
  const [snapshot, setSnapshot] = React.useState(() => readLocalSnapshot());
  const [step, setStep] = React.useState<Step>({ kind: "review" });
  const [confirmed, setConfirmed] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [backedUp, setBackedUp] = React.useState(false);
  const [marker, setMarker] = React.useState(() => readMarker());

  if (!ctx) return null;
  if (snapshot === null) {
    return (
      <Row icon={HardDrive} title="No browser-only data here" body="Nothing from before cloud sync is saved in this browser, so there’s nothing to move." />
    );
  }
  if ("error" in snapshot) {
    return <Row icon={TriangleAlert} title="Browser data can’t be read" body={snapshot.error} />;
  }
  const snap: LocalSnapshot = snapshot;
  const counts = countRows(snap.rows);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const alreadyMigrated = marker?.userId === ctx.account.id;
  const client = getSupabaseBrowserClient();

  const backup = () => {
    downloadText(`belles-life-system-browser-backup-${new Date().toISOString().slice(0, 10)}.json`, snap.raw);
    setBackedUp(true);
    toast("Backup downloaded");
  };

  const loadPreview = async () => {
    setStep({ kind: "previewing" });
    try {
      setStep({ kind: "preview", preview: await previewImport(client, snap.rows) });
    } catch (e) {
      setStep({ kind: "failed", message: (e as Error).message, preview: null });
    }
  };

  const doImport = async (preview: PreviewRow[]) => {
    setStep({ kind: "importing", done: 0, total, label: "", preview });
    try {
      const result = await runImport(client, ctx.account.id, snap.rows, (done, all, table) =>
        setStep({ kind: "importing", done, total: all, label: TABLE_LABELS[table], preview }),
      );
      const verify = await verifyImport(client, snap.rows, preview, result);
      const imported = TABLE_ORDER.reduce((n, t) => n + result[t].inserted + result[t].filled, 0);
      if (verify.ok) {
        const m = { userId: ctx.account.id, completedAt: new Date().toISOString(), imported };
        writeMarker(m);
        setMarker(m);
      }
      setStep({ kind: "done", preview, result, verify });
      await ctx.engine.refreshAll().catch(() => {});
    } catch (e) {
      setStep({ kind: "failed", message: (e as Error).message, preview });
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border px-3.5 py-3" data-testid="local-migration">
      <div className="flex items-start gap-3">
        <CloudUpload className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Move this browser’s data into your account</p>
          <p className="text-xs text-muted-foreground">
            Found {total} records saved in this browser (format v{snap.schemaVersion}
            {snap.savedAt ? `, last saved ${new Date(snap.savedAt).toLocaleString()}` : ""}). Nothing is changed until you confirm, and the browser copy is kept.
            {alreadyMigrated && " You’ve already imported this into this account — running it again only adds anything missing."}
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={backup}>
          <Download className="size-3.5" />
          Backup
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3" aria-label="Records found in this browser">
        {TABLE_ORDER.filter((t) => counts[t] > 0 && t !== "sprint_session_tasks").map((t) => (
          <div key={t} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{TABLE_LABELS[t]}</dt>
            <dd className="font-semibold tabular-nums">{counts[t]}</dd>
          </div>
        ))}
      </dl>
      {(snap.invalid > 0 || snap.missingReferences.length > 0) && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {snap.invalid > 0 && <p>{snap.invalid} unreadable {snap.invalid === 1 ? "record" : "records"} will be skipped (they stay in the backup).</p>}
          {snap.missingReferences.map((m) => (
            <p key={m.label}>
              {m.count} × missing link: {m.label}
            </p>
          ))}
        </div>
      )}

      {step.kind === "review" && (
        <Button size="sm" className="self-start" onClick={loadPreview}>
          Preview import
        </Button>
      )}
      {step.kind === "previewing" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Comparing with your account…
        </p>
      )}

      {(step.kind === "preview" || step.kind === "importing" || step.kind === "done" || (step.kind === "failed" && step.preview)) && (
        <PreviewTable preview={step.kind === "failed" ? step.preview! : step.preview} result={step.kind === "done" ? step.result : null} />
      )}

      {step.kind === "preview" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <Checkbox id="confirm-import" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
            <Label htmlFor="confirm-import" className="text-xs leading-snug font-normal">
              Import {step.preview.reduce((n, p) => n + p.toImport, 0)} new records into {ctx.account.email}. Records already in the account are kept as they are —
              nothing will be overwritten or deleted.
            </Label>
          </div>
          <Button size="sm" className="self-start" disabled={!confirmed} onClick={() => doImport(step.preview)}>
            Import into my account
          </Button>
        </div>
      )}

      {step.kind === "importing" && (
        <div aria-live="polite">
          <Progress value={(step.done / Math.max(1, step.total)) * 100} aria-label="Import progress" />
          <p className="mt-1 text-xs text-muted-foreground">
            Importing {step.label}… {step.done} of {step.total}
          </p>
        </div>
      )}

      {step.kind === "failed" && (
        <div role="alert" className="flex flex-col gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <p className="font-semibold">The import stopped: {step.message}</p>
          <p>Anything already imported is safe. Retrying continues where it left off without creating duplicates.</p>
          <Button size="sm" variant="outline" className="gap-1.5 self-start bg-white" onClick={() => (step.preview ? doImport(step.preview) : loadPreview())}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      )}

      {step.kind === "done" && (
        <div role="status" className={step.verify.ok ? "rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900" : "rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900"}>
          {step.verify.ok ? (
            <p className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="size-3.5" /> Import complete and verified — every record and link is in your account.
            </p>
          ) : (
            <>
              <p className="font-semibold">Import finished, but verification found gaps.</p>
              {step.verify.skipped.length > 0 && (
                <p>
                  {step.verify.skipped.length} {step.verify.skipped.length === 1 ? "record was" : "records were"} skipped (for example, a link to something
                  that wasn’t imported): {step.verify.skipped.slice(0, 3).map((s) => TABLE_LABELS[s.table]).join(", ")}
                  {step.verify.skipped.length > 3 ? "…" : ""}. They’re still in your browser and in the backup.
                </p>
              )}
              {step.verify.missing.length > 0 && <p>{step.verify.missing.length} records weren’t found in the cloud.</p>}
              {step.verify.brokenLinks > 0 && <p>{step.verify.brokenLinks} tasks have different links in the cloud.</p>}
              <p>Your browser copy is untouched — keep it, and the backup, until this is sorted out.</p>
            </>
          )}
        </div>
      )}

      {((alreadyMigrated && step.kind !== "done") || (step.kind === "done" && step.verify.ok)) && (
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">Checked everything in the app? You can remove the old browser copy.</p>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-rose-600" onClick={() => setClearing(true)}>
            <Trash2 className="size-3.5" />
            Clear browser copy
          </Button>
        </div>
      )}

      <Dialog open={clearing} onOpenChange={setClearing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clear the browser copy?</DialogTitle>
            <DialogDescription>
              This removes the old, pre-sync data (and its local backups) from this browser only. Your account isn’t affected. Download the backup first —
              clearing is only possible after that.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={backup} className="gap-1.5">
              <Download className="size-3.5" />
              Download backup
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={!backedUp}
              title={backedUp ? undefined : "Download the backup first"}
              onClick={() => {
                clearLegacyLocalData();
                setClearing(false);
                setSnapshot(null);
                toast("Browser copy cleared");
              }}
            >
              Clear browser copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreviewTable({ preview, result }: { preview: PreviewRow[]; result: ImportResult | null }) {
  const rows = preview.filter((p) => p.local > 0 || p.cloudTotal > 0).filter((p) => p.table !== "sprint_session_tasks");
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" aria-label="Import preview">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-3 font-semibold">Record type</th>
            <th className="py-1 pr-3 text-right font-semibold">In browser</th>
            <th className="py-1 pr-3 text-right font-semibold">Already in account</th>
            <th className="py-1 pr-3 text-right font-semibold">To import</th>
            <th className="py-1 text-right font-semibold">{result ? "Imported" : "Account total"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.table} className="border-t">
              <td className="py-1 pr-3">{TABLE_LABELS[p.table]}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{p.local}</td>
              <td className="py-1 pr-3 text-right tabular-nums" title={p.sameDay ? `${p.sameDay} for a day that already has one` : undefined}>
                {p.sameId + p.sameDay}
                {p.sameDay > 0 && <span className="text-amber-700"> ({p.sameDay} same day)</span>}
              </td>
              <td className="py-1 pr-3 text-right font-semibold tabular-nums">{p.toImport}</td>
              <td className="py-1 text-right tabular-nums">
                {result ? result[p.table].inserted + result[p.table].filled : p.cloudTotal}
                {result && result[p.table].skipped.length > 0 && <span className="text-amber-700"> ({result[p.table].skipped.length} skipped)</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Possible duplicates (same record, or a second entry for a day that already has one) keep the account’s version. An empty Kaizen Log in the account is filled with your words.
      </p>
    </div>
  );
}

function Row({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border px-3.5 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="text-[13px]">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
