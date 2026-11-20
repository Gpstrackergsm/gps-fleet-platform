import type { Language } from './translations';

export interface LandingDict {
  locale: string;
  badge: string;
  title1: string;
  title2: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  navFeatures: string;
  navPlatform: string;
  navAnalytics: string;
  navHardware: string;
  stats: { value: string; label: string }[];
  heroTourBtn: string;
  liveSocketConnected: string;

  // Contact Bar
  callUsText: string;
  phoneNumber: string;

  // Hero Live Card 1
  heroLiveStatus: string;
  heroLiveAddress: string;
  heroLiveTodayKm: string;
  heroLiveTodayCost: string;

  // Hero Live Card 2
  heroCard2Title: string;
  heroCard2Stop: string;
  heroCard2Aller: string;
  heroCard2Retour: string;
  heroCard2Third: string;

  // Hero Live Card 3
  heroCard3Title: string;
  heroCard3Sub: string;
  heroCard3Safety: string;
  heroCard3Btn: string;

  // Tour Section Header
  tourBadge: string;
  tourTitle: string;
  tourSubtitle: string;

  // Tour 6 Tabs
  tab1: string;
  tab2: string;
  tab3: string;
  tab4: string;
  tab5: string;
  tab6: string;

  // Module 1
  m1Badge: string;
  m1Title: string;
  m1Desc: string;
  m1Point1: string;
  m1Point2: string;
  m1Point3: string;
  m1Point4: string;
  m1Btn: string;

  // Module 2
  m2Badge: string;
  m2Title: string;
  m2Desc: string;
  m2Point1: string;
  m2Point2: string;
  m2Point3: string;

  // Module 3
  m3Badge: string;
  m3Title: string;
  m3Desc: string;
  m3Point1: string;
  m3Point2: string;
  m3Point3: string;

  // Module 4
  m4Badge: string;
  m4Title: string;
  m4Desc: string;
  m4Point1: string;
  m4Point2: string;
  m4Point3: string;

  // Module 5
  m5Badge: string;
  m5Title: string;
  m5Desc: string;
  m5Point1: string;
  m5Point2: string;

  // Module 6
  m6Badge: string;
  m6Title: string;
  m6Desc: string;
  m6TestCut: string;
  m6TestResume: string;

  // ROI Section
  roiBadge: string;
  roiTitle: string;
  roiSubtitle: string;
  roiSimTitle: string;
  roiVehiclesLabel: string;
  roiVehiclesCount: (count: number) => string;
  roiBudgetLabel: string;
  roiMonthlySavedLabel: string;
  roiYearlySavedLabel: string;
  roiChartTitle: string;
  roiChartSubtitle: (count: number) => string;
  roiChartBadge: string;
  roiChartNoGps: string;
  roiChartWithTrackPro: string;
  chartDays: string[];

  // Features Grid
  featHeader: string;
  featSub: string;
  feats: { title: string; desc: string; category?: string; badge?: string }[];

  // Hardware Section
  hwBadge: string;
  hwTitle: string;
  hwSubtitle: string;
  hwBtnPrimary: string;
  hwBtnSecondary: string;

  // FAQ Section (SEO & Rich Snippets)
  faqBadge: string;
  faqTitle: string;
  faqSubtitle: string;
  faqItems: { q: string; a: string }[];

  // Footer
  footerRights: string;
  footerLogin: string;
  footerRegister: string;
}

