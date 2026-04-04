import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/context/app-state";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "KLSentralBites",
  title: {
    default: "KLSentralBites — Lunch sharing",
    template: "%s · KLSentralBites",
  },
  description: "Share where you lunch. Discover spots in KL.",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KLSentralBites",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans font-normal text-zinc-900 antialiased">
        <ServiceWorkerRegister />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
