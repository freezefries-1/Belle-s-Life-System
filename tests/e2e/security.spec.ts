import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL, dbAs, expect, newEmail, open, saved, signIn, signUp, test } from "./fixtures";

/** Account isolation and protected routes, through the real app and database. */

test("signed-out visitors are sent to sign in, remembering where they were going", async ({ page }) => {
  await page.goto("/projects/abc?x=1");
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects%2Fabc%3Fx%3D1/);
  const res = await page.request.get("/tasks", { maxRedirects: 0 });
  expect([302, 307, 308]).toContain(res.status());
});

test("a crafted sign-in link can't send you to another site", async ({ page }) => {
  const email = newEmail("redir");
  await signUp(page, email);
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
  await page.goto("/login?next=%2F%09%2Fevil.example");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct horse 99");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  expect(new URL(page.url()).hostname).toBe("localhost");
});

test("one account can never see or change another account's data", async ({ browser }) => {
  const a = newEmail("a");
  const b = newEmail("b");
  const pa = await (await browser.newContext()).newPage();
  await signUp(pa, a);
  await open(pa, "/tasks");
  await pa.getByRole("button", { name: "Add Task" }).first().click();
  await pa.getByRole("dialog").locator("#task-title").fill("A's private task");
  await pa.getByRole("dialog").getByRole("button", { name: "Create task" }).click();
  await saved(pa);

  // In the app: B sees nothing of A's.
  const pb = await (await browser.newContext()).newPage();
  await signUp(pb, b);
  await open(pb, "/tasks");
  await expect(pb.getByText("A's private task")).toHaveCount(0);

  // In the database: B can't read, update or delete A's row, even by id.
  const dbA = await dbAs(a);
  const dbB = await dbAs(b);
  const row = (await dbA.from("tasks").select("id").eq("title", "A's private task").single()).data!;
  expect((await dbB.from("tasks").select("id").eq("id", row.id)).data).toEqual([]);
  await dbB.from("tasks").update({ title: "changed by B" }).eq("id", row.id);
  await dbB.from("tasks").delete().eq("id", row.id);
  expect((await dbA.from("tasks").select("title").eq("id", row.id).single()).data?.title).toBe("A's private task");

  // Without signing in, nothing is readable.
  const anon = createClient(SUPABASE_URL, process.env.ANON_KEY!, { auth: { persistSession: false } });
  expect((await anon.from("tasks").select("id")).data ?? []).toEqual([]);
});

test("@phone everyday use on a phone: capture, complete, move between sections", async ({ page }) => {
  const email = newEmail("phone");
  await signUp(page, email);
  const db = await dbAs(email);
  const nav = page.getByTestId("bottom-nav");
  await expect(nav).toBeVisible();

  await nav.getByRole("link", { name: /Brain Dump/ }).click();
  await expect(page).toHaveURL(/\/brain-dump/);
  // Next keeps the previous page (Today, which has its own capture box) hidden in the DOM.
  const capture = page.getByLabel("Capture a thought").filter({ visible: true });
  await capture.fill("Phone thought");
  await capture.press("Enter");
  await saved(page);
  expect((await db.from("brain_dump_entries").select("id").eq("title", "Phone thought")).data).toHaveLength(1);

  await page.getByRole("button", { name: "Quick add" }).click();
  await page.getByRole("dialog").locator("input").first().fill("Phone quick thought");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await saved(page);

  await nav.getByRole("button", { name: "More" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/calendar/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Sign in again on a second "device" and see the same data.
  const other = await page.context().browser()!.newContext();
  const p2 = await other.newPage();
  await signIn(p2, email);
  await open(p2, "/brain-dump");
  await expect(p2.getByText("Phone thought")).toBeVisible();
  await other.close();
});
