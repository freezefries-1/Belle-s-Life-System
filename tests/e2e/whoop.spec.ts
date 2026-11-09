import { dbAs, expect, newEmail, open, saved, signUp, test, todayKey } from "./fixtures";

/** Recovery & sleep: add today from the Today page, edit it, add a past day, see averages, delete with Undo — checked in the database. */
test("recovery & sleep: add today on the Today page, edit, a past day, averages, delete with Undo", async ({ page }) => {
  const email = newEmail("whoop");
  await signUp(page, email);
  const db = await dbAs(email);
  const today = todayKey();
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA");

  // Today page: nothing yet → add today's numbers.
  await open(page, "/");
  const card = page.getByRole("region", { name: "Recovery & sleep" });
  await card.getByRole("button", { name: "Add today’s WHOOP" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Recovery %").fill("140");
  await expect(dialog.getByRole("alert")).toHaveText("Enter whole numbers from 0 to 100.");
  await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
  await dialog.getByLabel("Recovery %").fill("72");
  await expect(dialog.getByText("Green", { exact: true })).toBeVisible();
  await dialog.getByLabel("Sleep %").fill("88");
  await dialog.getByRole("button", { name: "Save" }).click();
  await saved(page);
  expect((await db.from("whoop_days").select("id, day, recovery, sleep")).data).toEqual([{ id: today, day: today, recovery: 72, sleep: 88 }]);
  await expect(card.getByText("72%")).toBeVisible();
  await expect(card.getByText("88%")).toBeVisible();

  // Edit today: recovery drops to yellow, sleep left blank.
  await card.getByRole("button", { name: "Edit today’s recovery and sleep" }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Recovery %")).toHaveValue("72");
  await dialog.getByLabel("Recovery %").fill("45");
  await dialog.getByLabel("Sleep %").fill("");
  await dialog.getByRole("button", { name: "Save" }).click();
  await saved(page);
  expect((await db.from("whoop_days").select("recovery, sleep").eq("id", today).single()).data).toEqual({ recovery: 45, sleep: null });

  // The Recovery & Sleep page: add yesterday, see the averages and colours.
  await open(page, "/recovery");
  await page.getByRole("button", { name: "Add a day" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Date").fill(yesterday);
  await dialog.getByLabel("Recovery %").fill("25");
  await dialog.getByLabel("Sleep %").fill("70");
  await dialog.getByRole("button", { name: "Save" }).click();
  await saved(page);
  expect((await db.from("whoop_days").select("id")).data).toHaveLength(2);
  // Recovery average (45 + 25) / 2 = 35; sleep only from yesterday = 70.
  await expect(page.getByText("Recovery, last 7 days").locator("..").locator("..").getByText("35%")).toBeVisible();
  await expect(page.getByText("Sleep, last 7 days").locator("..").locator("..").getByText("70%")).toBeVisible();
  const colours = page.getByRole("list", { name: "Days in each colour" });
  await expect(colours.getByRole("listitem").filter({ hasText: "Yellow" })).toContainText("1 day");
  await expect(colours.getByRole("listitem").filter({ hasText: "Red" })).toContainText("1 day");

  // Delete yesterday, then Undo.
  const days = page.getByRole("list", { name: "Recovery and sleep by day" });
  await expect(days.getByRole("listitem")).toHaveCount(2);
  await days.getByRole("button", { name: /^Actions for/ }).last().click();
  await page.getByRole("menuitem", { name: "Delete" }).press("Enter");
  await saved(page);
  expect((await db.from("whoop_days").select("id")).data).toEqual([{ id: today }]);
  await page.locator("[data-sonner-toast]").filter({ hasText: "Day deleted" }).getByRole("button", { name: "Undo" }).click();
  await saved(page);
  expect((await db.from("whoop_days").select("id")).data).toHaveLength(2);
});
