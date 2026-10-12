import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where email links land (sign-up confirmation, password reset). Exchanges
 * the one-time code for a session cookie, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await getSupabaseServerClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("This link is missing its code.") };

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "link-expired");
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL(next, origin));
}
