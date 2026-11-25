import { expect, newEmail, open, signUp, test } from "./fixtures";

/** iPad: a slim sidebar with each section's name (no bottom bar), Today in two columns in portrait, and the sidebar's expand choice remembered in landscape. */
const IPAD = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

test.describe("iPad in portrait", () => {
  test.use({ ...IPAD, viewport: { width: 820, height: 1180 } });

  test("slim sidebar with names, no bottom bar, Today in two columns", async ({ page }) => {
    await signUp(page, newEmail("ipad-portrait"));
    await open(page, "/");

    // Sidebar instead of the phone's bottom bar; names under the icons; no expand button in portrait.
    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    await expect(sidebar).toBeVisible();
    await expect(page.getByTestId("bottom-nav")).toBeHidden();
    await expect(sidebar.getByText("Recovery", { exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Expand sidebar" })).toBeHidden();

    // Every section is one tap away.
    await sidebar.getByRole("link", { name: "Reading" }).click();
    await expect(page).toHaveURL(/\/reading$/);
    await open(page, "/");

    // Two columns: Recovery & sleep and Micro-commitments sit side by side, below the full-width highlight.
    const whoop = (await page.getByRole("region", { name: "Recovery & sleep" }).boundingBox())!;
    const commitments = (await page.getByText("Micro-commitments", { exact: true }).first().boundingBox())!;
    expect(commitments.x).toBeGreaterThan(whoop.x + whoop.width - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

test.describe("iPad in landscape", () => {
  test.use({ ...IPAD, viewport: { width: 1180, height: 820 } });

  test("starts with the slim sidebar; expanding it is remembered", async ({ page }) => {
    await signUp(page, newEmail("ipad-landscape"));
    await open(page, "/");
    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    await expect(sidebar.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    expect((await sidebar.boundingBox())!.width).toBeLessThan(100);

    await sidebar.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(sidebar.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("complementary", { name: "Sidebar" }).getByRole("button", { name: "Collapse sidebar" })).toBeVisible();
    expect((await page.getByRole("complementary", { name: "Sidebar" }).boundingBox())!.width).toBeGreaterThan(200);
  });
});
