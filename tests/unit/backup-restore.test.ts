import { describe, expect, it } from "vitest";

import { createSampleData } from "@/data/sample-data";
import { planRestore, readBackupText } from "@/lib/repositories/backup-restore";
import { countRows, type LocalSnapshot } from "@/lib/repositories/local-migration";
import type { AppSupabaseClient } from "@/lib/supabase/client";
import { SCHEMA_VERSION, createEnvelope } from "@/lib/storage/schema";
import { TABLE_ORDER, type TableName } from "@/types/database";

const backupText = JSON.stringify(createEnvelope(createSampleData("2026-10-12")));
const backup = readBackupText(backupText) as LocalSnapshot;

/** An account holding these rows, answering the two read queries the preview makes. */
function fakeAccount(rows: Partial<Record<TableName, Record<string, unknown>[]>>) {
  return {
    from: (table: TableName) => ({
      select: () => ({
        in: async (col: string, values: unknown[]) => ({ data: (rows[table] ?? []).filter((r) => values.includes(r[col])), error: null }),
      }),
    }),
  } as unknown as AppSupabaseClient;
}

const plain = (m: Map<string, unknown>) => [...m.values()] as Record<string, unknown>[];

describe("restore: checking the file", () => {
  it("accepts a downloaded backup", () => {
    expect("error" in backup).toBe(false);
    expect(countRows(backup.rows).tasks).toBeGreaterThan(0);
  });

  it("refuses anything else, without changing anything", () => {
    expect(readBackupText("not json")).toHaveProperty("error");
    expect(readBackupText(JSON.stringify({ hello: "world" }))).toHaveProperty("error");
    expect(readBackupText(JSON.stringify([1, 2, 3]))).toHaveProperty("error");
    // A backup from a newer version of the app isn't guessed at.
    expect(readBackupText(JSON.stringify({ ...JSON.parse(backupText), schemaVersion: SCHEMA_VERSION + 1 }))).toHaveProperty("error");
  });
});

describe("restore: preview", () => {
  it("an empty account gets everything", async () => {
    const plan = await planRestore(fakeAccount({}), backup.rows);
    for (const t of TABLE_ORDER) expect(plan.send[t].size, t).toBe(backup.rows[t].size);
    expect(plan.toAdd).toBe(Object.values(countRows(backup.rows)).reduce((a, b) => a + b, 0));
  });

  it("an account that already has everything gets nothing (running it twice adds nothing)", async () => {
    const all = Object.fromEntries(TABLE_ORDER.map((t) => [t, plain(backup.rows[t])]));
    const plan = await planRestore(fakeAccount(all), backup.rows);
    expect(plan.toAdd).toBe(0);
  });

  it("records already in the account are never sent, even if the backup's copy differs", async () => {
    const [task] = plain(backup.rows.tasks);
    const plan = await planRestore(fakeAccount({ tasks: [{ ...task, title: "Edited since the backup" }] }), backup.rows);
    expect(plan.send.tasks.has(task.id as string)).toBe(false);
    expect(plan.rows.find((r) => r.table === "tasks")).toMatchObject({ sameId: 1, toAdd: backup.rows.tasks.size - 1 });
  });

  it("a day that already has a Kaizen Log or Highlight keeps the account's one", async () => {
    const [log] = plain(backup.rows.kaizen_logs);
    const [highlight] = plain(backup.rows.daily_highlights);
    const plan = await planRestore(
      fakeAccount({
        kaizen_logs: [{ id: "someone-else", date_key: log.date_key }],
        daily_highlights: [{ id: "other", date_key: highlight.date_key }],
      }),
      backup.rows,
    );
    expect(plan.send.kaizen_logs.has(log.id as string)).toBe(false);
    expect(plan.send.daily_highlights.has(highlight.id as string)).toBe(false);
    expect(plan.rows.find((r) => r.table === "kaizen_logs")?.sameDay).toBe(1);
  });

  it("a week that already has a review keeps it, with its own priorities", async () => {
    const [review] = plain(backup.rows.weekly_reviews);
    const priorities = plain(backup.rows.weekly_priorities).filter((p) => p.weekly_review_id === review.id);
    const plan = await planRestore(fakeAccount({ weekly_reviews: [{ id: "other", week_start_date: review.week_start_date }] }), backup.rows);
    expect(plan.send.weekly_reviews.has(review.id as string)).toBe(false);
    for (const p of priorities) expect(plan.send.weekly_priorities.has(p.id as string)).toBe(false);
  });
});
