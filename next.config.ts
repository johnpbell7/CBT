import type { NextConfig } from "next";

/**
 * Two shapes from one source tree.
 *
 * Default: a normal server build (Vercel), with /api/transcribe live.
 * STATIC_EXPORT=1: a static export for GitHub Pages, served from a subpath.
 * The CI job removes app/api before building, since a static host has no
 * server to run it on — the UI degrades to match, see NEXT_PUBLIC_STATIC.
 */
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStatic
    ? {
        output: "export",
        images: { unoptimized: true },
        // Pages serves /CBT/foo/ rather than /CBT/foo
        trailingSlash: true,
      }
    : {
        async headers() {
          return [
            {
              // The service worker must be able to control the whole origin.
              source: "/sw.js",
              headers: [
                { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                { key: "Service-Worker-Allowed", value: "/" },
              ],
            },
          ];
        },
      }),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC: isStatic ? "1" : "",
  },
};

export default nextConfig;
