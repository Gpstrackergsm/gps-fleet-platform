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
      { url: "/favicon.ico" },
    ],
    shortcut: "/geofence-logo.svg",
    apple: "/geofence-logo.svg",
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
