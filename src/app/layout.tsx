import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "belle’s life system",
    template: "%s · belle’s life system",
  },
  description: "Your life. Your system. A calm, Kaizen-inspired personal productivity workspace.",
};

export const viewport: Viewport = {
  themeColor: "#101827",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${manrope.variable} h-full`}>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
