/**
 * Supabase settings. Both values are public by design (they ship to the
 * browser); every request is still limited by Row Level Security.
 * The service-role / secret key is never used by this app.
 *
 * When they're missing, the app runs exactly as before with browser-only
 * storage — so deploying this code without configuring Supabase is safe.
 */
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Newer projects call it the publishable key; older ones the anon key. Either works.
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const isCloudEnabled = Boolean(supabaseConfig.url && supabaseConfig.key);
