import type { AppSupabaseClient } from "@/lib/supabase/client";
import { TABLE_ORDER, type AnyRow, type TableName } from "@/types/database";

import { DATE_KEYS, existingIds, snapshotFromText, verifyImport, type ImportResult, type LocalSnapshot, type VerifyResult } from "./local-migration";
import { emptyRowSet, type RowSet } from "./mappers";

/**
 * Restoring a downloaded backup file into the signed-in account.
 *
 * Add-only: a record whose id is already in the account is left exactly as
 * it is (even if the backup's copy differs), and so is a day or week that
 * already has its Highlight, Kaizen Log or Weekly Review. Only the records
 * that are missing are sent, through the same insert-only import as the
 * browser-data move, so running it again adds nothing and nothing is ever
 * deleted.
 */

/** Generous: a year of heavy use is a few MB. */
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export function readBackupText(text: string): LocalSnapshot | { error: string } {
  return snapshotFromText(text, {
    notJson: "This file isn’t a belle’s life system backup (it isn’t readable JSON). Nothing was changed.",
    unknown:
      "This file isn’t a belle’s life system backup, or it’s from a newer version of the app. Nothing was changed.",
  });
}

export interface RestoreRow {
  table: TableName;
  inBackup: number;
  /** Same record already in the account: the account's copy is kept. */
  sameId: number;
  /** A different record for a day or week the account already has (kept from the account). */
  sameDay: number;
  toAdd: number;
}

export interface RestorePlan {
  rows: RestoreRow[];
  /** Only the records that are missing from the account. */
  send: RowSet;
  toAdd: number;
}

/** Compare the backup with the account. Read-only. */
export async function planRestore(client: AppSupabaseClient, backup: RowSet): Promise<RestorePlan> {
  const send = emptyRowSet();
  const rows: RestoreRow[] = [];
  let keptReviews = new Set<string>();

  for (const table of TABLE_ORDER) {
    const list = [...backup[table].values()] as AnyRow[];
    const present = await existingIds(client, table, list.map((r) => r.id));
    const sameDay = new Set<string>();
    const dateCol = DATE_KEYS[table];
    const missing = list.filter((r) => !present.has(r.id));
    if (dateCol && missing.length) {
      const value = (r: AnyRow) => (r as unknown as Record<string, string>)[dateCol];
      const { data, error } = await client.from(table).select(`id, ${dateCol}`).in(dateCol, [...new Set(missing.map(value))]);
      if (error) throw new Error(error.message);
      const taken = new Set((data as unknown as Record<string, string>[]).map((r) => r[dateCol]));
      for (const r of missing) if (taken.has(value(r))) sameDay.add(r.id);
    }
    // Priorities of a week whose review is kept from the account stay with the backup's review.
    if (table === "weekly_priorities")
      for (const r of missing) if (keptReviews.has((r as unknown as { weekly_review_id: string }).weekly_review_id)) sameDay.add(r.id);
    if (table === "weekly_reviews") keptReviews = sameDay;

    for (const r of missing) if (!sameDay.has(r.id)) send[table].set(r.id, r as never);
    rows.push({ table, inBackup: list.length, sameId: present.size, sameDay: sameDay.size, toAdd: send[table].size });
  }
  return { rows, send, toAdd: rows.reduce((n, r) => n + r.toAdd, 0) };
}

/** Every record that was sent is now in the account, with its links, and nothing was skipped. */
export function verifyRestore(client: AppSupabaseClient, plan: RestorePlan, result: ImportResult): Promise<VerifyResult> {
  return verifyImport(client, plan.send, [], result);
}
