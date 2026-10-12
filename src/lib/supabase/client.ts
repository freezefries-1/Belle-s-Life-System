"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

import { supabaseConfig } from "./config";

export type AppSupabaseClient = SupabaseClient<Database>;

let client: AppSupabaseClient | null = null;

/** One browser client per tab. The session lives in cookies so the proxy can read it too. */
export function getSupabaseBrowserClient(): AppSupabaseClient {
  client ??= createBrowserClient<Database>(supabaseConfig.url, supabaseConfig.key);
  return client;
}
