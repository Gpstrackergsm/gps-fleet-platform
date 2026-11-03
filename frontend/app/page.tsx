"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Shield,
  Activity,
  Car,
  Fuel,
  Clock,
  Route,
  Gauge,
  BarChart2,
  Lock,
  Power,
  CheckCircle2,
  BellRing,
  Download,
  Compass,
  Navigation,
  Sparkles,
  TrendingDown,
  Smartphone,
  Cpu,
  Globe,
  Play,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { useLanguage } from "@/lib/LanguageContext";

// ── Sample Data for Interactive Charts ───────────────────────────────────────
const FUEL_TREND_DATA = [
  { day: "Lun", avant: 1450, avecTrackPro: 980, km: 620 },
  { day: "Mar", avant: 1620, avecTrackPro: 1090, km: 710 },
  { day: "Mer", avant: 1380, avecTrackPro: 920, km: 590 },
  { day: "Jeu", avant: 1790, avecTrackPro: 1150, km: 780 },
  { day: "Ven", avant: 1910, avecTrackPro: 1210, km: 830 },
  { day: "Sam", avant: 1120, avecTrackPro: 740, km: 490 },
  { day: "Dim", avant: 680, avecTrackPro: 430, km: 310 },
];

const FLEET_SCORES_DATA = [
  { vehicle: "Dacia Logan", score: 94, idleMin: 12, speedKm: 2, costMad: 385 },
  { vehicle: "Renault Express", score: 88, idleMin: 24, speedKm: 6, costMad: 440 },
  { vehicle: "Peugeot Partner", score: 82, idleMin: 35, speedKm: 11, costMad: 510 },
  { vehicle: "Mercedes Sprinter", score: 91, idleMin: 18, speedKm: 4, costMad: 690 },
  { vehicle: "Citroën Berlingo", score: 76, idleMin: 48, speedKm: 19, costMad: 495 },
];

type ShowcaseTab = "live" | "history" | "fuel" | "reports" | "geofence" | "security";