const fr: LandingDict = {
  locale: 'fr-FR',
  badge: "Plateforme GPS & Gestion de Flotte Nouvelle Génération · En Direct 24/7",
  title1: "Pilotez Toute Votre Flotte en Temps Réel.",
  title2: "Suivi Live, Parkings, Carburant (MAD) & Sécurité.",
  subtitle:
    "Visualisez vos véhicules à la seconde près : adresse exacte en direct, historique Aller/Retour multicolore, détection automatique de tous les parkings avec durée, analyse carburant en MAD, rapports Excel/PDF et coupure moteur à distance.",
  ctaPrimary: "Créer un Compte",
  ctaSecondary: "Accéder à ma Flotte",
  navFeatures: "Fonctionnalités",
  navPlatform: "Aperçu Plateforme",
  navAnalytics: "Graphiques & ROI",
  navHardware: "Boîtiers GPS",
  stats: [
    { value: "99.98%", label: "Disponibilité Temps Réel" },
    { value: "-28%", label: "D'économies sur le Carburant & Ralenti" },
    { value: "< 1 sec", label: "Latence GPS WebSocket Direct" },
    { value: "24/7", label: "Protection Anti-Vol & Coupure Moteur" },
  ],
  heroTourBtn: "Découvrir toute la plateforme",
  liveSocketConnected: "● LIVE SOCKET CONNECTÉ",

  callUsText: "Service Client & Vente :",
  phoneNumber: "0661176946",

  heroLiveStatus: "Dacia Duster · En mouvement",
  heroLiveAddress: "Autoroute A1, Casablanca → Rabat",
  heroLiveTodayKm: "142.8 km auj.",
  heroLiveTodayCost: "≈ 154 MAD",

  heroCard2Title: "Détection Parkings & Aller/Retour",
  heroCard2Stop: "Arrêt P1 : 10:15 → 10:40 (25 min)",
  heroCard2Aller: "Aller",
  heroCard2Retour: "Retour",
  heroCard2Third: "3e passage",

  heroCard3Title: "Sécurité & Coupure Moteur",
  heroCard3Sub: "Commande instantanée par relais GPRS/SMS",
  heroCard3Safety: "✓ Protection anti-coupure à haute vitesse",
  heroCard3Btn: "STOP ENGINE",

  tourBadge: "Visite Guidée Interactive",
  tourTitle: "Tout ce que Notre Plateforme Fait pour Vos Véhicules",
  tourSubtitle: "Cliquez sur chaque module ci-dessous pour découvrir les écrans, les indicateurs et les outils intégrés à votre espace client.",

  tab1: "1. Carte Live 24/7",
  tab2: "2. Historique & Parkings",
  tab3: "3. Carburant (MAD)",
  tab4: "4. Rapports Excel/PDF",
  tab5: "5. Zones & Alertes",
  tab6: "6. Coupure Moteur",

  m1Badge: "Suivi GPS en Direct",
  m1Title: "Carte Google Maps Live & Fiche Véhicule Tout-en-Un",
  m1Desc: "Plus besoin de chercher dans des sous-menus : chaque carte véhicule dans la liste affiche directement en temps réel :",
  m1Point1: "Adresse exacte de la rue mise à jour automatiquement.",
  m1Point2: "Distance parcourue aujourd'hui (km) & Temps d'arrêt.",
  m1Point3: "Coût carburant du jour en MAD + vitesse maximale atteinte.",
  m1Point4: "Accès 1-clic à l'historique du véhicule et à Google Maps.",
  m1Btn: "Ouvrir la Carte Live",

  m2Badge: "Replay & Détection des Parkings",
  m2Title: "Tracé Aller / Retour Multicolore & Tous les Parkings avec Durée",
  m2Desc: "Lorsqu'un véhicule emprunte la même route à l'aller et au retour, Geofence sépare automatiquement les couleurs et affiche chaque stationnement :",
  m2Point1: "Aller en Bleu avec flèches directionnelles sur la route.",
  m2Point2: "Retour en Orange (et 3e passage en Violet) pour distinguer chaque passage.",
  m2Point3: "Badges Parkings (P1 · 25m, P2 · 1h 10m) posés sur la carte et listés avec heure d'arrivée, départ et adresse exacte.",

  m3Badge: "Carburant & Éco-Conduite (MAD)",
  m3Title: "Réduisez le Gaspillage Carburant & le Ralenti Moteur en Dirhams (MAD)",
  m3Desc: "Notre moteur d'analyse calcule automatiquement les pertes liées au ralenti moteur (climatisation/chauffage à l'arrêt) et aux excès de vitesse :",
  m3Point1: "Calcul personnalisable selon le prix du litre en MAD (ex: 13.5 MAD/L).",
  m3Point2: "Score Éco-Conduite (Notes A, B, C, D, E) attribué à chaque véhicule.",
  m3Point3: "Bilan carbone CO₂ et comparatif avec la période précédente.",

  m4Badge: "Centre de Rapports Automatisés",
  m4Title: "4 Rapports Complets Exportables en Excel (CSV) & PDF",
  m4Desc: "Obtenez en un clic tous vos bilans de flotte pour la comptabilité, la facturation ou le contrôle interne :",
  m4Point1: "Synthèse Flotte & Kilométrage : km, heures conduite, carburant MAD.",
  m4Point2: "Rapport Trajets & Parkings : chaque arrêt P1, P2... avec sa durée exacte.",
  m4Point3: "Rapport Survitesse & Conduite de Nuit (22h00 – 06h00).",

  m5Badge: "Zones Géographiques & Alertes",
  m5Title: "Géorepérage (Geofencing) & Alertes en Temps Réel",
  m5Desc: "Dessinez vos dépôts, chantiers, villes ou zones clients sur la carte et recevez une alerte immédiate à chaque événement :",
  m5Point1: "Entrée ou sortie de zone autorisée (Polygone ou Cercle).",
  m5Point2: "Dépassement de vitesse paramétrable & coupure d'alimentation externe.",

  m6Badge: "Immobilisation à Distance",
  m6Title: "Coupez ou Rétablissez le Moteur en 1 Clic depuis Votre Téléphone",
  m6Desc: "En cas de vol ou d'utilisation non autorisée hors horaires, immobilisez immédiatement le véhicule depuis l'interface Live Map.",
  m6TestCut: "Tester : Couper le Moteur (STOP ENGINE)",
  m6TestResume: "Tester : Rétablir le Moteur (RESUME ENGINE)",

  roiBadge: "Rentabilité Immédiate & Graphiques",
  roiTitle: "Calculez Vos Économies en Dirhams (MAD)",
  roiSubtitle: "En éliminant les trajets non autorisés, le ralenti excessif et la survitesse, nos clients réduisent leur budget carburant de 20% à 28% dès le premier mois.",
  roiSimTitle: "Simulateur d'Économies Flotte",
  roiVehiclesLabel: "Nombre de véhicules :",
  roiVehiclesCount: (c: number) => `${c} véhicules`,
  roiBudgetLabel: "Budget carburant mensuel / véhicule :",
  roiMonthlySavedLabel: "Économie Mensuelle Est.",
  roiYearlySavedLabel: "Économie Annuelle Est.",
  roiChartTitle: "Courbe de Dépense Carburant (Avant vs Avec Geofence)",
  roiChartSubtitle: (c: number) => `Suivi hebdomadaire en MAD sur une flotte de ${c} véhicules`,
  roiChartBadge: "-24% de coût carburant",
  roiChartNoGps: "Sans Suivi GPS (MAD)",
  roiChartWithTrackPro: "Avec Geofence (MAD)",
  chartDays: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],

  featHeader: "Une Suite Complète pour Tous Vos Véhicules",
  featSub: "Conçue pour les sociétés de transport, location de voitures, distribution, BTP et flottes d'entreprise au Maroc et en Europe.",
  feats: [
    {
      title: "Géolocalisation Temps Réel (WebSockets)",
      category: "Temps Réel",
      badge: "En Direct",
      desc: "Suivi ultra-fluide des véhicules sur Google Maps (Satellite, Hybride, Trafic) avec mise à jour continue chaque seconde, cap, allumage ACC et adresse exacte.",
    },
    {
      title: "Relecture Intelligente avec Saut des Arrêts (Skip Stops)",
      category: "Historique",
      badge: "Nouveau",
      desc: "Rejouez les trajets avec suppression automatique des longues heures de stationnement immobiles pour démarrer instantanément sans attente, avec vitesse réglable de 1x à 20x.",
    },
    {
      title: "Filtres Rapides 6h, 12h, 18h & 24h",
      category: "Historique",
      badge: "1-Clic",
      desc: "Accédez en un clic à l'activité des 6 dernières heures, 12h, 18h, de la journée ou d'hier sans avoir à configurer de calendrier.",
    },
    {
      title: "Détection Automatique des Parkings (P1, P2...)",
      category: "Stationnements",
      badge: "Précision",
      desc: "Repérage automatique de chaque arrêt sur la carte avec heure d'arrivée, heure de départ, adresse exacte et calcul de la durée totale d'immobilisation.",
    },
    {
      title: "Entretien, Vidange & Suivi d'Usure",
      category: "Maintenance",
      badge: "Automatisé",
      desc: "Carnet d'entretien digital avec barres de progression kilométrique, compte à rebours avant la prochaine vidange et alertes de révision préventive.",
    },
    {
      title: "Alerte Visite Technique Annuelle Obligatoire",
      category: "Légal",
      badge: "Conformité",
      desc: "Décompte des jours restants avant l'échéance légale de la visite technique avec rappels anticipés 30 jours à l'avance pour éviter amendes et immobilisations.",
    },
    {
      title: "Synchronisation du Compteur Réel Tableau de Bord",
      category: "Télémétrie",
      badge: "Calibrage",
      desc: "Saisie directe du kilométrage réel figurant sur le compteur de la voiture ou du camion. Les distances GPS parcourues s'y additionnent automatiquement.",
    },
    {
      title: "Coupure Moteur à Distance Anti-Vol",
      category: "Sécurité",
      badge: "Anti-Démarrage",
      desc: "Bloquez ou autorisez le démarrage de vos véhicules à distance en 1 clic depuis l'ordinateur ou le smartphone, avec sécurité anti-coupure en roulement.",
    },
    {
      title: "Géocônes & Clôtures Virtuelles (Geofencing)",
      category: "Périmètres",
      badge: "Zones",
      desc: "Délimitez des zones géographiques (dépôts, entrepôts, villes, chantiers) et recevez des alertes instantanées dès qu'un véhicule entre ou sort.",
    },
    {
      title: "Gestion Carburant & Éco-Conduite en MAD",
      category: "Rentabilité",
      badge: "Économie",
      desc: "Calcul quotidien et mensuel de la consommation réelle et du carburant gaspillé au ralenti chiffré en Dirhams (MAD), avec score de conduite A à E.",
    },
    {
      title: "Application Mobile Dédiée iOS & Android",
      category: "Mobilité",
      badge: "App Mobile",
      desc: "Pilotez votre flotte partout avec notre application mobile native Geofence GPS : suivi en direct, liste des véhicules et alertes push instantanées.",
    },
    {
      title: "Espace Client & Mode Support « Voir en tant que client »",
      category: "Support",
      badge: "Multi-Tenant",
      desc: "Portail sécurisé pour chaque gérant et mode support super-admin pour assister vos clients directement sans jamais modifier ni demander leur mot de passe.",
    },
    {
      title: "Personnalisation Véhicule, Chauffeur & Photos",
      category: "Flotte",
      badge: "Sur-Mesure",
      desc: "Attribuez des chauffeurs, donnez des surnoms à vos véhicules et uploadez les photos réelles de vos véhicules ou choisissez parmi nos presets élégants.",
    },
    {
      title: "Rapports Analytiques & Exports Excel (CSV) / PDF",
      category: "Décisionnel",
      badge: "Exports",
      desc: "Téléchargez des bilans complets : récapitulatifs des kilomètres, temps de route, survitesse, heures de travail et historiques des alertes compatibles comptabilité.",
    },
    {
      title: "Passerelle TCP Haute Vitesse Multi-Constructeurs",
      category: "Matériel",
      badge: "Port 5001",
      desc: "Compatibilité universelle avec toutes les balises du marché (Concox/Jimi GT06 & VL02, Teltonika, Coban TK103, Sinotrack, Micodus) pour autos, camions et motos.",
    },
  ],

  hwBadge: "Compatibilité Multi-Constructeurs",
  hwTitle: "Compatible avec Tous Vos Boîtiers GPS & Tous Types de Véhicules",
  hwSubtitle: "Notre serveur TCP haute performance décrypte nativement les protocoles des traceurs GPS les plus utilisés au Maroc et en Europe :",
  hwBtnPrimary: "Connecter mes véhicules",
  hwBtnSecondary: "Espace Client",

  faqBadge: "Foire Aux Questions · FAQ",
  faqTitle: "Questions Fréquentes sur la Géolocalisation Geofence GPS",
  faqSubtitle: "Tout ce que vous devez savoir pour équiper, suivre et sécuriser votre flotte en direct :",
  faqItems: [
    {
      q: "Comment fonctionne la géolocalisation en temps réel de Geofence GPS ?",
      a: "Un boîtier traceur GPS (Teltonika, Coban, Concox ou OBD) est installé dans chaque véhicule. Il transmet en continu sa position, sa vitesse, l'état du contact moteur et ses alertes. Notre interface web et mobile affiche instantanément vos véhicules sur Google Maps avec l'adresse exacte et l'état en direct.",
    },
    {
      q: "Comment fonctionne la coupure du moteur à distance en cas de vol ?",
      a: "Depuis votre tableau de bord ou votre smartphone, vous pouvez activer la coupure moteur en un seul clic. Pour garantir une sécurité absolue et éviter tout accident sur route, l'ordre d'immobilisation s'exécute dès que la vitesse du véhicule descend sous 20 km/h.",
    },
    {
      q: "Comment Geofence permet-il de réduire les coûts de carburant ?",
      a: "Geofence calcule le coût précis du carburant gaspillé lors des arrêts prolongés moteur allumé (ralenti / idling) ainsi que les excès de vitesse. Nos clients constatent en moyenne 20% à 25% d'économies mensuelles sur leur facture carburant.",
    },
    {
      q: "Quels types de traceurs GPS sont compatibles avec la plateforme ?",
      a: "La plateforme est universelle et supporte les protocoles Teltonika (FMB920, FMC130...), Coban (TK103, TK303, TK403), Concox / Jimi IoT (GT06N, VL03), traceurs OBD-II sans fil, ainsi que notre application mobile pour smartphones.",
    },
    {
      q: "Geofence GPS fonctionne-t-il au Maroc et à l'international ?",
      a: "Oui, notre solution fonctionne sur l'ensemble du territoire marocain (avec cartes SIM nationales multi-opérateurs) ainsi qu'en Europe et en Afrique grâce à la connectivité roaming internationale.",
    },
  ],

  footerRights: "Tous droits réservés.",
  footerLogin: "Connexion",
  footerRegister: "Inscription",
};

