import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import { at } from "@/lib/base";

export const metadata: Metadata = {
  title: "Worry Time — a CBT practice toolkit",
  description:
    "A calm mobile toolkit for CBT practice: worry time, a voice recorder, the worry tree, and 5-4-3-2-1 grounding.",
  applicationName: "Worry Time",
  manifest: at("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    title: "Worry Time",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: at("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: at("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: at("/icons/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FBFAFC",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* data-tab drives the per-section tint; the shell keeps it in sync. */}
      <body data-tab="home">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