export default function Home() {
  const { language, isRTL } = useLanguage();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const [activeTab, setActiveTab] = useState<ShowcaseTab>("live");
  const [fleetSize, setFleetSize] = useState<number>(15);
  const [monthlyFuelPerVehicle, setMonthlyFuelPerVehicle] = useState<number>(3500);
  const [engineCutDemo, setEngineCutDemo] = useState<boolean>(false);

  // Multilingual Copy (FR / EN / AR)
  const copy = useMemo(() => {
    if (language === "ar") {
      return {
        badge: "منصة تتبع الأسطول الذكية رقم 1 — تعمل على مدار الساعة 24/7",
        title1: "تحكم كامل في أسطول مركباتك",
        title2: "تتبع مباشر، توفير الوقود بالدرهم وأمان فائق",
        subtitle:
          "منصة متكاملة لإدارة السيارات والشاحنات: خريطة حية بدقة عالية، سجل المسارات (ذهاب/إياب بألوان مختلفة)، كشف جميع التوقفات مع المدة، تحليل استهلاك الوقود (MAD)، وإيقاف المحرك عن بُعد.",
        ctaPrimary: "ابدأ الآن مجاناً",
        ctaSecondary: "تسجيل الدخول للمنصة",
        navFeatures: "المميزات",
        navPlatform: "استعراض المنصة",
        navAnalytics: "الرسوم البيانية والتوفير",
        navHardware: "أجهزة GPS",
        stats: [
          { value: "99.98%", label: "جاهزية الخوادم والاتصال المباشر" },
          { value: "-28%", label: "توفير في استهلاك الوقود والتوقف" },
          { value: "< 1 ثانية", label: "تحديث فوري عبر WebSockets" },
          { value: "24/7", label: "حماية ضد السرقة وإيقاف المحرك" },
        ],
      };
    }
    if (language === "en") {
      return {
        badge: "Next-Gen GPS Fleet Management & Telemetry Platform · Live 24/7",
        title1: "Total Control Over Your Entire Fleet.",
        title2: "Live Tracking, Fuel Analytics (MAD) & Security.",
        subtitle:
          "Monitor every vehicle in real time: live street addresses, multi-color outbound/return trip history, automatic parking detection with exact duration, fuel waste analytics in MAD, and 1-click remote engine cut-off.",
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
      };
    }
    return {
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
    };
  }, [language]);

  // ROI Calculations
  const roiStats = useMemo(() => {
    const monthlySpend = fleetSize * monthlyFuelPerVehicle;
    const monthlySaved = Math.round(monthlySpend * 0.24); // 24% average savings on fuel + idle + unauthorized trips
    const yearlySaved = monthlySaved * 12;
    const hoursSavedPerMonth = fleetSize * 14;
    return { monthlySpend, monthlySaved, yearlySaved, hoursSavedPerMonth };
  }, [fleetSize, monthlyFuelPerVehicle]);

  return (
    <div className={`flex flex-col min-h-screen bg-zinc-950 text-white selection:bg-blue-600 selection:text-white ${isRTL ? "font-sans" : ""}`}>
      {/* ══════════════════════════════════════════════════════════════════════════
          1. STICKY HEADER
         ══════════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Car size={18} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block leading-none">
                TrackPro<span className="text-blue-500">.</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono tracking-wider">GPS-EU PLATFORM</span>
            </div>
          </Link>

          {/* Desktop Section Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-zinc-400">
            <a href="#platform-tour" className="hover:text-white transition-colors">
              {copy.navPlatform}
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              {copy.navFeatures}
            </a>
            <a href="#analytics-roi" className="hover:text-white transition-colors">
              {copy.navAnalytics}
            </a>
            <a href="#hardware" className="hover:text-white transition-colors">
              {copy.navHardware}
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <LanguageSelector />

            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700 text-zinc-200 text-xs font-semibold px-3.5 rounded-xl transition-colors"
              >
                {copy.ctaSecondary}
              </Button>
            </Link>

            <Link href="/register" className="hidden sm:block">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:shadow-blue-600/50"
              >
                {copy.ctaPrimary}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════════
          2. HERO SECTION WITH COMMAND CENTER VISUAL & LIVE HUD CARDS
         ══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[850px] h-[420px] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-72 right-10 w-[400px] h-[300px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Top Hero Copy */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 shadow-xl backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold">{copy.badge}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              {copy.title1} <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                {copy.title2}
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              {copy.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center pt-2">
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-sm sm:text-base font-bold px-8 py-6 rounded-2xl shadow-2xl shadow-blue-600/35 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <span>{copy.ctaSecondary}</span>
                  <ArrowIcon className="h-5 w-5 shrink-0" />
                </Button>
              </Link>

              <a href="#platform-tour" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-zinc-900/70 hover:bg-zinc-800 border-zinc-700 text-zinc-200 text-sm sm:text-base font-semibold px-7 py-6 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={16} className="text-blue-400 fill-blue-400" />
                  <span>Découvrir toute la plateforme</span>
                </Button>
              </a>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto mt-10">
            {copy.stats.map((st, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 text-center backdrop-blur-md hover:border-blue-500/40 transition-colors"
              >
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {st.value}
                </div>
                <div className="text-xs text-zinc-400 mt-1">{st.label}</div>
              </div>
            ))}
          </div>

          {/* Hero Command Center Image + Floating Live Cards */}
          <div className="mt-12 relative">
            <div className="relative rounded-3xl overflow-hidden border border-zinc-800/90 shadow-[0_25px_90px_-15px_rgba(37,99,235,0.35)] bg-zinc-900">
              {/* Top Browser / App Frame Bar */}
              <div className="h-10 bg-zinc-900/95 border-b border-zinc-800 px-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-zinc-400 hidden sm:inline">
                    https://www.gps-eu.com/dashboard
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    ● LIVE SOCKET CONNECTED
                  </span>
                </div>
              </div>

              {/* Main Hero Image */}
              <div className="relative">
                <img
                  src="/landing/hero-command-center.jpg"
                  alt="TrackPro GPS Command Center — Carte Live, Parkings, Carburant MAD & Sécurité"
                  className="w-full h-auto object-cover max-h-[620px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-65" />
              </div>

              {/* Floating Live Telemetry Overlay Cards on Bottom of Hero */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 sm:p-5 bg-zinc-950/90 border-t border-zinc-800/90 backdrop-blur-xl">
                {/* Card 1: Vehicle Live Telemetry */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-white">Dacia Duster · En mouvement</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <MapPin size={11} className="text-blue-400" />
                      <span>Autoroute A1, Casablanca → Rabat</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold">
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">142.8 km auj.</span>
                      <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-400">≈ 154 MAD</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-emerald-400 font-mono">86</div>
                    <div className="text-[10px] text-zinc-500 uppercase">km/h</div>
                  </div>
                </div>

                {/* Card 2: Route Aller/Retour + Parking Badge */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-amber-500 text-zinc-950 font-black text-[10px] inline-flex items-center justify-center">
                        P1
                      </span>
                      <span>Détection Parkings & Aller/Retour</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Arrêt P1 : <strong className="text-amber-400">10:15 → 10:40 (25 min)</strong>
                    </div>
                    <div className="flex items-center gap-3 pt-1 text-[10px]">
                      <span className="flex items-center gap-1 text-blue-400 font-semibold">
                        <span className="w-3 h-1 rounded bg-blue-500 inline-block" /> Aller
                      </span>
                      <span className="flex items-center gap-1 text-orange-400 font-semibold">
                        <span className="w-3 h-1 rounded bg-orange-500 inline-block" /> Retour
                      </span>
                      <span className="flex items-center gap-1 text-purple-400 font-semibold">
                        <span className="w-3 h-1 rounded bg-purple-500 inline-block" /> 3e passage
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold">
                    25m
                  </span>
                </div>

                {/* Card 3: Remote Engine Immobilizer */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock size={13} className="text-red-400" />
                      <span>Sécurité & Coupure Moteur</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Commande instantanée par relais GPRS/SMS
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold pt-1">
                      ✓ Protection anti-coupure à haute vitesse
                    </div>
                  </div>
                  <Link href="/login">
                    <span className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold transition-colors whitespace-nowrap">
                      STOP ENGINE
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          3. INTERACTIVE 6-MODULE PLATFORM TOUR (SHOWCASE EVERY FEATURE)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="platform-tour" className="py-20 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Section Title */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
              Visite Guidée Interactive
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Tout ce que Notre Plateforme Fait pour Vos Véhicules
            </h2>
            <p className="text-sm sm:text-base text-zinc-400">
              Cliquez sur chaque module ci-dessous pour découvrir les écrans, les indicateurs et les outils intégrés à votre espace client.
            </p>
          </div>

          {/* 6 Module Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: "live" as ShowcaseTab, label: "1. Carte Live 24/7", icon: MapPin, color: "text-blue-400" },
              { id: "history" as ShowcaseTab, label: "2. Historique & Parkings", icon: Clock, color: "text-amber-400" },
              { id: "fuel" as ShowcaseTab, label: "3. Carburant (MAD)", icon: Fuel, color: "text-emerald-400" },
              { id: "reports" as ShowcaseTab, label: "4. Rapports Excel/PDF", icon: BarChart2, color: "text-purple-400" },
              { id: "geofence" as ShowcaseTab, label: "5. Zones & Alertes", icon: Compass, color: "text-pink-400" },
              { id: "security" as ShowcaseTab, label: "6. Coupure Moteur", icon: Shield, color: "text-red-400" },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? "bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-950/50 scale-[1.02]"
                      : "bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <Icon size={20} className={`${t.color} mb-1.5`} />
                  <span className="text-xs font-bold leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Module Stage */}
          <div className="bg-zinc-900/75 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* MODULE 1: LIVE MAP & VEHICLE CARD */}
            {activeTab === "live" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                    <MapPin size={14} /> Suivi GPS en Direct
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Carte Google Maps Live & Fiche Véhicule Tout-en-Un
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Plus besoin de chercher dans des sous-menus : chaque carte véhicule dans la liste affiche directement en temps réel :
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span><strong>Adresse exacte de la rue</strong> mise à jour automatiquement.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span><strong>Distance parcourue aujourd&apos;hui (km)</strong> &amp; <strong>Temps d&apos;arrêt</strong>.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span><strong>Coût carburant du jour en MAD</strong> + vitesse maximale atteinte.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span><strong>Accès 1-clic</strong> à l&apos;historique du véhicule et à Google Maps.</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link href="/login">
                      <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-6">
                        Ouvrir la Carte Live
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Live Map Screenshot */}
                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                  <img
                    src="/landing/live-map.jpg"
                    alt="TrackPro — Carte Live GPS avec liste véhicules, adresses, vitesse km/h et coût MAD"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 2: HISTORY ALLER/RETOUR & PARKINGS WITH DURATION */}
            {activeTab === "history" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                    <Clock size={14} /> Replay &amp; Détection des Parkings
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Tracé Aller / Retour Multicolore &amp; Tous les Parkings avec Durée
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Lorsqu&apos;un véhicule emprunte la même route à l&apos;aller et au retour, TrackPro sépare automatiquement les couleurs et affiche chaque stationnement :
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
                      <span><strong>Aller en Bleu</strong> avec flèches directionnelles sur la route.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-orange-500 shrink-0" />
                      <span><strong>Retour en Orange</strong> (et 3e passage en Violet) pour distinguer chaque passage.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-amber-500 text-zinc-950 font-black text-[10px] inline-flex items-center justify-center shrink-0">
                        P1
                      </span>
                      <span><strong>Badges Parkings (`P1 · 25m`, `P2 · 1h 10m`)</strong> posés sur la carte et listés avec heure d&apos;arrivée, départ et adresse exacte.</span>
                    </li>
                  </ul>
                </div>

                {/* History & Parkings Screenshot */}
                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                  <img
                    src="/landing/history-parkings.jpg"
                    alt="TrackPro — Historique de trajet avec corridor aller/retour multicolore et badges parkings P1, P2"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 3: FUEL & ECO-DRIVING IN MAD */}
            {activeTab === "fuel" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    <Fuel size={14} /> Carburant &amp; Éco-Conduite (MAD)
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Réduisez le Gaspillage Carburant &amp; le Ralenti Moteur en Dirhams (MAD)
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Notre moteur d&apos;analyse calcule automatiquement les pertes liées au ralenti moteur (climatisation/chauffage à l&apos;arrêt) et aux excès de vitesse :
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>Calcul personnalisable selon le prix du litre en <strong>MAD</strong> (ex: 13.5 MAD/L).</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span><strong>Score Éco-Conduite (Notes A, B, C, D, E)</strong> attribué à chaque véhicule.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>Bilan carbone CO₂ et comparatif avec la période précédente.</span>
                    </li>
                  </ul>
                </div>

                {/* Fuel & Eco-Driving Screenshot */}
                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                  <img
                    src="/landing/fuel-eco.jpg"
                    alt="TrackPro — Analyse consommation carburant en MAD, scores éco-conduite A-E et détection ralenti"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 4: REPORTS EXCEL & PDF */}
            {activeTab === "reports" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
                    <BarChart2 size={14} /> Centre de Rapports Automatisés
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    4 Rapports Complets Exportables en Excel (CSV) &amp; PDF
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Obtenez en un clic tous vos bilans de flotte pour la comptabilité, la facturation ou le contrôle interne :
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                      <span><strong>Synthèse Flotte &amp; Kilométrage</strong> : km, heures conduite, carburant MAD.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                      <span><strong>Rapport Trajets &amp; Parkings</strong> : chaque arrêt `P1, P2...` avec sa durée exacte.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                      <span><strong>Rapport Survitesse &amp; Conduite de Nuit</strong> (22h00 – 06h00).</span>
                    </li>
                  </ul>
                </div>

                {/* Reports Screenshot */}
                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                  <img
                    src="/landing/reports.jpg"
                    alt="TrackPro — Rapports d'activité détaillés, trajets, parkings et export CSV/PDF"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 5: GEOFENCING & ALERTS */}
            {activeTab === "geofence" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold">
                    <Compass size={14} /> Zones Géographiques &amp; Alertes
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Géorepérage (Geofencing) &amp; Alertes en Temps Réel
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Dessinez vos dépôts, chantiers, villes ou zones clients sur la carte et recevez une alerte immédiate à chaque événement :
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-pink-400 shrink-0" />
                      <span>Entrée ou sortie de zone autorisée (Polygone ou Cercle).</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-pink-400 shrink-0" />
                      <span>Dépassement de vitesse paramétrable &amp; coupure d&apos;alimentation externe.</span>
                    </li>
                  </ul>
                </div>

                {/* Geofence & Alerts Screenshot */}
                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                  <img
                    src="/landing/geofence-alerts.jpg"
                    alt="TrackPro — Zones Geofences et journal des alertes temps réel"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 6: REMOTE ENGINE CUT-OFF */}
            {activeTab === "security" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                    <Shield size={14} /> Immobilisation à Distance
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Coupez ou Rétablissez le Moteur en 1 Clic depuis Votre Téléphone
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    En cas de vol ou d&apos;utilisation non autorisée hors horaires, immobilisez immédiatement le véhicule depuis l&apos;interface Live Map.
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={() => setEngineCutDemo((v) => !v)}
                      className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                        engineCutDemo
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-red-600 hover:bg-red-500 text-white"
                      }`}
                    >
                      <Power size={15} />
                      <span>
                        {engineCutDemo
                          ? "Tester : Rétablir le Moteur (RESUME ENGINE)"
                          : "Tester : Couper le Moteur (STOP ENGINE)"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Remote Engine Cutoff Screenshot */}
                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                  <img
                    src="/landing/engine-cutoff.jpg"
                    alt="TrackPro — Contrôle sécurisé antidémarrage et coupure moteur à distance"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          4. CHARTS & INTERACTIVE ROI CALCULATOR (IN MAD)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="analytics-roi" className="py-20 px-4 sm:px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Rentabilité Immédiate &amp; Graphiques
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Calculez Vos Économies en Dirhams (MAD)
            </h2>
            <p className="text-sm sm:text-base text-zinc-400">
              En éliminant les trajets non autorisés, le ralenti excessif et la survitesse, nos clients réduisent leur budget carburant de <strong>20% à 28% dès le premier mois</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Interactive Fleet ROI Simulator */}
            <div className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <span>Simulateur d&apos;Économies Flotte</span>
                </h3>

                {/* Slider 1: Fleet Size */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Nombre de véhicules :</span>
                    <span className="font-extrabold text-blue-400 text-sm">{fleetSize} véhicules</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={150}
                    value={fleetSize}
                    onChange={(e) => setFleetSize(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Slider 2: Monthly Fuel Spend per Vehicle */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Budget carburant mensuel / véhicule :</span>
                    <span className="font-extrabold text-amber-400 text-sm">
                      {monthlyFuelPerVehicle.toLocaleString()} MAD
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={15000}
                    step={250}
                    value={monthlyFuelPerVehicle}
                    onChange={(e) => setMonthlyFuelPerVehicle(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* ROI Result Boxes */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                  <span className="text-[11px] text-emerald-300 block">Économie Mensuelle Est.</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block">
                    {roiStats.monthlySaved.toLocaleString()} MAD
                  </span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                  <span className="text-[11px] text-blue-300 block">Économie Annuelle Est.</span>
                  <span className="text-xl sm:text-2xl font-black text-blue-400 mt-1 block">
                    {roiStats.yearlySaved.toLocaleString()} MAD
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Recharts Comparison Chart (Before vs With TrackPro) */}
            <div className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                     Courbe de Dépense Carburant (Avant vs Avec TrackPro)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Suivi hebdomadaire en MAD sur une flotte de {fleetSize} véhicules
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 w-fit">
                  <TrendingDown size={14} /> -24% de coût carburant
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={FUEL_TREND_DATA}>
                    <defs>
                      <linearGradient id="gradAvant" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradAvec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="day" stroke="#a1a1aa" fontSize={12} />
                    <YAxis stroke="#a1a1aa" fontSize={11} unit=" MAD" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: 12, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="avant"
                      name="Sans Suivi GPS (MAD)"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gradAvant)"
                    />
                    <Area
                      type="monotone"
                      dataKey="avecTrackPro"
                      name="Avec TrackPro (MAD)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#gradAvec)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          5. COMPLETE FEATURE MATRIX (ALL 9 CAPABILITIES)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-20 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Une Suite Complète pour Tous Vos Véhicules
            </h2>
            <p className="text-sm sm:text-base text-zinc-400">
              Conçue pour les sociétés de transport, location de voitures, distribution, BTP et flottes d&apos;entreprise au Maroc et en Europe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MapPin,
                color: "text-blue-400 bg-blue-500/10",
                title: "Géolocalisation Temps Réel (WebSockets)",
                desc: "Déplacement fluide des véhicules sur Google Maps (Satellite, Hybride, Trafic) avec statut en direct, cap et adresse exacte.",
              },
              {
                icon: Route,
                color: "text-orange-400 bg-orange-500/10",
                title: "Historique Aller / Retour Multicolore",
                desc: "Distinguez immédiatement l'aller (bleu), le retour (orange) et les passages multiples sur la même route avec flèches de sens.",
              },
              {
                icon: Clock,
                color: "text-amber-400 bg-amber-500/10",
                title: "Tous les Parkings avec Durée Exacte",
                desc: "Marqueurs P1, P2... directement sur la carte avec durée de stationnement, heure d'arrivée, heure de départ et adresse.",
              },
              {
                icon: Fuel,
                color: "text-emerald-400 bg-emerald-500/10",
                title: "Gestion Carburant & Coûts en MAD",
                desc: "Calcul quotidien et mensuel du carburant consommé et gaspillé au ralenti en Dirhams (MAD) avec score de conduite A–E.",
              },
              {
                icon: Power,
                color: "text-red-400 bg-red-500/10",
                title: "Coupure Moteur à Distance (Anti-Vol)",
                desc: "Bloquez ou débloquez le démarrage d'un véhicule à distance en un clic avec sécurité anti-coupure en roulement.",
              },
              {
                icon: BarChart2,
                color: "text-purple-400 bg-purple-500/10",
                title: "Rapports Détaillés Excel (CSV) & PDF",
                desc: "Exportez vos rapports de kilométrage, trajets, temps de parking, survitesse et journal des alertes en 1 clic.",
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-blue-500/40 transition-all space-y-3"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.color}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          6. CONNECTED FLEET IMAGE & HARDWARE COMPATIBILITY
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="hardware" className="py-20 px-4 sm:px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
              Compatibilité Multi-Constructeurs
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Compatible avec Tous Vos Boîtiers GPS &amp; Tous Types de Véhicules
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Notre serveur TCP haute performance décrypte nativement les protocoles des traceurs GPS les plus utilisés au Maroc et en Europe :
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { brand: "Coban / GPS103", models: "TK103A/B, TK303F/G, TK403" },
                { brand: "Teltonika Telematics", models: "FMB920, FMB120, FMC130, FMM130" },
                { brand: "Concox / Jimi IoT", models: "GT06N, GV20, ET200, VL03" },
                { brand: "Application Mobile & OBD", models: "Traceurs OBD-II Plug & Play" },
              ].map((hw, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Cpu size={14} className="text-blue-400" />
                    <span>{hw.brand}</span>
                  </div>
                  <div className="text-zinc-400 mt-1 text-[11px]">{hw.models}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-7">
                  Connecter mes véhicules
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200 font-semibold rounded-xl px-6"
                >
                  Espace Client
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
              <img
                src="/landing/connected-fleet.jpg"
                alt="Flotte connectée par satellite GPS TrackPro"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          7. FOOTER
         ══════════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-zinc-900 bg-black py-10 px-4 sm:px-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Car size={14} />
            </div>
            <span className="font-bold text-white">TrackPro GPS-EU</span>
            <span>· © {new Date().getFullYear()} Tous droits réservés.</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-white transition-colors">
              Connexion
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Inscription
            </Link>
            <LanguageSelector compact={false} />
          </div>
        </div>
      </footer>
    </div>
  );
}
