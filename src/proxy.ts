import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isCloudEnabled } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/proxy-session";

/** Protects the workspace when Supabase is configured; does nothing in browser-only mode. */
export async function proxy(request: NextRequest) {
  if (!isCloudEnabled) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
