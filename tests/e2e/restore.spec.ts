import { readFileSync, writeFileSync } from "node:fs";

import { dbAs, expect, newEmail, open, saved, signUp, test } from "./fixtures";

/**
 * Settings → Data → Restore from a backup file, against the local test stack:
 * only missing records are added, nothing in the account is overwritten, it's
 * safe to run twice, other files are refused, and accounts stay separate.
 */
test("restore a backup: adds only what's missing, never overwrites, safe to repeat", async ({ page }, info) => {
  const email = newEmail("restore");
  await signUp(page, email);
  const db = await dbAs(email);

  // A sample week, saved to the account, then downloaded as a backup.
  await open(page, "/settings");
  await page.getByRole("button", { name: "Load sample" }).click();
  await saved(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download" }).click()]);
  const file = info.outputPath("backup.json");
  await download.saveAs(file);
  const before = (await db.from("tasks").select("id")).data!.length;

  // After the backup: one task is deleted, another is edited, a Kaizen Log is deleted.
  // Two open, one-off tasks, so both show in the Tasks list's default view.
  const [gone, edited] = (await db.from("tasks").select("id, title").eq("status", "todo").is("recurrence_template_id", null).order("id").limit(2)).data!;
  await db.from("tasks").delete().eq("id", gone.id);
  await db.from("tasks").update({ title: "Edited after the backup" }).eq("id", edited.id);
  const log = (await db.from("kaizen_logs").select("id").limit(1).single()).data!;
  await db.from("kaizen_logs").delete().eq("id", log.id);
  expect((await db.from("tasks").select("id")).data).toHaveLength(before - 1);

  await open(page, "/settings");
  const restore = page.getByTestId("backup-restore");

  // A file that isn't a backup is refused.
  const bad = info.outputPath("notes.json");
  writeFileSync(bad, JSON.stringify({ shopping: ["milk"] }));
  await restore.locator('input[type="file"]').setInputFiles(bad);
  await expect(restore.getByRole("alert")).toContainText("isn’t a belle’s life system backup");

  // The preview: 2 missing records, nothing changed yet.
  await restore.locator('input[type="file"]').setInputFiles(file);
  const preview = restore.getByRole("table", { name: "Restore preview" });
  await expect(preview.getByRole("row", { name: /^Tasks/ }).getByRole("cell").last()).toHaveText("1");
  await expect(preview.getByRole("row", { name: /^Kaizen Logs/ }).getByRole("cell").last()).toHaveText("1");
  const add = restore.getByRole("button", { name: "Add 2 missing records" });
  await expect(add).toBeDisabled();
  expect((await db.from("tasks").select("id")).data).toHaveLength(before - 1);

  // Confirm and restore.
  await restore.getByLabel(/Add 2 missing records to/).check();
  await add.click();
  await expect(restore.getByRole("status")).toContainText("Restore complete and checked — 2 records added");
  expect((await db.from("tasks").select("id")).data).toHaveLength(before);
  expect((await db.from("tasks").select("id").eq("id", gone.id)).data).toHaveLength(1);
  expect((await db.from("kaizen_logs").select("id").eq("id", log.id)).data).toHaveLength(1);
  // The record edited after the backup kept its newer version.
  expect((await db.from("tasks").select("title").eq("id", edited.id).single()).data?.title).toBe("Edited after the backup");
  // …and the app shows the restored task without reloading.
  await open(page, "/tasks");
  await expect(page.getByText("Edited after the backup")).toBeVisible();
  await expect(page.getByText(gone.title, { exact: true })).toBeVisible();

  // Running it again adds nothing.
  await open(page, "/settings");
  await page.getByTestId("backup-restore").locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByTestId("backup-restore").getByRole("status")).toContainText("Everything in this backup is already in your account");
  expect((await db.from("tasks").select("id")).data).toHaveLength(before);

  // Restoring the same file into a different account gives it its own copy; the first account is untouched.
  const other = await page.context().browser()!.newContext();
  const p2 = await other.newPage();
  const email2 = newEmail("restore-b");
  await signUp(p2, email2);
  await open(p2, "/settings");
  await p2.getByTestId("backup-restore").locator('input[type="file"]').setInputFiles(file);
  const total = JSON.parse(readFileSync(file, "utf8")).data.tasks.length;
  await expect(p2.getByRole("table", { name: "Restore preview" }).getByRole("row", { name: /^Tasks/ }).getByRole("cell").last()).toHaveText(String(total));
  await p2.getByTestId("backup-restore").getByRole("checkbox").check();
  await p2.getByTestId("backup-restore").getByRole("button", { name: /^Add \d+ missing records$/ }).click();
  await expect(p2.getByTestId("backup-restore").getByRole("status")).toContainText("Restore complete and checked");
  const db2 = await dbAs(email2);
  expect((await db2.from("tasks").select("id")).data).toHaveLength(total);
  expect((await db.from("tasks").select("title").eq("id", edited.id).single()).data?.title).toBe("Edited after the backup");
  expect((await db.from("tasks").select("id")).data).toHaveLength(before);
  await other.close();
});
