import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath (where to go after signing in)", () => {
  it.each([
    ["/tasks?x=1#a", "/tasks?x=1#a"],
    ["/projects/abc?x=1", "/projects/abc?x=1"],
    ["/", "/"],
    ["/%2F%2Fevil.com", "/%2F%2Fevil.com"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([null, "//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "https://evil.com", " /tasks"])("rejects %j", (input) => {
    expect(safeNextPath(input)).toBe("/");
  });
});
