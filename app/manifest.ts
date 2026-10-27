import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Küchen Fusion",
    short_name: "Küchen Fusion",
    description: "Rezepte aus jedem Link – Zeiten, Portionen, Timer und gemeinsame Einkaufslisten.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "de",
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Rezept importieren", url: "/search?focus=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Einkaufsliste", url: "/grocery", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Timer", url: "/timers", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    share_target: {
      action: "/import",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