const en: LandingDict = {
  locale: 'en-US',
  badge: "Next-Gen GPS Fleet Management & Telemetry Platform · Live 24/7",
  title1: "Total Control Over Your Entire Fleet.",
  title2: "Live Tracking, Fuel Analytics (MAD) & Security.",
  subtitle:
    "Monitor every vehicle in real time: live street addresses, multi-color outbound/return trip history, automatic parking detection with exact duration, fuel waste analytics in MAD, Excel/PDF reports, and 1-click remote engine cut-off.",
  ctaPrimary: "Start Free Trial",
  ctaSecondary: "Sign In to Fleet",
  navFeatures: "Features",
  navPlatform: "Platform Tour",
  navAnalytics: "Charts & ROI",
  navHardware: "GPS Hardware",
  stats: [
    { value: "99.98%", label: "Real-Time Uptime & SLA" },
    { value: "-28%", label: "Average Fuel & Idle Cost Reduction" },
    { value: "< 1 sec", label: "Live Socket Telemetry Latency" },
    { value: "24/7", label: "Remote Immobilizer & Alerts" },
  ],
  heroTourBtn: "Explore Full Platform",
  liveSocketConnected: "● LIVE SOCKET CONNECTED",

  callUsText: "Sales & Support:",
  phoneNumber: "0661176946",

  heroLiveStatus: "Dacia Duster · Moving",
  heroLiveAddress: "Highway A1, Casablanca → Rabat",
  heroLiveTodayKm: "142.8 km today",
  heroLiveTodayCost: "≈ 154 MAD",

  heroCard2Title: "Parking Detection & Round Trips",
  heroCard2Stop: "Stop P1: 10:15 → 10:40 (25 min)",
  heroCard2Aller: "Outbound",
  heroCard2Retour: "Return",
  heroCard2Third: "3rd Pass",

  heroCard3Title: "Security & Engine Cut-Off",
  heroCard3Sub: "Instant command via GPRS/SMS relay",
  heroCard3Safety: "✓ Speed-safe automatic immobilizer",
  heroCard3Btn: "STOP ENGINE",

  tourBadge: "Interactive Platform Tour",
  tourTitle: "Everything Our Platform Delivers for Your Fleet",
  tourSubtitle: "Click on each module below to view live screens, indicators, and tools built into your client portal.",

  tab1: "1. Live Map 24/7",
  tab2: "2. History & Parkings",
  tab3: "3. Fuel & Eco (MAD)",
  tab4: "4. Excel/PDF Reports",
  tab5: "5. Geofences & Alerts",
  tab6: "6. Engine Cut-Off",

  m1Badge: "Real-Time GPS Tracking",
  m1Title: "Google Maps Live Canvas & All-in-One Vehicle Cards",
  m1Desc: "No need to browse deep submenus: every vehicle card displays live data right away:",
  m1Point1: "Exact street address resolved and updated in real time.",
  m1Point2: "Daily mileage (km) & current stop/idle duration.",
  m1Point3: "Estimated fuel cost today in MAD + maximum speed reached.",
  m1Point4: "1-click direct link to vehicle history and Google Maps.",
  m1Btn: "Open Live Map",

  m2Badge: "Route Replay & Parking Detection",
  m2Title: "Multi-Color Outbound/Return Tracks & Exact Parking Duration",
  m2Desc: "When a vehicle uses the same road on the way back, Geofence splits colors automatically and flags every stop:",
  m2Point1: "Outbound in Blue with direction arrows on roads.",
  m2Point2: "Return in Orange (and 3rd pass in Purple) to separate round trips.",
  m2Point3: "Parking Badges (P1 · 25m, P2 · 1h 10m) pinned on map with arrival, departure, and street address.",

  m3Badge: "Fuel & Eco-Driving (MAD)",
  m3Title: "Cut Fuel Waste & Engine Idling Costs in Dirhams (MAD)",
  m3Desc: "Our analytics engine tracks excessive idling (AC/heating while stopped) and speeding:",
  m3Point1: "Customizable diesel price in MAD (e.g. 13.5 MAD/L).",
  m3Point2: "Eco-driving rating (Grades A, B, C, D, E) assigned to each vehicle.",
  m3Point3: "CO₂ carbon footprint and comparison with previous period.",

  m4Badge: "Automated Reporting Center",
  m4Title: "4 Comprehensive Reports Exportable in Excel (CSV) & PDF",
  m4Desc: "Generate fleet reports in 1 click for accounting, customer billing, or audits:",
  m4Point1: "Fleet & Mileage Summary: km, driving hours, fuel spend in MAD.",
  m4Point2: "Trips & Parkings Log: every stop P1, P2... with exact duration.",
  m4Point3: "Speeding & Night Driving Log (22:00 – 06:00).",

  m5Badge: "Geofencing & Alerts",
  m5Title: "Geofence Corridors & Real-Time Security Alerts",
  m5Desc: "Draw depots, job sites, cities or restricted areas on the map and get alerted instantly:",
  m5Point1: "Authorized zone entry or exit (Polygon or Circle).",
  m5Point2: "Configurable speed violations & power cut alarms.",

  m6Badge: "Remote Immobilizer",
  m6Title: "Cut or Resume Engine in 1 Click from Your Phone",
  m6Desc: "In case of theft or unauthorized night use, immobilize the vehicle instantly from the Live Map.",
  m6TestCut: "Test: Cut Engine (STOP ENGINE)",
  m6TestResume: "Test: Restore Engine (RESUME ENGINE)",

  roiBadge: "Instant ROI & Financial Projections",
  roiTitle: "Calculate Your Fleet Savings in Dirhams (MAD)",
  roiSubtitle: "By eliminating unauthorized trips, excessive idling, and speeding, our clients save 20% to 28% on fuel from month one.",
  roiSimTitle: "Fleet ROI Simulator",
  roiVehiclesLabel: "Number of vehicles:",
  roiVehiclesCount: (c: number) => `${c} vehicles`,
  roiBudgetLabel: "Monthly fuel budget / vehicle:",
  roiMonthlySavedLabel: "Est. Monthly Savings",
  roiYearlySavedLabel: "Est. Annual Savings",
  roiChartTitle: "Fuel Spend Trend (Without vs With Geofence)",
  roiChartSubtitle: (c: number) => `Weekly spend in MAD for a fleet of ${c} vehicles`,
  roiChartBadge: "-24% fuel cost reduction",
  roiChartNoGps: "Without GPS Tracking (MAD)",
  roiChartWithTrackPro: "With Geofence (MAD)",
  chartDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],

  featHeader: "An All-in-One Suite for Your Entire Fleet",
  featSub: "Tailored for logistics, car rental, delivery, construction, and enterprise fleets in Morocco and Europe.",
  feats: [
    {
      title: "Real-Time Tracking (WebSockets)",
      category: "Real-Time",
      badge: "Live 24/7",
      desc: "Fluid vehicle movement on Google Maps (Satellite, Hybrid, Traffic) with continuous updates every second, heading, ACC status, and exact street address.",
    },
    {
      title: "Smart Route Replay with Skip Stops",
      category: "Routes",
      badge: "New",
      desc: "Replay routes while automatically skipping long stationary parking hours to start moving immediately with variable speeds from 1x to 20x.",
    },
    {
      title: "Quick Time Filters 6h, 12h, 18h & 24h",
      category: "History",
      badge: "1-Click",
      desc: "Instant 1-click access to vehicle activity over the last 6 hours, 12h, 18h, today, or yesterday without manual calendar selection.",
    },
    {
      title: "Automatic Parking & Stop Detection (P1, P2...)",
      category: "Parking",
      badge: "Precision",
      desc: "Visual parking pins on map with exact arrival time, departure time, street address, and cumulative stopped duration.",
    },
    {
      title: "Automated Maintenance & Oil Changes",
      category: "Maintenance",
      badge: "Automated",
      desc: "Digital service logbook with mileage progress bars, countdowns to the next engine oil change, and preventive maintenance alerts.",
    },
    {
      title: "Mandatory Annual Technical Inspection Alert",
      category: "Legal",
      badge: "Compliance",
      desc: "Countdown of remaining days before legal vehicle inspection expiration with 30-day advance alerts to prevent fines or impoundment.",
    },
    {
      title: "Real Dashboard Odometer Synchronization",
      category: "Telemetry",
      badge: "Calibration",
      desc: "Direct calibration matching the physical odometer mileage displayed on your car or truck dashboard, auto-incremented with every GPS trip.",
    },
    {
      title: "Remote Engine Cut-Off (Anti-Theft)",
      category: "Security",
      badge: "Immobilizer",
      desc: "Disable or restore vehicle starter remotely in 1 click from desktop or mobile, with intelligent safety lockout while driving.",
    },
    {
      title: "Virtual Geofencing & Smart Perimeters",
      category: "Perimeters",
      badge: "Zones",
      desc: "Create custom polygonal or circular zones (depots, warehouses, cities, work sites) and receive instant entry and exit alerts.",
    },
    {
      title: "Fuel & Idle Cost Analytics in MAD",
      category: "ROI",
      badge: "Savings",
      desc: "Daily and monthly tracking of fuel consumption and idling waste calculated in Moroccan Dirhams (MAD) with driver eco-scores A to E.",
    },
    {
      title: "Dedicated iOS & Android Mobile App",
      category: "Mobility",
      badge: "Mobile App",
      desc: "Manage your entire fleet anywhere with our native Geofence GPS mobile app: live vehicle map, real-time lists, and instant push notifications.",
    },
    {
      title: "Client Portal & 'View as Client' Support Mode",
      category: "Support",
      badge: "Multi-Tenant",
      desc: "Secure multi-tenant portal for every client company, with super-admin support mode to troubleshoot with clients with zero password resets.",
    },
    {
      title: "Vehicle, Driver & Photo Customization",
      category: "Fleet",
      badge: "Tailored",
      desc: "Assign drivers to vehicles, set custom fleet nicknames, and upload authentic vehicle photos or choose from stylish presets.",
    },
    {
      title: "Analytical Reports & Excel (CSV) / PDF Exports",
      category: "Analytics",
      badge: "Exports",
      desc: "Export comprehensive activity reports in 1 click: mileage summaries, driving hours, max speed, and alert journals ready for accounting.",
    },
    {
      title: "High-Speed Multi-Tracker TCP Gateway",
      category: "Hardware",
      badge: "Port 5001",
      desc: "Native compatibility with all tracker protocols (Concox/Jimi GT06 & VL02, Teltonika, Coban TK103, Sinotrack, Micodus) for cars, trucks, and bikes.",
    },
  ],

  hwBadge: "Universal Hardware Support",
  hwTitle: "Compatible with All Major GPS Trackers & Vehicles",
  hwSubtitle: "Our high-speed TCP ingestion gateway natively decodes popular GPS protocols used across Morocco and Europe:",
  hwBtnPrimary: "Connect My Vehicles",
  hwBtnSecondary: "Client Portal",

  faqBadge: "Frequently Asked Questions · FAQ",
  faqTitle: "Frequently Asked Questions About Geofence GPS Fleet Tracking",
  faqSubtitle: "Everything you need to know about outfitting, monitoring, and securing your fleet:",
  faqItems: [
    {
      q: "How does real-time GPS fleet tracking work on Geofence?",
      a: "A GPS tracker (Teltonika, Coban, Concox, or OBD-II) is installed in each vehicle. It transmits second-by-second position, speed, ignition status, and alarms over cellular networks to our platform. You monitor your entire fleet live on Google Maps with street addresses and real-time status.",
    },
    {
      q: "How does remote engine cut-off work in case of theft?",
      a: "From your dashboard or mobile app, you can trigger remote engine immobilisation with a single tap. For maximum road safety, the command executes once vehicle speed drops below 20 km/h, safely preventing restarts.",
    },
    {
      q: "How does Geofence help reduce fleet fuel costs?",
      a: "Geofence tracks excessive idling with the engine on, harsh accelerations, and unauthorized trips. We calculate wasted fuel in real currency (MAD), helping fleets reduce overall fuel expenses by 20% to 25% on average.",
    },
    {
      q: "Which GPS hardware devices are supported?",
      a: "Geofence supports industry-leading GPS devices from Teltonika, Coban, Concox, plug-and-play OBD-II devices, and our dedicated mobile application for smartphones.",
    },
    {
      q: "Does Geofence work across Europe, Morocco, and Africa?",
      a: "Yes. Our platform operates seamlessly across Morocco, Europe, and Africa with global multi-network roaming SIM support and cloud-scale telemetry servers.",
    },
  ],

  footerRights: "All rights reserved.",
  footerLogin: "Sign In",
  footerRegister: "Sign Up",
};

