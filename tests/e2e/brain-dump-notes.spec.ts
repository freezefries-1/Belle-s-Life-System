import type { Page } from "@playwright/test";

import { dbAs, expect, newEmail, open, saved, signIn, signUp, test } from "./fixtures";

const inboxCount = (page: Page, n: number) => page.locator("main").getByText(`${n} in inbox`, { exact: true }).filter({ visible: true });

/** Brain Dump → Keep as note, Back to inbox, and Add to project notes (with Undo), against the local stack. */
test("keep a thought as a note, or add it to a project's notes", async ({ page, browser }) => {
  const email = newEmail("notes");
  await signUp(page, email);
  const db = await dbAs(email);

  // A project with notes of its own.
  await open(page, "/projects");
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByRole("dialog").getByLabel("Project name").fill("Tennis coaching");
  await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/.+/);
  await page.getByLabel("Project notes").fill("Court booked on Fridays");
  await page.getByLabel("Project notes").blur();
  await saved(page);

  // Two thoughts in the Brain Dump.
  await open(page, "/brain-dump");
  const capture = page.getByLabel("Capture a thought").filter({ visible: true });
  for (const text of ["Remember to stretch", "Try doubles drills first"]) {
    await capture.fill(text);
    await capture.press("Enter");
  }
  await saved(page);
  await expect(inboxCount(page, 2)).toBeVisible();

  // Keep as note: out of the inbox, into Kept notes, saved as "kept".
  await page.getByRole("button", { name: "Actions for “Remember to stretch”" }).click();
  await page.getByRole("menuitem", { name: "Keep as note" }).click();
  await saved(page);
  await expect(inboxCount(page, 1)).toBeVisible();
  const kept = page.getByRole("list", { name: "Kept notes" });
  await expect(kept.getByText("Remember to stretch")).toBeVisible();
  expect((await db.from("brain_dump_entries").select("status").eq("title", "Remember to stretch").single()).data?.status).toBe("kept");

  // Still kept after a reload, and on another device.
  await page.reload();
  await expect(page.getByRole("list", { name: "Kept notes" }).getByText("Remember to stretch")).toBeVisible();
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await signIn(p2, email);
  await open(p2, "/brain-dump");
  await expect(p2.getByRole("list", { name: "Kept notes" }).getByText("Remember to stretch")).toBeVisible();
  await other.close();

  // Back to inbox, then keep it again.
  await page.getByRole("button", { name: "Actions for “Remember to stretch”" }).click();
  await page.getByRole("menuitem", { name: "Back to inbox" }).click();
  await saved(page);
  await expect(inboxCount(page, 2)).toBeVisible();
  expect((await db.from("brain_dump_entries").select("status").eq("title", "Remember to stretch").single()).data?.status).toBe("inbox");

  // Add to project notes: appended to the end, entry leaves the Brain Dump.
  await page.getByRole("button", { name: "Actions for “Try doubles drills first”" }).click();
  await page.getByRole("menuitem", { name: "Add to project notes…" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Add to notes" })).toBeDisabled();
  await dialog.getByLabel("Tennis coaching").check();
  await dialog.getByRole("button", { name: "Add to notes" }).click();
  await saved(page);
  await expect(inboxCount(page, 1)).toBeVisible();
  let project = (await db.from("projects").select("id, notes").eq("name", "Tennis coaching").single()).data!;
  expect(project.notes).toMatch(/^Court booked on Fridays\n\n— \d{1,2} \w{3} \d{4}, from Brain Dump\nTry doubles drills first$/);
  expect((await db.from("brain_dump_entries").select("id").eq("title", "Try doubles drills first")).data).toHaveLength(0);

  // The project page shows it.
  await open(page, `/projects/${project.id}`);
  await expect(page.getByLabel("Project notes")).toHaveValue(project.notes);

  // Undo puts both back.
  await open(page, "/brain-dump");
  await page.getByRole("button", { name: "Actions for “Try doubles drills first”" }).waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Actions for “Remember to stretch”" }).click();
  await page.getByRole("menuitem", { name: "Add to project notes…" }).click();
  await page.getByRole("dialog").getByLabel("Tennis coaching").check();
  await page.getByRole("dialog").getByRole("button", { name: "Add to notes" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  await saved(page);
  await expect(inboxCount(page, 1)).toBeVisible();
  project = (await db.from("projects").select("id, notes").eq("id", project.id).single()).data!;
  expect(project.notes).not.toContain("Remember to stretch");
  expect(project.notes).toContain("Try doubles drills first");
  expect((await db.from("brain_dump_entries").select("status").eq("title", "Remember to stretch").single()).data?.status).toBe("inbox");
});

test("a project's notes open on another device pick up an added note, and typing there keeps it", async ({ page, browser }) => {
  const email = newEmail("notes2");
  await signUp(page, email);
  const db = await dbAs(email);
  await open(page, "/projects");
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByRole("dialog").getByLabel("Project name").fill("Garden");
  await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/.+/);
  const projectUrl = page.url();
  await saved(page);

  // Device 2 has the project's notes open.
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await signIn(p2, email);
  await open(p2, new URL(projectUrl).pathname);

  // Device 1 adds a Brain Dump thought to the project's notes.
  await open(page, "/brain-dump");
  const capture = page.getByLabel("Capture a thought").filter({ visible: true });
  await capture.fill("Plant tulips in October");
  await capture.press("Enter");
  await saved(page);
  await page.getByRole("button", { name: "Actions for “Plant tulips in October”" }).click();
  await page.getByRole("menuitem", { name: "Add to project notes…" }).click();
  await page.getByRole("dialog").getByLabel("Garden").check();
  await page.getByRole("dialog").getByRole("button", { name: "Add to notes" }).click();
  await saved(page);

  // Device 2 catches up (as it does when you switch back to it) and shows the note.
  await p2.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(p2.getByLabel("Project notes")).toHaveValue(/Plant tulips in October/);

  // Typing on device 2 adds to the notes; the added thought is kept.
  await p2.getByLabel("Project notes").press("End");
  await p2.getByLabel("Project notes").pressSequentially("\nBuy compost");
  await p2.getByLabel("Project notes").blur();
  await saved(p2);
  const notes = (await db.from("projects").select("notes").eq("name", "Garden").single()).data!.notes;
  expect(notes).toContain("Plant tulips in October");
  expect(notes).toContain("Buy compost");
  await other.close();
});
