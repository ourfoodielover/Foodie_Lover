import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NetworkBanner } from "@/components/NetworkBanner";

export const metadata: Metadata = {
  title: "Foodie Lover — Restaurant Management",
  description: "Full restaurant management system",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Foodie Lover',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E65C00" },
    { media: "(prefers-color-scheme: dark)",  color: "#1A0800" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet" />
        {/* Safe-area insets for iPhone notch / Android punch-hole cameras */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <ErrorBoundary>
          {children}
          <NetworkBanner />
        </ErrorBoundary>
      </body>
    </html>
  );
}
