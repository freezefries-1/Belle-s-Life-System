import { dbAs, expect, newEmail, open, saved, signUp, test, todayKey } from "./fixtures";

/** My Pickleball: set up, DUPR history, a doubles match with partner, KAP and point-loss tallies, focus next — checked in the database too. */
test("my pickleball: set up, DUPR, doubles with partner and KAP, focus next", async ({ page }) => {
  const email = newEmail("pickle");
  await signUp(page, email);
  const db = await dbAs(email);
  const today = todayKey();

  // Set up with a starting doubles DUPR (singles left blank).
  await open(page, "/pickleball");
  await page.getByLabel("DUPR doubles").fill("10");
  await expect(page.getByRole("alert").filter({ hasText: "DUPR ratings are between 1 and 9" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start tracking" })).toBeDisabled();
  await page.getByLabel("DUPR doubles").fill("4.1");
  await page.getByRole("button", { name: "Start tracking" }).click();
  await saved(page);
  const me = (await db.from("students").select("id, name, sport, is_self").single()).data!;
  expect(me).toMatchObject({ sport: "pickleball", is_self: true });
  expect((await db.from("student_ratings").select("kind, rating, rated_on").eq("student_id", me.id)).data).toEqual([{ kind: "doubles", rating: 4.1, rated_on: today }]);
  const doubles = page.getByRole("group", { name: "DUPR doubles" });
  await expect(doubles.getByText("4.10", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Focus next: towards 4.5" })).toBeVisible();

  // Your own profile is not in the Students list.
  await open(page, "/students");
  await expect(page.locator("main").getByText("No students yet").filter({ visible: true })).toBeVisible();

  // A newer doubles rating, with three decimals.
  await open(page, "/pickleball");
  await page.getByRole("button", { name: "Add a doubles rating" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("DUPR").fill("4.123");
  await dialog.getByLabel("Note (optional)").fill("after league night");
  await dialog.getByRole("button", { name: "Add rating" }).click();
  await saved(page);
  await expect(doubles.getByText("4.123", { exact: true }).first()).toBeVisible();
  await expect(doubles.getByText(/\+0\.023/)).toBeVisible();
  expect((await db.from("student_ratings").select("rating").eq("kind", "doubles")).data).toHaveLength(2);

  // A doubles match with a partner, KAP tallies and how points were lost.
  const matches = page.locator('section[aria-labelledby="matches-heading"]').filter({ visible: true });
  await matches.getByRole("button", { name: "Add match" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByText("Loss", { exact: true }).click();
  await dialog.getByLabel("Score").fill("9-11 11-8 8-11");
  await dialog.getByLabel("Partner").fill("Jess");
  await dialog.getByLabel("DUPR rated").check();
  await dialog.getByLabel("Opponents (optional)").fill("Sam & Lee");
  await dialog.getByRole("button", { name: "Kitchen arrival — KAP (optional)" }).click();
  await dialog.locator("#kap-drop_ok").fill("2");
  await dialog.locator("#kap-drop_miss").fill("2");
  await expect(dialog.getByText("50% arrived")).toBeVisible();
  await dialog.locator("#kap-drive_ok").fill("1");
  await dialog.locator("#kap-drive_miss").fill("2");
  await dialog.locator("#kap-third_err").fill("1");
  await expect(dialog.getByText("KAP 43% (3 of 7 thirds) · 3rd-shot errors 14%")).toBeVisible();
  await dialog.getByRole("button", { name: "How points were lost (optional)" }).click();
  await dialog.locator("#loss-reset").fill("4");
  await dialog.locator("#loss-speedup").fill("2");
  await dialog.getByLabel("Notes and insights").fill("Jess likes to poach; I cover the middle");
  await dialog.getByRole("button", { name: "Add match" }).click();
  await saved(page);
  const m = (await db.from("student_matches").select("format, partner, rated, result, opponent, kap_stats, point_losses").single()).data!;
  expect(m).toEqual({
    format: "doubles",
    partner: "Jess",
    rated: true,
    result: "loss",
    opponent: "Sam & Lee",
    kap_stats: { drop_ok: 2, drop_miss: 2, drive_ok: 1, drive_miss: 2, third_err: 1 },
    point_losses: { reset: 4, speedup: 2 },
  });

  // A second doubles match with the same partner (typed differently) → one partner row.
  await matches.getByRole("button", { name: "Add match" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByText("Win", { exact: true }).click();
  await dialog.getByLabel("Score").fill("11-6");
  await dialog.getByLabel("Partner").fill(" jess ");
  await dialog.getByRole("button", { name: "Add match" }).click();
  await saved(page);
  const partners = page.getByRole("table", { name: /partner/i }).filter({ visible: true });
  await expect(partners.getByRole("row")).toHaveCount(2); // header + Jess
  await expect(partners.getByText("1–1")).toBeVisible();
  const kap = page.getByRole("group", { name: "Kitchen arrival (KAP)" });
  await expect(kap.getByText("43%", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Matches" }).filter({ visible: true }).getByText("with Jess").first()).toBeVisible();

  // Focus next: record a benchmark below target and it becomes the top item.
  await page.getByRole("button", { name: "Resets from mid-court against drives" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Out of 10").fill("3");
  await dialog.getByRole("button", { name: "Record result" }).click();
  await saved(page);
  await expect(page.getByText("1. Resets from mid-court against drives")).toBeVisible();
  await expect(page.getByText(/Targets: 4\.5 → 6\/10/).first()).toBeVisible();

  // Delete a rating, then Undo.
  await doubles.getByText("All doubles ratings (2)").click();
  await doubles.getByRole("button", { name: /Actions for doubles rating/ }).first().click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await saved(page);
  expect((await db.from("student_ratings").select("id")).data).toHaveLength(1);
  await page.locator("[data-sonner-toast]").filter({ hasText: "Rating deleted" }).getByRole("button", { name: "Undo" }).click();
  await saved(page);
  expect((await db.from("student_ratings").select("id")).data).toHaveLength(2);

  // Your own ladder page.
  await open(page, "/pickleball/ladder");
  await expect(page.getByRole("heading", { name: "My pickleball ladder" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kitchen (dinks)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rally" })).toHaveCount(0);
});
