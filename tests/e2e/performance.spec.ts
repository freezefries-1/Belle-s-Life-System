import { dbAs, expect, newEmail, open, saved, signUp, test, todayKey } from "./fixtures";

/** Matches (with serve % worked out) and benchmark results, through the app and checked in the database. */
test("record matches and benchmark results; see the record, percentages and trend", async ({ page }) => {
  const email = newEmail("perf");
  await signUp(page, email);
  const db = await dbAs(email);
  const today = todayKey();

  await open(page, "/students");
  await page.getByRole("button", { name: "Add student" }).first().click();
  await page.getByRole("dialog").getByLabel("Name").fill("Ethan");
  await page.getByRole("dialog").getByRole("button", { name: "Add student" }).click();
  await page.waitForURL(/\/students\/.+/);
  const student = (await db.from("students").select("id").single()).data!;

  // A match with serve counts: the percentage is worked out in the form.
  const matches = page.locator('section[aria-labelledby="matches-heading"]');
  await matches.getByRole("button", { name: "Add match" }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Add match" })).toBeDisabled(); // no result yet
  await dialog.getByText("Win", { exact: true }).click();
  await dialog.getByLabel("Score").fill("6-4 3-6 10-7");
  await dialog.getByLabel("Event").fill("STA Junior Tour");
  await dialog.getByRole("button", { name: "Match stats (optional)" }).click();
  await dialog.locator("#match-firstIn").fill("32");
  await dialog.locator("#match-firstTotal").fill("50");
  await expect(dialog.getByText("64% in")).toBeVisible();
  await dialog.locator("#match-doubleFaults").fill("4");
  await dialog.getByRole("button", { name: "Add match" }).click();
  await saved(page);
  const saved1 = (await db.from("student_matches").select("played_on, result, score, event, kind, first_in, first_total, double_faults, unforced_errors").single()).data!;
  expect(saved1).toEqual({ played_on: today, result: "win", score: "6-4 3-6 10-7", event: "STA Junior Tour", kind: "tournament", first_in: 32, first_total: 50, double_faults: 4, unforced_errors: null });
  await expect(page.getByRole("list", { name: "Matches" }).getByText("1st serves 64% (32/50) · 4 double faults")).toBeVisible();

  // Impossible serve counts are caught before saving.
  await matches.getByRole("button", { name: "Add match" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByText("Loss", { exact: true }).click();
  await dialog.getByRole("button", { name: "Match stats (optional)" }).click();
  await dialog.locator("#match-firstIn").fill("40");
  await dialog.locator("#match-firstTotal").fill("30");
  await expect(dialog.getByRole("alert")).toHaveText("Serves in can't be more than serves hit.");
  await expect(dialog.getByRole("button", { name: "Add match" })).toBeDisabled();
  await dialog.locator("#match-firstIn").fill("20");
  await dialog.getByLabel("Score").fill("4-6 4-6");
  await dialog.getByRole("button", { name: "Add match" }).click();
  await saved(page);

  // The record and form; first-serve % across matches (52/80 = 65%).
  await expect(matches.getByText("1–1")).toBeVisible();
  await expect(matches.getByText("50%")).toBeVisible();
  await expect(matches.getByText("65%")).toBeVisible();
  await expect(page.getByRole("list", { name: "Wins and losses by month" })).toBeVisible();

  // Delete a match (with Undo).
  await page.getByRole("list", { name: "Matches" }).getByRole("button", { name: /Actions for the match/ }).first().click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await saved(page);
  expect((await db.from("student_matches").select("id")).data).toHaveLength(1);
  await page.locator("[data-sonner-toast]").filter({ hasText: "Match deleted" }).getByRole("button", { name: "Undo" }).click();
  await saved(page);
  expect((await db.from("student_matches").select("id")).data).toHaveLength(2);

  // Benchmarks: two results on a built-in test → latest, best, change and a chart.
  const benchmarks = page.locator('section[aria-labelledby="benchmarks-heading"]');
  await benchmarks.getByRole("button", { name: "Record result" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Test" }).click();
  await page.getByRole("option", { name: "First serves in" }).click();
  await dialog.getByLabel("Out of 10").fill("11");
  await expect(dialog.getByRole("alert")).toHaveText("Enter a whole number from 0 to 10.");
  await dialog.getByLabel("Out of 10").fill("4");
  await expect(dialog.getByText("40%")).toBeVisible();
  await dialog.getByLabel("Date").fill("2026-09-01");
  await dialog.getByRole("button", { name: "Record result" }).click();
  await saved(page);
  await benchmarks.getByRole("button", { name: "Record a result for First serves in" }).click();
  await page.getByRole("dialog").getByLabel("Out of 10").fill("7");
  await page.getByRole("dialog").getByRole("button", { name: "Record result" }).click();
  await saved(page);
  const card = benchmarks.getByRole("group", { name: "First serves in" });
  await expect(card.getByText("7/10 (70%)").first()).toBeVisible();
  await expect(card.getByText(/Up 30 points since/)).toBeVisible();
  await expect(card.getByRole("img", { name: /First serves in: 2 results/ })).toBeVisible();
  expect((await db.from("student_benchmarks").select("test, unit, value, measured_on").eq("student_id", student.id).order("measured_on")).data).toEqual([
    { test: "first_serves", unit: "out_of_10", value: 4, measured_on: "2026-09-01" },
    { test: "first_serves", unit: "out_of_10", value: 7, measured_on: today },
  ]);

  // Your own timed test, where lower is better.
  await benchmarks.getByRole("button", { name: "Record result" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Test" }).click();
  await page.getByRole("option", { name: "New test…" }).click();
  await dialog.getByLabel("Name of your test").fill("Spider drill");
  await dialog.getByText("Time (seconds)").click();
  await expect(dialog.getByRole("radio", { name: /Lower/ })).toBeChecked();
  await dialog.getByLabel("Seconds", { exact: true }).fill("19.4");
  await dialog.getByRole("button", { name: "Record result" }).click();
  await saved(page);
  expect((await db.from("student_benchmarks").select("test, name, unit, higher_is_better, value").eq("test", "custom:spider drill").single()).data).toEqual({
    test: "custom:spider drill",
    name: "Spider drill",
    unit: "seconds",
    higher_is_better: false,
    value: 19.4,
  });
  await expect(benchmarks.getByText("19.4 s").first()).toBeVisible();
});
