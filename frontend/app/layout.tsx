import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import StructuredData from "@/components/StructuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.gps-eu.com"),
  title: {
    default: "Geofence GPS | Géolocalisation & Gestion de Flotte en Temps Réel",
    template: "%s | Geofence GPS",
  },
  description:
    "Plateforme professionnelle de géolocalisation GPS, suivi de flotte en direct, contrôle du carburant et coupure moteur à distance. Solution télématique pour entreprises au Maroc, en France et en Europe.",
  keywords: [
    // Français (SEO France / Maroc / Afrique)
    "géolocalisation gps",
    "suivi de flotte automobile",
    "traceur gps temps réel",
    "gestion de carburant",
    "coupure moteur à distance",
    "télématique flotte",
    "balise gps maroc",
    "géolocalisation véhicules marrakech casablanca",
    "éco conduite",
    "geofence gps",
    "antivol voiture gps",
    "obd2 tracker gps",
    // English (Global / Europe SEO)
    "gps fleet tracking",
    "fleet management software",
    "real time vehicle tracking",
    "fuel monitoring system",
    "remote engine cutoff",
    "vehicle telematics system",
    "gps tracker europe",
    "commercial fleet management",
    "iot gps tracking platform",
    // العربية (MENA / Maroc SEO)
    "تتبع السيارات عبر نظام تحديد المواقع",
    "تتبع المركبات في الوقت الفعلي",
    "ادارة اسطول السيارات",
    "جهاز تتبع السيارات",
    "ايقاف محرك السيارة عن بعد",
    "مراقبة استهلاك الوقود",
    "تحديد موقع السيارة مباشرة المغرب",
    "حماية السيارات من السرقة",
  ],
  alternates: {
    canonical: "https://www.gps-eu.com",
    languages: {
      "fr-FR": "https://www.gps-eu.com/?lang=fr",
      "en-US": "https://www.gps-eu.com/?lang=en",
      "ar-MA": "https://www.gps-eu.com/?lang=ar",
      fr: "https://www.gps-eu.com/?lang=fr",
      en: "https://www.gps-eu.com/?lang=en",
      ar: "https://www.gps-eu.com/?lang=ar",
      "x-default": "https://www.gps-eu.com",
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["en_US", "ar_MA"],
    url: "https://www.gps-eu.com",
    siteName: "Geofence GPS",
    title: "Geofence GPS | Géolocalisation & Gestion de Flotte en Temps Réel",
    description:
      "Plateforme leader de suivi de flotte GPS en direct, contrôle du carburant, alertes de sécurité et coupure moteur à distance sur Web, iOS et Android.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Geofence GPS - Fleet Management & Real-Time Tracking Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Geofence GPS | Flotte & Géolocalisation en Temps Réel",
    description:
      "Suivi GPS haute précision, analyse carburant en direct et sécurité antivol.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
  category: "telematics",
  authors: [{ name: "Geofence GPS Telematics", url: "https://www.gps-eu.com" }],
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
        <link rel="canonical" href="https://www.gps-eu.com" />
        <link rel="alternate" hrefLang="fr" href="https://www.gps-eu.com/?lang=fr" />
        <link rel="alternate" hrefLang="en" href="https://www.gps-eu.com/?lang=en" />
        <link rel="alternate" hrefLang="ar" href="https://www.gps-eu.com/?lang=ar" />
        <link rel="alternate" hrefLang="x-default" href="https://www.gps-eu.com" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var r=document.documentElement;r.classList.add(localStorage.getItem('theme')==='light'?'light':'dark')}catch(e){document.documentElement.classList.add('dark')}",
          }}
        />
        <StructuredData />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>

        {/* Multilingual SEO Crawl fallback for search engines */}
        <noscript>
          <div style={{ padding: "20px", background: "#111", color: "#fff", fontSize: "14px", lineHeight: "1.6" }}>
            <h2>Geofence GPS - Suivi de Flotte & Géolocalisation Professionnelle</h2>
            <p>
              Plateforme complète de géolocalisation GPS en direct, gestion du carburant, historique d&apos;itinéraires avec détection d&apos;arrêts, alertes de vitesse et coupure moteur à distance. Compatible avec Teltonika, Coban, Concox et traceurs OBD.
            </p>
            <h3>Real-Time Fleet Management & Telematics (English)</h3>
            <p>
              Second-by-second live GPS tracking, fuel analytics, speed limit alerts, geofence zones, and remote vehicle immobilization on Web, iOS, and Android.
            </p>
            <h3>نظام تتبع أسطول المركبات وتحديد المواقع في الوقت الفعلي (العربية)</h3>
            <p>
              منصة احترافية لتتبع السيارات والشاحنات مباشرة، مراقبة استهلاك الوقود بالدرهم، إيقاف المحرك عن بُعد عند الطوارئ، وحماية أسطولك من السرقة على مدار الساعة.
            </p>
            <p>
              <a href="/login" style={{ color: "#3b82f6", marginRight: "15px" }}>Connexion / Login / تسجيل الدخول</a>
              <a href="/register" style={{ color: "#3b82f6" }}>Créer un compte / Register / فتح حساب</a>
            </p>
          </div>
        </noscript>
      </body>
    </html>
  );
}
