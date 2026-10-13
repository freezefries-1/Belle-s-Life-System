"use client";

import * as React from "react";

import { reportClientError } from "@/lib/monitoring/error-report";

/**
 * Last-resort screen if the app's outer frame itself fails. It replaces the
 * whole document, so it brings its own minimal styling. Reloading starts the
 * app afresh; saved data (and changes kept on this device) are unaffected.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  React.useEffect(() => reportClientError(error, "app"), [error]);
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <title>Something went wrong · belle’s life system</title>
        <main role="alert" style={{ maxWidth: 420, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
          <h2 style={{ fontSize: 20, margin: "0 0 8px" }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: "#475569", margin: "0 0 20px" }}>
            Your data hasn’t been affected. Try again, or reload the page.
          </p>
          {error.digest && <p style={{ fontSize: 11, color: "#94a3b8" }}>Reference: {error.digest}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={() => retry()} style={buttonStyle("#101827", "#fff")}>
              Try again
            </button>
            <button onClick={() => window.location.reload()} style={buttonStyle("#fff", "#0f172a")}>
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

const buttonStyle = (background: string, color: string): React.CSSProperties => ({
  background,
  color,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
});
