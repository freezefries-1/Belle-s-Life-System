import { dbAs, expect, newEmail, open, saved, signUp, test, todayKey } from "./fixtures";

/** Reading: a yearly goal, books with several genres and stars, currently reading → finished — checked in the database too. */
test("reading: goal, finished books with several genres, currently reading, finish, delete with Undo", async ({ page }) => {
  const email = newEmail("reading");
  await signUp(page, email);
  const db = await dbAs(email);
  const today = todayKey();
  const year = Number(today.slice(0, 4));

  await open(page, "/reading");
  await expect(page.locator("main").getByText("No books yet").filter({ visible: true })).toBeVisible();

  // Set a goal for this year.
  await page.getByRole("button", { name: "Set a goal" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Books").fill("0");
  await expect(dialog.getByRole("alert")).toHaveText("Enter a whole number from 1 to 1000.");
  await dialog.getByLabel("Books").fill("12");
  await dialog.getByRole("button", { name: "Save goal" }).click();
  await saved(page);
  expect((await db.from("reading_goals").select("id, year, target")).data).toEqual([{ id: String(year), year, target: 12 }]);

  // A finished book: two genres, one of them your own (WLW), and 5 stars.
  await page.getByRole("button", { name: "Add book" }).first().click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Add book" })).toBeDisabled(); // no title yet
  await dialog.getByLabel("Title").fill("The Quiet Harbour");
  await dialog.getByLabel("Author").fill("M. Lane");
  await dialog.getByText("Mystery", { exact: true }).click();
  await dialog.getByLabel("Add your own genre").fill("WLW");
  await dialog.getByRole("button", { name: "Add genre" }).click();
  await expect(dialog.getByRole("checkbox", { name: "WLW" })).toBeChecked();
  await dialog.locator("label").filter({ hasText: "5 stars" }).click();
  await expect(dialog.getByRole("radio", { name: "5 stars" })).toBeChecked();
  await dialog.getByRole("button", { name: "Add book" }).click();
  await saved(page);
  const b1 = (await db.from("books").select("title, author, genres, status, rating, finished_on").single()).data!;
  expect(b1).toEqual({ title: "The Quiet Harbour", author: "M. Lane", genres: ["Mystery", "WLW"], status: "finished", rating: 5, finished_on: today });

  // The goal and summary update.
  const goal = page.getByRole("group", { name: `${year} reading goal` });
  await expect(goal.getByText("of 12 books")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: `${year} goal: 1 of 12 books` })).toBeVisible();

  // Your own genre is offered next time; a book you're reading now.
  await page.getByRole("button", { name: "Add what I'm reading" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Night Ferry");
  await expect(dialog.getByRole("checkbox", { name: "WLW" })).not.toBeChecked();
  await dialog.getByText("WLW", { exact: true }).click();
  await dialog.getByText("Historical fiction", { exact: true }).click();
  await expect(dialog.locator("#book-finished")).toHaveCount(0); // no finish date while reading
  await dialog.getByRole("button", { name: "Add book" }).click();
  await saved(page);
  const reading = page.getByRole("list", { name: "Currently reading" });
  await expect(reading.getByText("Night Ferry")).toBeVisible();
  expect((await db.from("books").select("status, finished_on, started_on, genres").eq("title", "Night Ferry").single()).data).toEqual({
    status: "reading",
    finished_on: null,
    started_on: today,
    genres: ["WLW", "Historical fiction"],
  });

  // Finish it, with 4 stars.
  await reading.getByRole("button", { name: "Finished Night Ferry" }).click();
  dialog = page.getByRole("dialog");
  await dialog.locator("label").filter({ hasText: "4 stars" }).click();
  await dialog.getByRole("button", { name: "Mark as finished" }).click();
  await saved(page);
  await expect(page.getByText("Nothing on the go right now.")).toBeVisible();
  expect((await db.from("books").select("status, finished_on, rating").eq("title", "Night Ferry").single()).data).toEqual({ status: "finished", finished_on: today, rating: 4 });
  await expect(page.getByRole("progressbar", { name: `${year} goal: 2 of 12 books` })).toBeVisible();

  // Genres: WLW counts for both books.
  await expect(page.getByRole("list", { name: `Genres of books finished in ${year}` }).getByText("2 books")).toBeVisible();

  // Filter the list by genre.
  const finished = page.getByRole("list", { name: `Books finished in ${year}` });
  await page.getByRole("combobox", { name: "Filter by genre" }).click();
  await page.getByRole("option", { name: "Mystery" }).click();
  await expect(finished.getByRole("listitem").filter({ has: page.getByText("Night Ferry") })).toHaveCount(0);
  await expect(finished.getByText("The Quiet Harbour")).toBeVisible();
  await page.getByRole("combobox", { name: "Filter by genre" }).click();
  await page.getByRole("option", { name: "All genres" }).click();

  // Delete with Undo.
  await page.getByRole("button", { name: "Actions for The Quiet Harbour" }).click();
  // The "Book finished" notice can sit over the menu for a few seconds, so choose Delete with the keyboard.
  await page.getByRole("menuitem", { name: "Delete" }).press("Enter");
  await saved(page);
  expect((await db.from("books").select("id")).data).toHaveLength(1);
  await page.locator("[data-sonner-toast]").filter({ hasText: "Book deleted" }).getByRole("button", { name: "Undo" }).click();
  await saved(page);
  expect((await db.from("books").select("id")).data).toHaveLength(2);
});
