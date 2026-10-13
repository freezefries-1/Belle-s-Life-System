import { test as base, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Local only: refuse to run against anything that isn't this machine. */
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/;
export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://localhost:54321";
const ANON_KEY = process.env.ANON_KEY ?? "";
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3001";

if (!LOCAL.test(BASE_URL) || !LOCAL.test(SUPABASE_URL)) {
  throw new Error(`E2E tests only run against a local app and database (got ${BASE_URL} and ${SUPABASE_URL}).`);
}
if (!ANON_KEY) throw new Error("Set ANON_KEY (source supabase/local/.env) before running the E2E tests.");

export const PASSWORD = "correct horse 99";
export const newEmail = (tag: string) => `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@belle.test`;

/** Today's date on this machine, as the app sees it (YYYY-MM-DD). */
export const todayKey = () => new Date().toLocaleDateString("en-CA");

/** A database client signed in as the test account — reads go through RLS like the app's. */
export async function dbAs(email: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return client;
}

export async function signUp(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 });
  await expect(page.locator("main h2").first()).toBeVisible();
}

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 });
}

/** Wait until the sync indicator says everything is saved. */
export async function saved(page: Page) {
  await expect(page.getByTestId("sync-indicator").first()).toHaveAttribute("data-state", "synced", { timeout: 15_000 });
  // Saves are debounced a little; give the queue a moment and check again.
  await page.waitForTimeout(400);
  await expect(page.getByTestId("sync-indicator").first()).toHaveAttribute("data-state", "synced", { timeout: 15_000 });
}

export async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main h2").first()).toBeVisible();
}

export const test = base;
export { expect };
