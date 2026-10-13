import { dbAs, expect, newEmail, open, saved, signUp, test, todayKey } from "./fixtures";

/**
 * The everyday workflow, start to finish, against the local test stack.
 * Every step is checked in the database as well as on screen.
 */
test("daily workflow: sign in → task → sprint → highlight → complete → project → recurring → commitment → log → review → sign out", async ({ page }) => {
  const email = newEmail("flow");
  const today = todayKey();

  await test.step("1. Sign in (new account)", async () => {
    await signUp(page, email);
    await expect(page).toHaveURL(/\/$/);
  });
  const db = await dbAs(email);

  await test.step("2. Create a task", async () => {
    await open(page, "/tasks");
    await page.getByRole("button", { name: "Add Task" }).first().click();
    await page.getByRole("dialog").locator("#task-title").fill("E2E plan the week");
    await page.getByRole("dialog").getByRole("button", { name: "Create task" }).click();
    await saved(page);
    const { data } = await db.from("tasks").select("id").eq("title", "E2E plan the week");
    expect(data).toHaveLength(1);
  });

  await test.step("3. Assign it to a sprint", async () => {
    await page.getByRole("button", { name: "More actions for “E2E plan the week”" }).first().click();
    await page.getByRole("menuitem", { name: /Build & Create/ }).click();
    await saved(page);
    const { data } = await db.from("tasks").select("sprint").eq("title", "E2E plan the week").single();
    expect(data?.sprint).toBe("build");
  });

  await test.step("4. Make it today's Daily Highlight", async () => {
    await open(page, "/");
    await page.locator('section[aria-labelledby="highlight-heading"]').getByRole("button", { name: /Select Highlight|Change/ }).first().click();
    await page.getByRole("dialog").getByRole("radio", { name: /E2E plan the week/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Set as highlight" }).click();
    await saved(page);
    const { data } = await db.from("daily_highlights").select("title_snapshot").eq("date_key", today);
    expect(data?.map((h) => h.title_snapshot)).toEqual(["E2E plan the week"]);
  });

  await test.step("5. Complete the task", async () => {
    await open(page, "/tasks");
    await page.getByRole("checkbox", { name: "Complete “E2E plan the week”" }).click();
    await saved(page);
    const { data } = await db.from("tasks").select("status, completed_at").eq("title", "E2E plan the week").single();
    expect(data?.status).toBe("completed");
    expect(data?.completed_at).toBeTruthy();
  });

  await test.step("6. Create a project", async () => {
    await open(page, "/projects");
    await page.getByRole("button", { name: "New project" }).first().click();
    await page.getByRole("dialog").getByLabel("Project name").fill("E2E garden");
    await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();
    await page.waitForURL(/\/projects\/.+/);
    await saved(page);
    const { data } = await db.from("projects").select("id").eq("name", "E2E garden");
    expect(data).toHaveLength(1);
  });

  await test.step("7. Add a task to the project", async () => {
    await page.getByRole("button", { name: "Add task" }).first().click();
    await page.getByRole("dialog").locator("#task-title").fill("E2E dig the beds");
    await page.getByRole("dialog").getByRole("button", { name: "Create task" }).click();
    await saved(page);
    const project = (await db.from("projects").select("id").eq("name", "E2E garden").single()).data!;
    const { data } = await db.from("tasks").select("project_id").eq("title", "E2E dig the beds").single();
    expect(data?.project_id).toBe(project.id);
  });

  await test.step("8. Create a recurring task (no duplicates on reload)", async () => {
    await open(page, "/tasks#recurring");
    await page.getByRole("button", { name: "New recurring task" }).click();
    await page.getByRole("dialog").locator("#task-title").fill("E2E water the plants");
    await page.getByRole("dialog").getByRole("radio", { name: "Daily" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Create task" }).click();
    await saved(page);
    const template = (await db.from("recurrence_templates").select("id").eq("title", "E2E water the plants").single()).data!;
    const first = (await db.from("tasks").select("occurrence_date").eq("recurrence_template_id", template.id)).data!;
    expect(first.length).toBeGreaterThan(0);
    expect(first.map((t) => t.occurrence_date)).toContain(today);
    await page.reload();
    await expect(page.locator("main h2").first()).toBeVisible();
    await saved(page);
    const again = (await db.from("tasks").select("occurrence_date").eq("recurrence_template_id", template.id)).data!;
    expect(again).toHaveLength(first.length);
  });

  await test.step("9. Complete a Micro-Commitment", async () => {
    await open(page, "/micro-commitments");
    await page.getByRole("button", { name: /Read 5 pages/ }).first().click();
    await saved(page);
    await page.locator("main").getByRole("checkbox").first().click();
    await saved(page);
    const { data } = await db.from("micro_commitment_completions").select("id").eq("date_key", today);
    expect(data).toHaveLength(1);
  });

  await test.step("10. Write today's Kaizen Log", async () => {
    await open(page, "/kaizen-log");
    await page.getByLabel("What went well today?").fill("Finished the E2E run");
    await page.waitForTimeout(1500);
    await saved(page);
    const { data } = await db.from("kaizen_logs").select("reflection_went_well").eq("date_key", today).single();
    expect(data?.reflection_went_well).toBe("Finished the E2E run");
  });

  await test.step("11. Complete a Weekly Review", async () => {
    await open(page, "/weekly-review");
    await page.getByRole("button", { name: /Reflect/ }).first().click();
    await page.getByLabel("What did I learn?").fill("Small steps add up");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Mark review complete" }).click();
    await saved(page);
    const { data } = await db.from("weekly_reviews").select("status, lessons_learned, completed_at");
    expect(data?.some((r) => r.status === "completed" && r.lessons_learned === "Small steps add up" && r.completed_at)).toBe(true);
  });

  await test.step("12. Sign out", async () => {
    await page.getByRole("button", { name: "Open profile menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/);
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/login/);
  });
});
