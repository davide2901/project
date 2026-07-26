import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "SuMisura",
    template: "%s · SuMisura",
  },
  description:
    "Ottimizza candidature di lavoro e stage su misura. I tuoi dati restano isolati per account.",
  applicationName: "SuMisura",
  appleWebApp: {
    capable: true,
    // black-translucent: il contenuto (e il bg) vanno sotto la status bar
    statusBarStyle: "black-translucent",
    title: "SuMisura",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  // Default landing / first paint: evita la barra crema su iOS Safari
  themeColor: "#070f1a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${dmSans.variable} ${fraunces.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col overscroll-none">{children}</body>
    </html>
  );
}
