import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/common/Providers";
import { Toaster } from "@/components/ui/sonner";

// The Ge'ez-capable font (Noto Sans Ethiopic, variable 400-800) is
// self-hosted via @font-face in globals.css so it can be cached by the
// service worker and needs no build-time network fetch.

export const metadata: Metadata = {
  title: "Wegen Guide — ወገን ጋይድ",
  description:
    "Step-by-step guides for Ethiopian government services: documents, steps, fees and the nearest office. ደረጃ በደረጃ የመንግሥት አገልግሎት መመሪያ።",
  applicationName: "Wegen Guide",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wegen Guide",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e7b45",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="am" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
