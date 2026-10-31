import { dbAs, expect, newEmail, open, saved, signUp, test, todayKey } from "./fixtures";

/** Milestones on a student's stage, and editing the coaching ladder — checked in the database too. */
test("tick milestones, reword the ladder, reset, add a stage", async ({ page }) => {
  const email = newEmail("ladder");
  await signUp(page, email);
  const db = await dbAs(email);
  const today = todayKey();

  // A student at R5.
  await open(page, "/students");
  await page.getByRole("button", { name: "Add student" }).first().click();
  await page.getByRole("dialog").getByLabel("Name").fill("Daniel");
  await page.getByRole("dialog").getByRole("button", { name: "Add student" }).click();
  await page.waitForURL(/\/students\/.+/);
  const studentUrl = new URL(page.url()).pathname;
  const rally = page.locator('[aria-labelledby="track-rally"]').filter({ visible: true });
  await rally.getByRole("button", { name: "Set starting stage" }).click();
  await page.getByRole("dialog").getByText("R5 · Baseline steady").click();
  await page.getByRole("dialog").getByRole("button", { name: "Save stage" }).click();
  await saved(page);

  // Tick both milestones: saved with today's date, and the card says ready to move up.
  await expect(rally.getByText("0 of 2")).toBeVisible();
  await rally.getByLabel("20-ball rally from the baseline").check();
  await saved(page);
  await expect(rally.getByText("1 of 2")).toBeVisible();
  const student = (await db.from("students").select("id").single()).data!;
  expect((await db.from("student_checks").select("check_id, done_on, stage").eq("student_id", student.id)).data).toEqual([
    { check_id: "R5-1", done_on: today, stage: "R5" },
  ]);
  await rally.getByLabel("Half the balls land past the service line").check();
  await saved(page);
  await expect(rally.getByRole("status")).toHaveText("All milestones reached: ready to move up to R6.");

  // Untick one: it's removed.
  await rally.getByLabel("Half the balls land past the service line").uncheck();
  await saved(page);
  expect((await db.from("student_checks").select("check_id").eq("student_id", student.id)).data).toEqual([{ check_id: "R5-1" }]);

  // Reword R5 on the ladder: rename, reword a milestone, add one.
  await page.getByRole("link", { name: "All students" }).click();
  await page.getByRole("link", { name: "Coaching ladder" }).click();
  await expect(page).toHaveURL(/\/students\/ladder$/);
  await page.getByRole("button", { name: "Edit R5 Baseline steady" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Stage name").fill("Baseline solid");
  await dialog.getByLabel("Milestone 1", { exact: true }).fill("25-ball rally from the baseline");
  await dialog.getByRole("button", { name: "Add milestone" }).click();
  await expect(dialog.getByLabel("Milestone 3", { exact: true })).toBeFocused();
  await dialog.getByLabel("Milestone 3", { exact: true }).fill("Recovers to the centre mark");
  await dialog.getByRole("button", { name: "Save stage" }).click();
  await saved(page);
  const edit = (await db.from("ladder_stages").select("id, name, checks").single()).data!;
  expect(edit.id).toBe("rally:R5");
  expect(edit.name).toBe("Baseline solid");
  expect(edit.checks.map((c: { id: string; text: string }) => c.text)).toEqual([
    "25-ball rally from the baseline",
    "Half the balls land past the service line",
    "Recovers to the centre mark",
  ]);
  expect(edit.checks[0].id).toBe("R5-1");

  // The student keeps their tick under the new wording.
  await open(page, studentUrl);
  await expect(rally.getByText("R5 · Baseline solid")).toBeVisible();
  await expect(rally.getByLabel("25-ball rally from the baseline")).toBeChecked();
  await expect(rally.getByText("1 of 3")).toBeVisible();

  // Reset to the original wording, then Undo.
  await open(page, "/students/ladder");
  await page.getByRole("button", { name: "Edit R5 Baseline solid" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reset to original" }).click();
  await saved(page);
  await expect(page.getByRole("button", { name: "Edit R5 Baseline steady" })).toBeVisible();
  expect((await db.from("ladder_stages").select("id")).data).toHaveLength(0);
  await page.locator("[data-sonner-toast]").filter({ hasText: "R5 reset" }).getByRole("button", { name: "Undo" }).click();
  await saved(page);
  await expect(page.getByRole("button", { name: "Edit R5 Baseline solid" })).toBeVisible();

  // Add R10 to Rally; once a student reaches it, it can't be deleted.
  await page.locator('section[aria-labelledby="ladder-rally"]').getByRole("button", { name: "Add stage" }).click();
  await page.getByRole("dialog").getByLabel("Stage name").fill("Tournament ready");
  await page.getByRole("dialog").getByLabel("Milestone 1", { exact: true }).fill("Plays a full match plan");
  await page.getByRole("dialog").getByRole("button", { name: "Add stage" }).click();
  await saved(page);
  await expect(page.getByRole("button", { name: "Edit R10 Tournament ready" })).toBeVisible();
  expect((await db.from("ladder_stages").select("stage").eq("stage", "R10")).data).toHaveLength(1);

  await open(page, studentUrl);
  await rally.getByRole("button", { name: "Choose stage…" }).click();
  await page.getByRole("dialog").getByText("R10 · Tournament ready").click();
  await page.getByRole("dialog").getByRole("button", { name: "Save stage" }).click();
  await saved(page);
  await expect(rally.getByText("R10 · Tournament ready")).toBeVisible();
  await expect(rally.getByText("Top of the Rally track")).toBeVisible();

  await open(page, "/students/ladder");
  await page.getByRole("button", { name: "Edit R10 Tournament ready" }).click();
  await expect(page.getByRole("dialog").getByText("A student has reached this stage, so it can't be deleted.")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Delete this stage" })).toHaveCount(0);
});
