import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.fatcatsapp.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "FatCats — Point. Expose. Fix.",
  description: "See what your city won't show you. NYC's citizen-powered infrastructure watchdog.",
  applicationName: "FatCats",
  icons: {
    icon: [
      { url: "/assets/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/logo-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [
      { url: "/assets/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "FatCats",
    title: "FatCats — Point. Expose. Fix.",
    description: "See what your city won't show you. NYC's citizen-powered infrastructure watchdog.",
    url: siteUrl,
    images: [
      {
        url: "/assets/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "FatCats — See what your city won't show you",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FatCats — Point. Expose. Fix.",
    description: "See what your city won't show you. NYC's citizen-powered infrastructure watchdog.",
    images: ["/assets/og-image.jpg"],
  },
  appleWebApp: {
    capable: true,
    title: "FatCats",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
