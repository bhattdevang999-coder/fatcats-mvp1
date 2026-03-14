import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://fatcats.nyc"),
  title: "FatCats — Point. Expose. Fix.",
  description: "Join the first watchdog network for your city.",
  icons: {
    icon: "/assets/favicon-32.png",
    apple: "/assets/apple-touch-icon.png",
  },
  openGraph: {
    title: "FatCats — Point. Expose. Fix.",
    description: "Join the first watchdog network for your city.",
    images: ["/assets/og-image.jpg"],
  },
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
