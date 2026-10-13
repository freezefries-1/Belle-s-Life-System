import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

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
  // Use the whole screen on iPhones with a notch; spacing respects the safe areas.
  viewportFit: "cover",
  // Android: the page shrinks when the keyboard opens, so dialogs and fields stay visible.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${manrope.variable} h-full`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
