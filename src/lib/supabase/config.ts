/**
 * Supabase settings. Both values are public by design (they ship to the
 * browser); every request is still limited by Row Level Security.
 * The service-role / secret key is never used by this app.
 *
 * When they're missing, the app runs exactly as before with browser-only
 * storage — so deploying this code without configuring Supabase is safe.
 */
/**
 * Accepts the project URL however it was copied: trims spaces/quotes, a
 * trailing slash, or an API path such as /rest/v1 that some dashboard pages
 * show — the client needs just https://<project>.supabase.co.
 */
export function normalizeSupabaseUrl(raw: string | undefined) {
  return (raw ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+(rest|auth|storage|realtime|functions)\/v1\/?.*$/i, "")
    .replace(/\/+$/, "");
}

export const supabaseConfig = {
  url: normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  // Newer projects call it the publishable key; older ones the anon key. Either works.
  key: (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim().replace(/^["']|["']$/g, ""),
};

export const isCloudEnabled = Boolean(supabaseConfig.url && supabaseConfig.key);
