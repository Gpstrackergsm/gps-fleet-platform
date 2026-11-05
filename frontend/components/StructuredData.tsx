import React from "react";

export default function StructuredData() {
  const baseUrl = "https://www.gps-eu.com";

  // 1. SoftwareApplication / Telematics Platform Schema
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Geofence GPS",
    alternateName: ["Geofence Telematics", "Geofence Fleet Management"],
    operatingSystem: "Web Browser, iOS, Android",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Fleet Management, Telematics & GPS Tracking",
    url: baseUrl,
    image: `${baseUrl}/og-image.jpg`,
    screenshot: `${baseUrl}/landing/hero-command-center.jpg`,
    softwareVersion: "2.0.0",
    inLanguage: ["fr-FR", "en-US", "ar-MA"],
    description:
      "Plateforme professionnelle de géolocalisation GPS, suivi de flotte en temps réel, gestion du carburant, analyse de conduite et coupure moteur à distance.",
    featureList: [
      "Suivi GPS en temps réel haute précision à la seconde / Real-time GPS tracking",
      "Détection automatique des arrêts et parkings avec durée exacte / Automatic parking & stop detection",
      "Contrôle et calcul des coûts de carburant en MAD / Fuel waste & cost monitoring",
      "Coupure moteur à distance sécurisée en 1 clic / Remote engine cut-off",
      "Historique des trajets Aller/Retour multicolore / Multi-color route history",
      "Alertes instantanées : excès de vitesse, remorquage, déconnexion batterie / Instant alerts",
      "Application mobile pour conducteurs et gestionnaires / iOS & Android Mobile Apps",
      "Rapports détaillés exportables en PDF et Excel / Exportable fleet reports"
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "142",
      bestRating: "5",
      worstRating: "1",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "MAD",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Geofence GPS",
      },
    },
  };

  // 2. Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Geofence GPS",
    url: baseUrl,
    logo: `${baseUrl}/geofence-logo.svg`,
    image: `${baseUrl}/og-image.jpg`,
    description:
      "Fournisseur de solutions de télématique embarquée, suivi de flotte automobile par GPS et sécurité des véhicules pour professionnels.",
    telephone: "+212661176946",
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+212661176946",
        contactType: "customer service",
        areaServed: ["MA", "FR", "ES", "DZ", "TN", "SN", "CI", "EU"],
        availableLanguage: ["French", "English", "Arabic"],
      },
      {
        "@type": "ContactPoint",
        telephone: "+212661176946",
        contactType: "sales",
        areaServed: ["MA", "FR", "ES", "DZ", "TN", "SN", "CI", "EU"],
        availableLanguage: ["French", "English", "Arabic"],
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "MA",
    },
  };

  // 3. WebSite Schema with Multi-language references
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Geofence GPS",
    url: baseUrl,
    inLanguage: ["fr-FR", "en-US", "ar-MA"],
    description:
      "Solution complète de géolocalisation de véhicules et gestion de flotte connectée en direct.",
  };

  // 4. FAQPage Schema (Triggers Google Rich Snippet Accordions in Search)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Comment fonctionne la géolocalisation en temps réel de Geofence GPS ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Geofence GPS se connecte aux balises GPS (Teltonika, Coban, Concox, OBD-II) installées sur vos véhicules. La plateforme reçoit la position exacte, la vitesse, l'état du contact moteur et l'adresse physique toutes les quelques secondes et affiche l'ensemble de votre flotte en direct sur Google Maps.",
        },
      },
      {
        "@type": "Question",
        name: "Comment fonctionne la coupure moteur à distance en cas de vol ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En cas d'urgence ou de vol, vous pouvez envoyer une commande de coupure moteur sécurisée en un seul clic depuis l'application web ou mobile. Pour des raisons de sécurité, le moteur est coupé uniquement lorsque la vitesse du véhicule passe sous les 20 km/h, immobilisant le véhicule sans risque pour la circulation.",
        },
      },
      {
        "@type": "Question",
        name: "Quels types de traceurs GPS et boîtiers sont compatibles ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Geofence GPS est universellement compatible avec les meilleurs fabricants de télématique mondiaux : Teltonika (FMB920, FMC130...), Coban (TK103, TK303, TK403), Concox / Jimi IoT (GT06N, VL03), traceurs OBD-II Plug & Play sans fil, ainsi que notre application mobile pour smartphone.",
        },
      },
      {
        "@type": "Question",
        name: "Comment Geofence permet-il de réduire la consommation de carburant ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Geofence analyse le ralenti excessif moteur tournant (idling), les accélérations et freinages brusques (éco-conduite), ainsi que les trajets non autorisés. Vous visualisez directement les coûts perdus en Dirhams (MAD) et économisez en moyenne 20% à 25% sur votre facture mensuelle de carburant.",
        },
      },
      {
        "@type": "Question",
        name: "How does real-time GPS fleet tracking work on Geofence?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Geofence connects to industry-standard GPS telematics devices. It delivers second-by-second vehicle positions, street addresses, engine status, and driver behavior straight to your live Google Maps dashboard and mobile device.",
        },
      },
      {
        "@type": "Question",
        name: "كيف يعمل نظام تتبع أسطول المركبات في الوقت الفعلي عبر Geofence؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "يتصل نظام Geofence بأجهزة التتبع GPS المثبتة في مركباتك لتوفير موقع دقيق في الوقت الفعلي، السرعة، حالة تشغيل المحرك، والعنوان الفعلي، مع إمكانية إيقاف تشغيل المحرك عن بُعد في حالة الطوارئ ومراقبة استهلاك الوقود بالدرهم المغربي.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
