import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { LanguageProvider } from "@/lib/LanguageContext";

export const metadata: Metadata = {
  title: "Geofence GPS - Advanced Fleet Tracking & Telemetry Platform",
  description: "Plateforme professionnelle de géolocalisation GPS, suivi de flotte en temps réel et gestion du carburant. Contact: 0661176946.",
  icons: {
    icon: [
      { url: "/geofence-logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/geofence-logo.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/geofence-logo.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var r=document.documentElement;r.classList.add(localStorage.getItem('theme')==='light'?'light':'dark')}catch(e){document.documentElement.classList.add('dark')}",
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