const ar: LandingDict = {
  locale: 'ar-MA',
  badge: "منصة تتبع الأسطول الذكية والقياس عن بعد · تعمل على مدار الساعة 24/7",
  title1: "تحكم كامل وشامل في أسطول مركباتك.",
  title2: "تتبع مباشر، توفير الوقود بالدرهم وأمان فائق.",
  subtitle:
    "راقب كل مركبة في الوقت الفعلي: عناوين الشوارع المباشرة، سجل المسارات بألوان مختلفة للذهاب والإياب، كشف تلقائي لجميع التوقفات مع المدة الدقيقة، تحليل استهلاك الوقود بالدرهم (MAD)، تقارير Excel/PDF وإيقاف المحرك عن بُعد بنقرة واحدة.",
  ctaPrimary: "إنشاء حساب مجاني",
  ctaSecondary: "تسجيل الدخول للمنصة",
  navFeatures: "المميزات",
  navPlatform: "استعراض المنصة",
  navAnalytics: "الرسوم البيانية والتوفير",
  navHardware: "أجهزة GPS",
  stats: [
    { value: "99.98%", label: "جاهزية الخوادم والاتصال المباشر" },
    { value: "-28%", label: "توفير في استهلاك الوقود والتباطؤ" },
    { value: "< 1 ثانية", label: "تحديث فوري عبر WebSockets" },
    { value: "24/7", label: "حماية ضد السرقة وإيقاف المحرك" },
  ],
  heroTourBtn: "اكتشف جميع ميزات المنصة",
  liveSocketConnected: "● الاتصال المباشر نشط",

  callUsText: "خدمة الزبناء والمبيعات:",
  phoneNumber: "0661176946",

  heroLiveStatus: "داسيا داستر · في حركة",
  heroLiveAddress: "الطريق السيار A1، الدار البيضاء ← الرباط",
  heroLiveTodayKm: "142.8 كم اليوم",
  heroLiveTodayCost: "≈ 154 درهم",

  heroCard2Title: "كشف التوقفات ومسار الذهاب / الإياب",
  heroCard2Stop: "توقف P1: 10:15 ← 10:40 (25 دقيقة)",
  heroCard2Aller: "ذهاب",
  heroCard2Retour: "إياب",
  heroCard2Third: "مرور ثالث",

  heroCard3Title: "الأمان وإيقاف المحرك عن بُعد",
  heroCard3Sub: "أمر فوري عبر مرحل GPRS/SMS",
  heroCard3Safety: "✓ حماية تلقائية تمنع الإيقاف في السرعات العالية",
  heroCard3Btn: "إيقاف المحرك",

  tourBadge: "جولة تفاعلية في المنصة",
  tourTitle: "كل ما تقدمه منصتنا لإدارة أسطولك باحترافية",
  tourSubtitle: "انقر على كل وحدة أدناه للاطلاع على الشاشات والمؤشرات والبيانات الحقيقية المدمجة في حسابك.",

  tab1: "1. الخريطة المباشرة 24/7",
  tab2: "2. السجل والتوقفات",
  tab3: "3. الوقود (بالدرهم MAD)",
  tab4: "4. تقارير Excel/PDF",
  tab5: "5. المناطق والتنبيهات",
  tab6: "6. إيقاف المحرك",

  m1Badge: "تتبع GPS في الوقت الفعلي",
  m1Title: "خريطة Google Maps حية وبطاقة مركبة شاملة",
  m1Desc: "لا داعي للبحث في القوائم المعقدة: تعرض كل بطاقة مركبة بياناتها المباشرة بوضوح:",
  m1Point1: "عنوان الشارع الدقيق يتم تحديثه تلقائياً في الوقت الفعلي.",
  m1Point2: "المسافة المقطوعة اليوم (كم) ومدة التوقف.",
  m1Point3: "تكلفة الوقود التقديرية لليوم بالدرهم + أقصى سرعة مسجلة.",
  m1Point4: "رابط مباشر بنقرة واحدة لسجل المسار وخرائط Google.",
  m1Btn: "فتح الخريطة المباشرة",

  m2Badge: "إعادة عرض المسار وكشف التوقفات",
  m2Title: "مسار ذهاب وإياب بألوان متعددة وتحديد مدة كل توقف",
  m2Desc: "عندما تسلك المركبة نفس الطريق ذهاباً وإياباً، يفصل Geofence الألوان تلقائياً ويحدد كل توقف:",
  m2Point1: "مسار الذهاب باللون الأزرق مع أسهم اتجاه السير.",
  m2Point2: "مسار الإياب باللون البرتقالي (والمرور الثالث بالبنفسجي) لتمييز كل رحلة بدقة.",
  m2Point3: "شارات التوقف (P1 · 25m, P2 · 1h 10m) موضوعة على الخريطة ومسجلة مع وقت الوصول والانطلاق والعنوان.",

  m3Badge: "الوقود والقيادة الاقتصادية (بالدرهم MAD)",
  m3Title: "تقليل هدر الوقود وساعات دوران المحرك دون حركة بالدرهم (MAD)",
  m3Desc: "يقوم محرك التحليل بحساب الخسائر الناتجة عن تشغيل المحرك أثناء التوقف (المكيف) والسرعة الزائدة:",
  m3Point1: "حساب مخصص بناءً على سعر اللتر بالدرهم المغربي (مثال: 13.5 درهم/لتر).",
  m3Point2: "تقييم القيادة الاقتصادية (درجات A, B, C, D, E) لكل سائق ومركبة.",
  m3Point3: "حساب البصمة الكربونية CO₂ ومقارنتها مع الفترة السابقة.",

  m4Badge: "مركز التقارير الآلية",
  m4Title: "4 تقارير شاملة قابلة للتصدير بصيغة Excel (CSV) و PDF",
  m4Desc: "احصل بنقرة واحدة على جميع بيانات أسطولك للمحاسبة أو الفوترة أو الرقابة الداخلية:",
  m4Point1: "ملخص الأسطول والمسافات: الكيلومترات، ساعات القيادة، تكلفة الوقود بالدرهم.",
  m4Point2: "تقرير الرحلات والتوقفات: تفاصيل كل توقف P1, P2... مع مدته الدقيقة.",
  m4Point3: "تقرير تجاوز السرعة والقيادة الليلية (من 22:00 إلى 06:00).",

  m5Badge: "السياج الجغرافي والتنبيهات",
  m5Title: "المناطق الجغرافية (Geofences) والتنبيهات الفورية",
  m5Desc: "ارسم المستودعات أو مواقع العمل أو المدن على الخريطة واستلم تنبيهاً فورياً عند كل حدث:",
  m5Point1: "دخول أو خروج من المناطق المحددة (مضلع أو دائرة).",
  m5Point2: "تنبيهات تجاوز السرعة المحددة وفصل الطاقة الخارجية عن الجهاز.",

  m6Badge: "التعطيل والأمان عن بُعد",
  m6Title: "إيقاف أو إعادة تشغيل المحرك بنقرة واحدة من هاتفك",
  m6Desc: "في حالة السرقة أو الاستخدام غير المصرح به، عطّل حركة المركبة فوراً من واجهة الخريطة.",
  m6TestCut: "تجربة: إيقاف المحرك (STOP ENGINE)",
  m6TestResume: "تجربة: إعادة تشغيل المحرك (RESUME ENGINE)",

  roiBadge: "عائد فوري وحسابات مالية دقيقة",
  roiTitle: "احسب مدخراتك السنوية بالدرهم المغربي (MAD)",
  roiSubtitle: "من خلال القضاء على الرحلات غير المصرح بها والتباطؤ الزائد والسرعة، يوفر عملاؤنا من 20% إلى 28% من ميزانية الوقود ابتداءً من الشهر الأول.",
  roiSimTitle: "حاسبة توفير الأسطول",
  roiVehiclesLabel: "عدد المركبات:",
  roiVehiclesCount: (c: number) => `${c} مركبة`,
  roiBudgetLabel: "ميزانية الوقود الشهرية لكل مركبة:",
  roiMonthlySavedLabel: "التوفير الشهري المتوقع",
  roiYearlySavedLabel: "التوفير السنوي المتوقع",
  roiChartTitle: "منحنى تكاليف الوقود (قبل وبعد Geofence)",
  roiChartSubtitle: (c: number) => `المتابعة الأسبوعية بالدرهم لأسطول مكون من ${c} مركبة`,
  roiChartBadge: "-24% خفض تكاليف الوقود",
  roiChartNoGps: "بدون نظام تتبع GPS (MAD)",
  roiChartWithTrackPro: "مع Geofence (MAD)",
  chartDays: ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],

  featHeader: "مجموعة أدوات متكاملة لجميع مركباتك",
  featSub: "مصممة لشركات النقل، كراء السيارات، التوزيع، البناء، وإدارة أساطيل الشركات في المغرب وأوروبا.",
  feats: [
    {
      title: "تتبع فوري ودقيق (WebSockets)",
      category: "مباشر 24/7",
      badge: "لحظي",
      desc: "حركة سلسة ومباشرة للمركبات على خرائط Google (الأقمار الصناعية، الهجين، حركة المرور) مع تحديث فوري كل ثانية، الاتجاه، وحالة المحرك والعنوان الدقيق.",
    },
    {
      title: "إعادة تشغيل ذكية للمسارات مع تجاوز التوقفات",
      category: "المسارات",
      badge: "جديد",
      desc: "إعادة تشغيل تفاعلية للمسار مع تخطي ساعات التوقف الطويلة آلياً للبدء بالحركة فوراً دون انتظار، مع إمكانية تسريع الحركة من 1x حتى 20x.",
    },
    {
      title: "فلاتر سريعة لآخر 6 ساعات، 12، 18 و 24 ساعة",
      category: "السجل",
      badge: "بنقرة واحدة",
      desc: "الاطلاع الفوري على نشاط المركبة خلال آخر 6 ساعات أو 12 أو 18 أو 24 ساعة أو اليوم أو الأمس دون الحاجة لتحديد التواريخ يدوياً.",
    },
    {
      title: "كشف تلقائي لجميع التوقفات مع مدتها بدقة",
      category: "التوقفات",
      badge: "دقة متناهية",
      desc: "شارات P1, P2... مباشرة على الخريطة توضح مدة التوقف، وقت الوصول، وقت المغادرة، العنوان الدقيق وحساب إجمالي وقت التوقف.",
    },
    {
      title: "جدولة الصيانة الدورية وتغيير الزيت آلياً",
      category: "الصيانة",
      badge: "آلي",
      desc: "سجل صيانة رقمي متكامل مع أشرطة تقدم للكيلومترات، عداد تنازلي للموعد القادم لتغيير الزيت وتنبيهات استباقية قبل فوات الأوان.",
    },
    {
      title: "تنبيه الفحص التقني السنوي الإجباري",
      category: "قانوني",
      badge: "التزام رسمي",
      desc: "عداد تنازلي يومي لموعد انتهاء صلاحية الفحص التقني للمركبة مع تنبيهات مسبقة قبل 30 يوماً لتفادي الغرامات والحجز.",
    },
    {
      title: "مزامنة العداد الحقيقي للوحة القيادة",
      category: "القياس",
      badge: "معايرة",
      desc: "إدخال مباشر لرقم الكيلومتراج الفعلي الظاهر على لوحة قيادة السيارة أو الشاحنة، مع زيادة المسافات المقطوعة عبر GPS تلقائياً وبدقة.",
    },
    {
      title: "إيقاف المحرك عن بُعد (حماية ضد السرقة)",
      category: "الأمان",
      badge: "حماية المحرك",
      desc: "منع أو السماح بتشغيل المركبة عن بُعد بنقرة واحدة من الكمبيوتر أو الهاتف الذكي، مع نظام أمان ذكي يمنع الإيقاف أثناء السير السريع.",
    },
    {
      title: "سياج جغرافي ومناطق افتراضية ذكية",
      category: "المناطق",
      badge: "تنبيهات",
      desc: "رسم مناطق جغرافية مخصصة (مستودعات، أوراش عمل، مدن) والحصول على إشعارات فورية عند دخول أو خروج أي مركبة.",
    },
    {
      title: "إدارة الوقود وحساب الهدر بالدرهم (MAD)",
      category: "الاقتصاد",
      badge: "توفير",
      desc: "حساب استهلاك الوقود الفعلي وكشف الهدر أثناء تشغيل المحرك والسيارة متوقفة، محسوبة بالدرهم المغربي مع بطاقة كفاءة السائق A–E.",
    },
    {
      title: "تطبيق مخصص للهواتف الذكية iOS و Android",
      category: "تطبيقات",
      badge: "Geofence App",
      desc: "متابعة أسطولك من أي مكان عبر تطبيق الهاتف الذكي مع إشعارات فورية في حال حدوث اصطدام أو حركة مشبوهة أو سحب المركبة.",
    },
    {
      title: "فضاء زبناء آمن ووضع الدعم الفني « معاينة كزبون »",
      category: "الدعم",
      badge: "متعدد الحسابات",
      desc: "بوابة منفصلة وآمنة لكل شركة مع وضع الدعم الفني المباشر للمشرف العام لحل استفسارات الزبناء دون طلب أو تغيير كلمات المرور.",
    },
    {
      title: "تخصيص المركبات، تعيين السائقين وإضافة الصور",
      category: "الأسطول",
      badge: "مخصص",
      desc: "ربط كل سيارة باسم السائق المسؤول عنها، تسمية السيارات بأسماء خاصة وإمكانية رفع صور حقيقية للسيارات أو الاختيار من النماذج.",
    },
    {
      title: "تقارير تحليلية شاملة وتصدير بصيغ Excel و PDF",
      category: "التقارير",
      badge: "تصدير",
      desc: "تصدير فوري لكشوفات النشاط الشاملة: الكيلومترات المقطوعة، ساعات العمل، السرعة القصوى وسجل التنبيهات بضغطة زر واحدة.",
    },
    {
      title: "بوابة استقبال متعددة الأجهزة عبر TCP Port 5001",
      category: "الأجهزة",
      badge: "توافق شامل",
      desc: "توافق أصلي مع جميع أجهزة التتبع (Concox/Jimi GT06, Teltonika, Coban TK103, Sinotrack, Micodus) للسيارات والشاحنات والدراجات.",
    },
  ],

  hwBadge: "توافق مع جميع الأجهزة والمصنعين",
  hwTitle: "متوافق مع جميع أجهزة تتبع GPS وجميع أنواع السيارات والشاحنات",
  hwSubtitle: "تدعم خوادمنا بروتوكولات أشهر أجهزة التتبع المستخدمة في المغرب وأوروبا بشكل أصلي وسلس:",
  hwBtnPrimary: "ربط مركباتي بالمنصة",
  hwBtnSecondary: "فضاء الزبناء",

  faqBadge: "الأسئلة الشائعة · FAQ",
  faqTitle: "الأسئلة الأكثر تداولاً حول منصة تتبع السيارات Geofence GPS",
  faqSubtitle: "كل ما تحتاج معرفته حول تجهيز وإدارة أسطول سياراتك وشاحناتك بكل أمان واحترافية:",
  faqItems: [
    {
      q: "كيف يعمل نظام تتبع المركبات في الوقت الفعلي عبر Geofence؟",
      a: "يتم تثبيت جهاز تتبع GPS (مثل Teltonika أو Coban أو Concox أو منفذ OBD) داخل المركبة. يرسل الجهاز الإحداثيات والسرعة وحالة المحرك مباشرة إلى خوادمنا، مما يتيح لك رؤية أسطولك مباشرة على خرائط Google مع العنوان الدقيق وحالة كل مركبة.",
    },
    {
      q: "كيف يعمل إيقاف المحرك عن بُعد في حالة السرقة أو الطوارئ؟",
      a: "بإمكانك إرسال أمر إيقاف المحرك بنقرة واحدة من هاتفك الذكي أو لوحة التحكم. ولضمان السلامة المرورية وتجنب الحوادث، يتم إيقاف المحرك تلقائياً وبأمان بمجرد انخفاض سرعة السيارة إلى أقل من 20 كم/ساعة.",
    },
    {
      q: "كيف تساعد منصة Geofence في توفير استهلاك الوقود؟",
      a: "تقوم المنصة بحساب كمية الوقود المهدرة أثناء تشغيل المحرك في وضع التوقف (الاستهلاك أثناء الوقوف) بالإضافة إلى تنبيهات السرعة الزائدة، مما يمنحك تقارير بالدرهم المغربي ويساعدك في خفض فاتورة المحروقات بنسبة تصل إلى 25%.",
    },
    {
      q: "ما هي أجهزة التتبع المتوافقة مع منصة Geofence؟",
      a: "المنصة متوافقة مع أشهر وأفضل الماركات العالمية مثل Teltonika (FMB920, FMC130)، Coban (TK103, TK303)، Concox / Jimi IoT، وأجهزة OBD السريعة التركيب، بالإضافة إلى تطبيق الهاتف المحمول.",
    },
    {
      q: "هل تعمل المنصة داخل المغرب وخارجه في أوروبا وإفريقيا؟",
      a: "نعم، تغطي المنصة جميع مدن وطرق المملكة المغربية، وتعمل أيضاً في أوروبا وإفريقيا عبر شرائح الاتصال الدولية متعددة المشغلين مع تجوال سلس بدون انقطاع.",
    },
  ],

  footerRights: "جميع الحقوق محفوظة.",
  footerLogin: "تسجيل الدخول",
  footerRegister: "تسجيل جديد",
};

export function getLandingDict(lang: Language): LandingDict {
  if (lang === 'ar') return ar;
  if (lang === 'en') return en;
  return fr;
}
