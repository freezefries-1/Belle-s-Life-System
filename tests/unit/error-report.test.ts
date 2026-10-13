import { describe, expect, it } from "vitest";

import { buildReport, codeFrames } from "@/lib/monitoring/error-report";

const secret = "Call the bank about my overdraft";

describe("crash reports", () => {
  it("never include the error message or anything typed", () => {
    const error = new TypeError(`Cannot read "${secret}"`);
    error.stack = `TypeError: Cannot read "${secret}"\n    at renderTask (https://app.example/_next/static/chunks/abc.js?v=${encodeURIComponent(secret)}:1:200)\n    at x (https://app.example/_next/static/chunks/def.js:2:30)`;
    const report = buildReport(error, "page", `/tasks?q=${secret}#x`);
    const json = JSON.stringify(report);
    expect(json).not.toContain("bank");
    expect(json).not.toContain("overdraft");
    expect(report).toMatchObject({ source: "page", name: "TypeError", path: "/tasks", digest: null });
    expect(report.frames).toEqual([
      "at renderTask (https://app.example/_next/static/chunks/abc.js:1:200)",
      "at x (https://app.example/_next/static/chunks/def.js:2:30)",
    ]);
  });

  it("keep Next's reference code, and only error names that look like names", () => {
    expect(buildReport(Object.assign(new Error("x"), { digest: "123456789" }), "app", "/").digest).toBe("123456789");
    expect(buildReport({ name: secret, digest: "<script>" }, "app", "/")).toMatchObject({ name: "Error", digest: null });
    expect(buildReport("just a string", "promise", "/")).toMatchObject({ name: "Error", frames: [] });
  });

  it("drop stack lines that aren't code locations (Safari/Firefox frames kept)", () => {
    expect(codeFrames(`Error: ${secret}\nmore of the ${secret}\nrender@https://a.example/x.js:1:2`)).toEqual(["render@https://a.example/x.js:1:2"]);
  });
});
