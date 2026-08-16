import type { MetadataRoute } from "next";
import { at } from "@/lib/base";

// The manifest never varies per request, and `output: export` requires this.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Worry Time — a CBT practice toolkit",
    short_name: "Worry Time",
    description:
      "A calm mobile toolkit for CBT practice: worry time, a voice recorder, the worry tree, and 5-4-3-2-1 grounding.",
    start_url: at("/"),
    scope: at("/"),
    display: "standalone",
    orientation: "portrait",
    theme_color: "#FBFAFC",
    background_color: "#FBFAFC",
    categories: ["health", "lifestyle"],
    icons: [
      { src: at("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: at("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: at("/icons/icon-512-maskable.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
