import type { MetadataRoute } from "next";

/** Lets the app be installed (Home Screen / desktop) and open in its own window. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Belle’s Life System",
    short_name: "Belle’s Life",
    description: "Your life. Your system. A calm, Kaizen-inspired personal productivity workspace.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8fafc",
    theme_color: "#101827",
    categories: ["productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
