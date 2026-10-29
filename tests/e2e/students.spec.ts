import { dbAs, expect, newEmail, open, saved, signIn, signUp, test, todayKey } from "./fixtures";

/** Students: add, stages on each track, lesson notes, history, Undo and delete — checked in the database too. */
test("track a student: add, set stages, move up, lesson notes, history, delete", async ({ page, browser }) => {
  const email = newEmail("students");
  await signUp(page, email);
  const db = await dbAs(email);
  const today = todayKey();

  // Add a junior on an orange ball.
  await open(page, "/students");
  await page.getByRole("button", { name: "Add student" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Mia");
  await dialog.getByText("Junior", { exact: true }).click();
  await dialog.getByText("Orange ball").click();
  await dialog.getByText("Right-handed").click();
  await dialog.getByLabel("Goals").fill("Rally from the baseline");
  await dialog.getByRole("button", { name: "Add student" }).click();
  await page.waitForURL(/\/students\/.+/);
  await saved(page);
  const student = (await db.from("students").select("id, name, player_group, ball, hand, goals").single()).data!;
  expect(student).toMatchObject({ name: "Mia", player_group: "junior", ball: "orange", hand: "right", goals: "Rally from the baseline" });
  await expect(page.locator("main").getByText("Not assessed").filter({ visible: true })).toBeVisible();

  // Set a starting stage on Rally, then move up with one tap.
  const rally = page.locator('[aria-labelledby="track-rally"]').filter({ visible: true });
  await rally.getByRole("button", { name: "Set starting stage" }).click();
  await page.getByRole("dialog").getByText("R2 · Short court").click();
  await page.getByRole("dialog").getByLabel("Note (optional)").fill("10-ball rally");
  await page.getByRole("dialog").getByRole("button", { name: "Save stage" }).click();
  await saved(page);
  await expect(rally.getByText("R2 · Short court")).toBeVisible();
  await expect(page.locator("main").getByText("Beginner", { exact: true }).filter({ visible: true })).toBeVisible();

  await rally.getByRole("button", { name: "Moved up to R3" }).click();
  await saved(page);
  await expect(rally.getByText("R3 · Reading the bounce")).toBeVisible();
  const stages = (await db.from("student_stages").select("track, stage, reached_on, note").eq("student_id", student.id).order("stage")).data!;
  expect(stages).toEqual([
    { track: "rally", stage: "R2", reached_on: today, note: "10-ball rally" },
    { track: "rally", stage: "R3", reached_on: today, note: "" },
  ]);

  // Undo the move up.
  await rally.getByRole("button", { name: "Moved up to R4" }).click();
  await page.locator("[data-sonner-toast]").filter({ hasText: "R4" }).getByRole("button", { name: "Undo" }).click();
  await saved(page);
  await expect(rally.getByText("R3 · Reading the bounce")).toBeVisible();
  expect((await db.from("student_stages").select("stage").eq("student_id", student.id)).data).toHaveLength(2);

  // Serve track.
  const serve = page.locator('[aria-labelledby="track-serve"]').filter({ visible: true });
  await serve.getByRole("button", { name: "Set starting stage" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save stage" }).click();
  await saved(page);
  await expect(serve.getByText("S1 · Toss and motion")).toBeVisible();

  // Lesson note.
  await page.getByRole("button", { name: "Lesson note" }).click();
  await page.getByRole("dialog").getByLabel("Worked on").fill("Short court, reading the bounce");
  await page.getByRole("dialog").getByLabel("Went well").fill("Moved her feet on the forehand");
  await page.getByRole("dialog").getByLabel("Work on next").fill("Turn the shoulders on the backhand");
  await page.getByRole("dialog").getByRole("button", { name: "Add note" }).click();
  await saved(page);
  await expect(page.getByRole("list", { name: "Lesson notes" }).getByText("Short court, reading the bounce")).toBeVisible();
  const lesson = (await db.from("student_lessons").select("lesson_date, focus, went_well, work_on").eq("student_id", student.id).single()).data!;
  expect(lesson).toEqual({ lesson_date: today, focus: "Short court, reading the bounce", went_well: "Moved her feet on the forehand", work_on: "Turn the shoulders on the backhand" });

  // History shows every stage; removing the latest steps back.
  const history = page.getByRole("list", { name: "Progress history" });
  await expect(history.getByRole("listitem")).toHaveCount(3);
  await history.getByRole("button", { name: /Actions for R3/ }).click();
  await page.getByRole("menuitem", { name: "Remove entry" }).click();
  await saved(page);
  await expect(rally.getByText("R2 · Short court")).toBeVisible();

  // The list shows the card with level and stages; another device sees the same.
  await open(page, "/students");
  await expect(page.getByRole("list", { name: "Students" }).getByText("R2 · S1")).toBeVisible();
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await signIn(p2, email);
  await open(p2, `/students/${student.id}`);
  await expect(p2.locator('[aria-labelledby="track-rally"]').getByText("R2 · Short court")).toBeVisible();
  await expect(p2.getByRole("list", { name: "Lesson notes" }).getByText("Short court, reading the bounce")).toBeVisible();
  await other.close();

  // Delete (with Undo), then delete for real: stages and notes go too.
  await open(page, `/students/${student.id}`);
  await page.getByRole("button", { name: "More actions for Mia" }).click();
  await page.getByRole("menuitem", { name: "Delete student" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete student" }).click();
  await page.waitForURL(/\/students$/);
  await page.locator("[data-sonner-toast]").filter({ hasText: "Student deleted" }).getByRole("button", { name: "Undo" }).click();
  await saved(page);
  await expect(page.getByRole("list", { name: "Students" }).getByText("Mia")).toBeVisible();
  expect((await db.from("student_lessons").select("id").eq("student_id", student.id)).data).toHaveLength(1);

  await open(page, `/students/${student.id}`);
  await page.getByRole("button", { name: "More actions for Mia" }).click();
  await page.getByRole("menuitem", { name: "Delete student" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete student" }).click();
  await page.waitForURL(/\/students$/);
  await saved(page);
  expect((await db.from("students").select("id")).data).toHaveLength(0);
  expect((await db.from("student_stages").select("id")).data).toHaveLength(0);
  expect((await db.from("student_lessons").select("id")).data).toHaveLength(0);
});

test("@phone add a lesson note for a student from a phone", async ({ page }) => {
  const email = newEmail("students-phone");
  await signUp(page, email);
  const db = await dbAs(email);
  await page.getByTestId("bottom-nav").getByRole("button", { name: "More" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Students" }).click();
  await expect(page).toHaveURL(/\/students$/);
  await page.getByRole("button", { name: "Add student" }).first().click();
  await page.getByRole("dialog").getByLabel("Name").fill("Daniel");
  await page.getByRole("dialog").getByRole("button", { name: "Add student" }).click();
  await page.waitForURL(/\/students\/.+/);
  await page.getByRole("button", { name: "Lesson note" }).click();
  await page.getByRole("dialog").getByLabel("Worked on").fill("Serve from the service line");
  await page.getByRole("dialog").getByRole("button", { name: "Add note" }).click();
  await saved(page);
  expect((await db.from("student_lessons").select("focus").single()).data?.focus).toBe("Serve from the service line");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
