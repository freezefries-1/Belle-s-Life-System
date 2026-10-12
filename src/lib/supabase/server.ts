import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseConfig } from "./config";

/** For route handlers and server code. Always create a fresh client per request. */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a place that can't set cookies; the proxy refreshes sessions instead.
        }
      },
    },
  });
}
