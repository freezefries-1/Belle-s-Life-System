/**
 * Only same-site paths are allowed as a post-sign-in destination. Parsed the
 * way browsers parse it (tabs/newlines are stripped there, so "/\t/evil.com"
 * would become "//evil.com"), then checked to stay on this origin.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/")) return fallback;
  // Reject anything with control characters, whitespace or backslashes outright.
  if (/[\u0000-\u001f\u007f\s\\]/.test(next)) return fallback;
  try {
    const base = "https://belle.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Messages the login page may show from a link; anything else is ignored. */
export const AUTH_LINK_ERRORS: Record<string, string> = {
  "link-expired": "That link has expired or was already used. Please try again.",
};
