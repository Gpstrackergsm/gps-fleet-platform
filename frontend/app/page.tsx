"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Shield,
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
  Compass,
  Sparkles,
  TrendingDown,
  Cpu,
  Play,
  Phone,
  ChevronDown,
  HelpCircle,
  Wrench,
  FileCheck,
  Smartphone,
  Eye,
  Sliders,
  Radio,
  Users,
  MessageCircle,
  Gift,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { useLanguage } from "@/lib/LanguageContext";
import { getLandingDict } from "@/lib/landingI18n";

type ShowcaseTab = "live" | "history" | "fuel" | "reports" | "geofence" | "security";

export default function Home() {
  const { language, isRTL } = useLanguage();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const T = useMemo(() => getLandingDict(language), [language]);

  const [activeTab, setActiveTab] = useState<ShowcaseTab>("live");
  const [fleetSize, setFleetSize] = useState<number>(15);
  const [monthlyFuelPerVehicle, setMonthlyFuelPerVehicle] = useState<number>(() => T.defaultFuelBudget || 350);
  const [engineCutDemo, setEngineCutDemo] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Synchronize fuel budget default when switching currency (EUR vs USD vs MAD)
  useEffect(() => {
    setMonthlyFuelPerVehicle(T.defaultFuelBudget);
  }, [T.defaultFuelBudget]);

  // Dynamic Fuel Trend data with localized day names & currency scaling
  const fuelTrendData = useMemo(() => {
    const isEur = T.currencyCode === "EUR";
    const isUsd = T.currencyCode === "USD";
    const multiplier = isEur ? 0.1 : isUsd ? 0.11 : 1.0;

    const rawValues = [
      { avant: Math.round(1450 * multiplier), avecGeofence: Math.round(980 * multiplier), km: 620 },
      { avant: Math.round(1620 * multiplier), avecGeofence: Math.round(1090 * multiplier), km: 710 },
      { avant: Math.round(1380 * multiplier), avecGeofence: Math.round(920 * multiplier), km: 590 },
      { avant: Math.round(1790 * multiplier), avecGeofence: Math.round(1150 * multiplier), km: 780 },
      { avant: Math.round(1910 * multiplier), avecGeofence: Math.round(1210 * multiplier), km: 830 },
      { avant: Math.round(1120 * multiplier), avecGeofence: Math.round(740 * multiplier), km: 490 },
      { avant: Math.round(680 * multiplier), avecGeofence: Math.round(430 * multiplier), km: 310 },
    ];
    return rawValues.map((v, i) => ({
      day: T.chartDays[i] || `D${i + 1}`,
      ...v,
    }));
  }, [T]);

  // ROI Calculations
  const roiStats = useMemo(() => {
    const monthlySpend = fleetSize * monthlyFuelPerVehicle;
    const monthlySaved = Math.round(monthlySpend * 0.24);
    const yearlySaved = monthlySaved * 12;
    const hoursSavedPerMonth = fleetSize * 14;
    return { monthlySpend, monthlySaved, yearlySaved, hoursSavedPerMonth };
  }, [fleetSize, monthlyFuelPerVehicle]);

  return (
    <div
      className={`flex flex-col min-h-screen bg-[#F8FAFC] text-slate-800 selection:bg-blue-600 selection:text-white ${
        isRTL ? "font-sans" : ""
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ══════════════════════════════════════════════════════════════════════════
          1. STICKY HEADER (LIGHT CRISP WITH DIRECT WHATSAPP & FREE TRIAL PILL)
         ══════════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <img
              src="/geofence-logo.svg"
              alt="Geofence GPS"
              className="w-9 h-9 rounded-xl group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight block leading-none">
                Geofence<span className="text-blue-600">.</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider font-semibold">
                GLOBAL GPS PLATFORM
              </span>
            </div>
          </Link>

          {/* Desktop Section Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#free-trial" className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1">
              <Gift size={13} className="text-emerald-600" />
              <span>{T.freeTrialHighlight}</span>
            </a>
            <a href="#platform-tour" className="hover:text-blue-600 transition-colors">
              {T.navPlatform}
            </a>
            <a href="#features" className="hover:text-blue-600 transition-colors">
              {T.navFeatures}
            </a>
            <a href="#analytics-roi" className="hover:text-blue-600 transition-colors">
              {T.navAnalytics}
            </a>
            <a href="#hardware" className="hover:text-blue-600 transition-colors">
              {T.navHardware}
            </a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct WhatsApp Callout Button */}
            <a
              href={T.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all shadow-xs"
              title="WhatsApp direct assistance: 00212661176946"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <MessageCircle size={14} className="text-emerald-600" />
              <span className="font-mono tracking-wide">{T.whatsappNumber}</span>
            </a>

            <ThemeToggle />
            <LanguageSelector />

            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 text-xs font-semibold px-3.5 rounded-xl transition-colors shadow-xs"
              >
                {T.ctaSecondary}
              </Button>
            </Link>

            <Link href="/register" className="hidden sm:block">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30"
              >
                {T.freeTrialCta}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════════
          2. HERO SECTION (WORLDWIDE REACH, LIGHT LUXURY & 1 MONTH FREE OFFER)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-24 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9]">
        {/* Soft Ambient Light Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.07),transparent)] pointer-events-none" />
        <div className="absolute top-48 right-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse_60%_50%_at_80%_30%,rgba(16,185,129,0.05),transparent)] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Top Hero Copy */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span className="font-extrabold">{T.freeTrialBadge}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.14]">
              {T.title1} <br />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                {T.title2}
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
              {T.subtitle}
            </p>

            {/* CTA Buttons with 1-Month Free Trial Focus */}
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center pt-2">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-bold px-8 py-6 rounded-2xl shadow-xl shadow-blue-500/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Gift size={18} className="text-blue-100" />
                  <span>{T.freeTrialCta}</span>
                  <ArrowIcon className="h-5 w-5 shrink-0" />
                </Button>
              </Link>

              <a
                href={T.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-300 text-emerald-800 text-sm sm:text-base font-bold px-7 py-6 rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} className="text-emerald-600" />
                  <span>WhatsApp: {T.whatsappNumber}</span>
                </Button>
              </a>
            </div>

            {/* Reassurance Micro-Copy */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Check size={14} className="text-emerald-600 stroke-[3]" />
                100% Gratuit 30 jours
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Check size={14} className="text-blue-600 stroke-[3]" />
                N'importe quel traceur GPS mondial
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Check size={14} className="text-blue-600 stroke-[3]" />
                Sans carte bancaire
              </span>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 max-w-5xl mx-auto mt-12">
            {T.stats.map((st, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 text-center shadow-xs hover:shadow-md hover:border-blue-300/80 transition-all"
              >
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {st.value}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">{st.label}</div>
              </div>
            ))}
          </div>

          {/* Hero Command Center Image + Floating Live Cards */}
          <div className="mt-14 relative">
            <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] bg-white">
              {/* Top Browser Bar */}
              <div className="h-10 bg-slate-100/90 border-b border-slate-200/90 px-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-[11px] text-slate-500 hidden sm:inline">
                    https://www.gps-eu.com/dashboard
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    {T.liveSocketConnected}
                  </span>
                </div>
              </div>

              {/* Main Hero Image */}
              <div className="relative">
                <img
                  src="/landing/hero-command-center.jpg"
                  alt="Geofence GPS Worldwide Command Center"
                  className="w-full h-auto object-cover max-h-[620px]"
                />
              </div>

              {/* Floating Live Telemetry Overlay Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-4 sm:p-5 bg-white/95 border-t border-slate-200/90 backdrop-blur-xl">
                {/* Card 1: Vehicle Live Telemetry */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-900">{T.heroLiveStatus}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin size={11} className="text-blue-600" />
                      <span>{T.heroLiveAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold">
                      <span className="px-2 py-0.5 rounded bg-blue-100/70 text-blue-800">
                        {T.heroLiveTodayKm}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800">
                        {T.heroLiveTodayCost}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-emerald-600 font-mono">86</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">km/h</div>
                  </div>
                </div>

                {/* Card 2: Route Aller/Retour + Parking Badge */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-amber-500 text-white font-black text-[10px] inline-flex items-center justify-center">
                        P1
                      </span>
                      <span>{T.heroCard2Title}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{T.heroCard2Stop}</div>
                    <div className="flex items-center gap-3 pt-1 text-[10px]">
                      <span className="flex items-center gap-1 text-blue-700 font-semibold">
                        <span className="w-3 h-1 rounded bg-blue-600 inline-block" /> {T.heroCard2Aller}
                      </span>
                      <span className="flex items-center gap-1 text-orange-700 font-semibold">
                        <span className="w-3 h-1 rounded bg-orange-500 inline-block" /> {T.heroCard2Retour}
                      </span>
                      <span className="flex items-center gap-1 text-purple-700 font-semibold">
                        <span className="w-3 h-1 rounded bg-purple-500 inline-block" /> {T.heroCard2Third}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black">
                    25m
                  </span>
                </div>

                {/* Card 3: Remote Engine Immobilizer */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Lock size={13} className="text-rose-600" />
                      <span>{T.heroCard3Title}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{T.heroCard3Sub}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold pt-1">
                      {T.heroCard3Safety}
                    </div>
                  </div>
                  <Link href="/login">
                    <span className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors whitespace-nowrap">
                      {T.heroCard3Btn}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          2.5 HIGH-CONVERTING 1-MONTH FREE TRIAL & UNIVERSAL GPS BANNER
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="free-trial" className="py-14 px-4 sm:px-6 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl p-7 sm:p-10 bg-gradient-to-br from-blue-50 via-white to-emerald-50/50 border-2 border-blue-200 shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Value Proposition */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-300">
                  <Gift size={14} className="text-emerald-700" />
                  <span>{T.freeTrialBadge}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                  {T.freeTrialTitle}
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  {T.freeTrialSubtitle}
                </p>

                {/* Important Hardware Condition Clarification */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Radio size={16} className="text-blue-600" />
                    <span>{T.universalGpsTitle}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {T.universalGpsRequirement}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    ✦ {T.universalGpsSimNotice}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link href="/register">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-7 shadow-lg shadow-blue-500/25">
                      {T.freeTrialCta}
                    </Button>
                  </Link>

                  <a
                    href={T.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-md transition-all"
                  >
                    <MessageCircle size={17} />
                    <span>WhatsApp: {T.whatsappNumber}</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Steps to Connect Any GPS */}
              <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span>3 Étapes Simples pour Démarrer</span>
                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    30 Jours Gratuits
                  </span>
                </h3>

                <ul className="space-y-4 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">Insérez votre carte SIM Data</span>
                      <span className="text-slate-500 text-xs">Dans n'importe quel traceur GPS existant ou neuf (Maroc, Europe, Monde).</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">Configurez l'adresse IP (Port 5001)</span>
                      <span className="text-slate-500 text-xs">Par simple SMS ou logiciel de votre balise vers notre passerelle TCP.</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs inline-flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">Suivez vos véhicules en direct</span>
                      <span className="text-slate-500 text-xs">Accédez à votre espace web et mobile gratuit pendant 1 mois complet.</span>
                    </div>
                  </li>
                </ul>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                  <span>Besoin d'aide ?</span>
                  <a
                    href={T.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp 00212661176946</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          3. INTERACTIVE 6-MODULE PLATFORM TOUR
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="platform-tour" className="py-24 px-4 sm:px-6 border-t border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Section Title */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full">
              {T.tourBadge}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {T.tourTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-600">{T.tourSubtitle}</p>
          </div>

          {/* 6 Module Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { id: "live" as ShowcaseTab, label: T.tab1, icon: MapPin, color: "text-blue-600" },
              { id: "history" as ShowcaseTab, label: T.tab2, icon: Clock, color: "text-amber-600" },
              { id: "fuel" as ShowcaseTab, label: T.tab3, icon: Fuel, color: "text-emerald-600" },
              { id: "reports" as ShowcaseTab, label: T.tab4, icon: BarChart2, color: "text-purple-600" },
              { id: "geofence" as ShowcaseTab, label: T.tab5, icon: Compass, color: "text-rose-600" },
              { id: "security" as ShowcaseTab, label: T.tab6, icon: Shield, color: "text-red-600" },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/80 border-2 border-blue-600 text-blue-700 shadow-sm scale-[1.02]"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon size={20} className={`${t.color} mb-1.5`} />
                  <span className="text-xs font-bold leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Module Stage */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-9 shadow-sm">
            {/* MODULE 1: LIVE MAP */}
            {activeTab === "live" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100/60 border border-blue-200 text-blue-700 text-xs font-bold">
                    <MapPin size={14} /> {T.m1Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{T.m1Title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{T.m1Desc}</p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{T.m1Point1}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{T.m1Point2}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{T.m1Point3}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{T.m1Point4}</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link href="/register">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 shadow-md shadow-blue-500/20">
                        {T.freeTrialCta}
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src="/landing/live-map.jpg"
                    alt={T.m1Title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 2: HISTORY & PARKINGS */}
            {activeTab === "history" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-100/60 border border-amber-200 text-amber-800 text-xs font-bold">
                    <Clock size={14} /> {T.m2Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{T.m2Title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{T.m2Desc}</p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shrink-0" />
                      <span>{T.m2Point1}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-orange-500 shrink-0" />
                      <span>{T.m2Point2}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-amber-500 text-white font-black text-[10px] inline-flex items-center justify-center shrink-0">
                        P1
                      </span>
                      <span>{T.m2Point3}</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src="/landing/history-parkings.jpg"
                    alt={T.m2Title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 3: FUEL & ECO-DRIVING */}
            {activeTab === "fuel" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-100/60 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <Fuel size={14} /> {T.m3Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{T.m3Title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{T.m3Desc}</p>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{T.m3Point1}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{T.m3Point2}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{T.m3Point3}</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src="/landing/fuel-eco.jpg"
                    alt={T.m3Title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 4: REPORTS EXCEL & PDF */}
            {activeTab === "reports" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-100/60 border border-purple-200 text-purple-800 text-xs font-bold">
                    <BarChart2 size={14} /> {T.m4Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{T.m4Title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{T.m4Desc}</p>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>{T.m4Point1}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>{T.m4Point2}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>{T.m4Point3}</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src="/landing/reports.jpg"
                    alt={T.m4Title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 5: GEOFENCING & ALERTS */}
            {activeTab === "geofence" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-100/60 border border-rose-200 text-rose-800 text-xs font-bold">
                    <Compass size={14} /> {T.m5Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{T.m5Title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{T.m5Desc}</p>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-rose-600 shrink-0" />
                      <span>{T.m5Point1}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-rose-600 shrink-0" />
                      <span>{T.m5Point2}</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src="/landing/geofence-alerts.jpg"
                    alt={T.m5Title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* MODULE 6: REMOTE ENGINE CUT-OFF */}
            {activeTab === "security" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-100/60 border border-red-200 text-red-800 text-xs font-bold">
                    <Shield size={14} /> {T.m6Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{T.m6Title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{T.m6Desc}</p>
                  <div className="pt-1">
                    <button
                      onClick={() => setEngineCutDemo((v) => !v)}
                      className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                        engineCutDemo
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      <Power size={15} />
                      <span>{engineCutDemo ? T.m6TestResume : T.m6TestCut}</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src="/landing/engine-cutoff.jpg"
                    alt={T.m6Title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          4. CHARTS & INTERACTIVE ROI CALCULATOR (DYNAMIC CURRENCY EUR / USD / MAD)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="analytics-roi" className="py-24 px-4 sm:px-6 border-t border-slate-200/80 bg-slate-50/70">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full">
              {T.roiBadge}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {T.roiTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-600">{T.roiSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Interactive Fleet ROI Simulator */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-sm">
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <span>{T.roiSimTitle}</span>
                </h3>

                {/* Slider 1: Fleet Size */}
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-semibold">{T.roiVehiclesLabel}</span>
                    <span className="font-extrabold text-blue-700 text-sm">
                      {T.roiVehiclesCount(fleetSize)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={150}
                    value={fleetSize}
                    onChange={(e) => setFleetSize(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Slider 2: Monthly Fuel Spend per Vehicle */}
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-semibold">{T.roiBudgetLabel}</span>
                    <span className="font-extrabold text-amber-700 text-sm">
                      {T.formatCurrency(monthlyFuelPerVehicle)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={T.fuelSliderMin}
                    max={T.fuelSliderMax}
                    step={T.fuelSliderStep}
                    value={monthlyFuelPerVehicle}
                    onChange={(e) => setMonthlyFuelPerVehicle(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* ROI Result Boxes */}
              <div className="grid grid-cols-2 gap-3.5 pt-4 border-t border-slate-200">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <span className="text-[11px] text-emerald-800 font-semibold block">{T.roiMonthlySavedLabel}</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
                    {T.formatCurrency(roiStats.monthlySaved)}
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <span className="text-[11px] text-blue-800 font-semibold block">{T.roiYearlySavedLabel}</span>
                  <span className="text-xl sm:text-2xl font-black text-blue-700 mt-1 block">
                    {T.formatCurrency(roiStats.yearlySaved)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Recharts Comparison Chart */}
            <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{T.roiChartTitle}</h3>
                  <p className="text-xs text-slate-500">{T.roiChartSubtitle(fleetSize)}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 w-fit">
                  <TrendingDown size={14} className="text-emerald-600" />
                  <span>{T.roiChartBadge}</span>
                </span>
              </div>

              <div className="h-64 sm:h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fuelTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSansGps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAvecGps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit={` ${T.currencySymbol}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "14px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#0F172A", fontWeight: "600" }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ fontSize: "11px", fontWeight: "600", color: "#475569" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avant"
                      name={T.roiChartNoGps}
                      stroke="#EF4444"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorSansGps)"
                    />
                    <Area
                      type="monotone"
                      dataKey="avecGeofence"
                      name={T.roiChartWithTrackPro}
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorAvecGps)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
                <span>✦ Économie constatée : 24% en moyenne</span>
                <span className="font-semibold text-slate-700">Devise active : {T.currencyCode} ({T.currencySymbol})</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          5. COMPLETE FEATURE MATRIX (ALL 15 OPTIONS & MODULES IN CRISP LIGHT)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 px-4 sm:px-6 border-t border-slate-200/80 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={13} className="text-blue-600" />
              <span>{T.navFeatures} · 15 Modules Complets</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              {T.featHeader}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
              {T.featSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {T.feats.map((f, i) => {
              const configs = [
                { icon: MapPin, color: "text-emerald-700 bg-emerald-50 border-emerald-200", pill: "text-emerald-800 bg-emerald-50 border-emerald-200" },
                { icon: Route, color: "text-blue-700 bg-blue-50 border-blue-200", pill: "text-blue-800 bg-blue-50 border-blue-200" },
                { icon: Sliders, color: "text-sky-700 bg-sky-50 border-sky-200", pill: "text-sky-800 bg-sky-50 border-sky-200" },
                { icon: Clock, color: "text-amber-700 bg-amber-50 border-amber-200", pill: "text-amber-800 bg-amber-50 border-amber-200" },
                { icon: Wrench, color: "text-teal-700 bg-teal-50 border-teal-200", pill: "text-teal-800 bg-teal-50 border-teal-200" },
                { icon: FileCheck, color: "text-amber-800 bg-amber-100/60 border-amber-300", pill: "text-amber-900 bg-amber-100/80 border-amber-300" },
                { icon: Gauge, color: "text-indigo-700 bg-indigo-50 border-indigo-200", pill: "text-indigo-800 bg-indigo-50 border-indigo-200" },
                { icon: Power, color: "text-rose-700 bg-rose-50 border-rose-200", pill: "text-rose-800 bg-rose-50 border-rose-200" },
                { icon: Compass, color: "text-violet-700 bg-violet-50 border-violet-200", pill: "text-violet-800 bg-violet-50 border-violet-200" },
                { icon: Fuel, color: "text-emerald-800 bg-emerald-100/60 border-emerald-300", pill: "text-emerald-900 bg-emerald-100/80 border-emerald-300" },
                { icon: Smartphone, color: "text-blue-800 bg-blue-100/60 border-blue-300", pill: "text-blue-900 bg-blue-100/80 border-blue-300" },
                { icon: Eye, color: "text-purple-700 bg-purple-50 border-purple-200", pill: "text-purple-800 bg-purple-50 border-purple-200" },
                { icon: Users, color: "text-orange-700 bg-orange-50 border-orange-200", pill: "text-orange-800 bg-orange-50 border-orange-200" },
                { icon: BarChart2, color: "text-pink-700 bg-pink-50 border-pink-200", pill: "text-pink-800 bg-pink-50 border-pink-200" },
                { icon: Radio, color: "text-cyan-700 bg-cyan-50 border-cyan-200", pill: "text-cyan-800 bg-cyan-50 border-cyan-200" },
              ];
              const cfg = configs[i] || configs[0];
              const Icon = cfg.icon;

              return (
                <div
                  key={i}
                  className="group relative p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 shadow-xs hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between space-y-4 hover:-translate-y-1"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${cfg.color}`}>
                        <Icon size={22} />
                      </div>
                      {f.badge && (
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${cfg.pill}`}>
                          {f.badge}
                        </span>
                      )}
                    </div>

                    <div>
                      {f.category && (
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          {f.category}
                        </span>
                      )}
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {f.title}
                      </h3>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          6. HARDWARE COMPATIBILITY & SIM DATA INSTRUCTION (WORLDWIDE)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="hardware" className="py-24 px-4 sm:px-6 border-t border-slate-200/80 bg-slate-50/70">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full">
              {T.hwBadge}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {T.hwTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              {T.hwSubtitle}
            </p>

            {/* Universal SIM & Tracker Note */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-2 text-xs">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>{T.universalGpsRequirement}</span>
              </div>
              <p className="text-xs text-slate-500">
                ✦ {T.universalGpsSimNotice}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { brand: "Coban / GPS103", models: "TK103A/B, TK303F/G, TK403" },
                { brand: "Teltonika Telematics", models: "FMB920, FMB120, FMC130, FMM130" },
                { brand: "Concox / Jimi IoT", models: "GT06N, GV20, ET200, VL03" },
                { brand: "OBD & Mobile Apps", models: "Traceurs OBD-II Plug & Play" },
              ].map((hw, i) => (
                <div key={i} className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu size={14} className="text-blue-600" />
                    <span>{hw.brand}</span>
                  </div>
                  <div className="text-slate-500 mt-1 text-[11px] font-medium">{hw.models}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-7 shadow-md shadow-blue-500/20">
                  {T.freeTrialCta}
                </Button>
              </Link>
              <a
                href={T.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-xs transition-all"
              >
                <MessageCircle size={16} />
                <span>WhatsApp: {T.whatsappNumber}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white">
              <img
                src="/landing/connected-fleet.jpg"
                alt={T.hwTitle}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          6.5 FAQ SECTION (RICH SNIPPETS & GOOGLE SEO)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-200/80 bg-white">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <HelpCircle size={14} />
            <span>{T.faqBadge}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {T.faqTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            {T.faqSubtitle}
          </p>
        </div>

        <div className="space-y-3.5">
          {T.faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-slate-50/90 border-2 border-blue-600 shadow-sm"
                    : "bg-white border-slate-200/90 hover:border-slate-300 shadow-xs"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full py-4 px-5 sm:px-6 flex items-center justify-between gap-4 text-start transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {item.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-blue-600 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 font-normal">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          7. FOOTER (CLEAN LIGHT DESIGN WITH WHATSAPP 00212661176946)
         ══════════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-200 bg-slate-100/80 py-12 px-4 sm:px-6 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/geofence-logo.svg" alt="Geofence GPS" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-slate-900">Geofence GPS Worldwide</span>
            <span>· © {new Date().getFullYear()} {T.footerRights}</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <a
              href={T.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold"
            >
              <MessageCircle size={13} className="text-emerald-600" />
              <span>WhatsApp: {T.whatsappNumber}</span>
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={T.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold"
            >
              <MessageCircle size={13} />
              <span>{T.whatsappNumber}</span>
            </a>
            <Link href="/login" className="hover:text-blue-600 transition-colors font-medium">
              {T.footerLogin}
            </Link>
            <Link href="/register" className="hover:text-blue-600 transition-colors font-medium">
              {T.footerRegister}
            </Link>
            <LanguageSelector compact={false} />
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════════════════
          8. FLOATING WHATSAPP PILL BUTTON (ALWAYS ACCESSIBLE WORLDWIDE)
         ══════════════════════════════════════════════════════════════════════════ */}
      <aside
        aria-label="Support WhatsApp"
        className={`fixed bottom-6 z-50 ${isRTL ? "left-6" : "right-6"}`}
      >
        <a
          href={T.whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm rounded-full shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-all"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <MessageCircle size={18} />
          <span>WhatsApp : {T.whatsappNumber}</span>
        </a>
      </aside>
    </div>
  );
}
