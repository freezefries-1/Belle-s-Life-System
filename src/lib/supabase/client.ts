"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseConfig } from "./config";

let client: SupabaseClient | null = null;

/** One browser client per tab. The session lives in cookies so the proxy can read it too. */
export function getSupabaseBrowserClient(): SupabaseClient {
  client ??= createBrowserClient(supabaseConfig.url, supabaseConfig.key);
  return client;
}
