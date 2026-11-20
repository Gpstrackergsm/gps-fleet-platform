"use client";

import { useState, useMemo } from "react";
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
  const [monthlyFuelPerVehicle, setMonthlyFuelPerVehicle] = useState<number>(3500);
  const [engineCutDemo, setEngineCutDemo] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Dynamic Fuel Trend data with localized day names
  const fuelTrendData = useMemo(() => {
    const rawValues = [
      { avant: 1450, avecGeofence: 980, km: 620 },
      { avant: 1620, avecGeofence: 1090, km: 710 },
      { avant: 1380, avecGeofence: 920, km: 590 },
      { avant: 1790, avecGeofence: 1150, km: 780 },
      { avant: 1910, avecGeofence: 1210, km: 830 },
      { avant: 1120, avecGeofence: 740, km: 490 },
      { avant: 680, avecGeofence: 430, km: 310 },
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
      className={`flex flex-col min-h-screen bg-[#060913] text-slate-100 selection:bg-blue-600 selection:text-white ${
        isRTL ? "font-sans" : ""
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ══════════════════════════════════════════════════════════════════════════
          1. STICKY HEADER
         ══════════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#070B14]/85 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <img
              src="/geofence-logo.svg"
              alt="Geofence GPS"
              className="w-9 h-9 rounded-xl group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block leading-none">
                Geofence<span className="text-emerald-400">.</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">GPS-EU PLATFORM</span>
            </div>
          </Link>

          {/* Desktop Section Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <a href="#platform-tour" className="hover:text-white transition-colors">
              {T.navPlatform}
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              {T.navFeatures}
            </a>
            <a href="#analytics-roi" className="hover:text-white transition-colors">
              {T.navAnalytics}
            </a>
            <a href="#hardware" className="hover:text-white transition-colors">
              {T.navHardware}
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct Phone Call Button */}
            <a
              href={`tel:${T.phoneNumber}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-sm"
              title="Appelez-nous directement"
            >
              <Phone size={13} className="text-emerald-400" />
              <span className="font-mono tracking-wide">{T.phoneNumber}</span>
            </a>

            <ThemeToggle />
            <LanguageSelector />

            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="bg-[#0A101F] hover:bg-[#0E172A] border-slate-700/80 text-slate-200 text-xs font-semibold px-3.5 rounded-xl transition-colors"
              >
                {T.ctaSecondary}
              </Button>
            </Link>

            <Link href="/register" className="hidden sm:block">
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 rounded-xl shadow-lg shadow-blue-900/40 border-t border-blue-400/30 transition-all"
              >
                {T.ctaPrimary}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════════
          2. HERO SECTION
         ══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Ambient Atmospheric Lighting (World-Class Aesthetics) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.22),transparent)] pointer-events-none" />
        <div className="absolute top-48 right-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse_60%_50%_at_80%_30%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        <div className="absolute top-80 left-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse_60%_50%_at_20%_40%,rgba(245,158,11,0.07),transparent)] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Top Hero Copy */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#0A101F]/90 border border-slate-700/70 text-xs text-slate-200 shadow-[0_0_24px_rgba(16,185,129,0.12)] backdrop-blur-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold">{T.badge}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              {T.title1} <br />
              <span className="bg-gradient-to-r from-amber-200 via-emerald-300 to-sky-300 bg-clip-text text-transparent">
                {T.title2}
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-slate-300/90 max-w-3xl mx-auto leading-relaxed">
              {T.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center pt-2">
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm sm:text-base font-bold px-8 py-6 rounded-2xl shadow-2xl shadow-blue-900/40 border-t border-blue-400/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <span>{T.ctaSecondary}</span>
                  <ArrowIcon className="h-5 w-5 shrink-0" />
                </Button>
              </Link>

              <a href="#platform-tour" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-[#0A101F]/80 hover:bg-[#0E172A] border-slate-700/80 text-slate-200 text-sm sm:text-base font-semibold px-7 py-6 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={16} className="text-blue-400 fill-blue-400" />
                  <span>{T.heroTourBtn}</span>
                </Button>
              </a>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto mt-10">
            {T.stats.map((st, idx) => (
              <div
                key={idx}
                className="bg-[#0A101F]/80 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-md hover:border-slate-700/90 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all"
              >
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {st.value}
                </div>
                <div className="text-xs text-slate-400 mt-1">{st.label}</div>
              </div>
            ))}
          </div>

          {/* Hero Command Center Image + Floating Live Cards */}
          <div className="mt-12 relative">
            <div className="relative rounded-3xl overflow-hidden border border-slate-800/80 shadow-[0_25px_90px_-15px_rgba(15,23,42,0.7)] bg-[#0A101F]">
              {/* Top Browser Bar */}
              <div className="h-10 bg-[#0A101F]/95 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs">
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
                    {T.liveSocketConnected}
                  </span>
                </div>
              </div>

              {/* Main Hero Image */}
              <div className="relative">
                <img
                  src="/landing/hero-command-center.jpg"
                  alt="Geofence GPS Command Center"
                  className="w-full h-auto object-cover max-h-[620px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-65" />
              </div>

              {/* Floating Live Telemetry Overlay Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 sm:p-5 bg-[#070B14]/90 border-t border-slate-800/90 backdrop-blur-xl">
                {/* Card 1: Vehicle Live Telemetry */}
                <div className="bg-[#0A101F]/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-white">{T.heroLiveStatus}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <MapPin size={11} className="text-blue-400" />
                      <span>{T.heroLiveAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold">
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
                        {T.heroLiveTodayKm}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-400">
                        {T.heroLiveTodayCost}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-emerald-400 font-mono">86</div>
                    <div className="text-[10px] text-zinc-500 uppercase">km/h</div>
                  </div>
                </div>

                {/* Card 2: Route Aller/Retour + Parking Badge */}
                <div className="bg-[#0A101F]/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-amber-500 text-zinc-950 font-black text-[10px] inline-flex items-center justify-center">
                        P1
                      </span>
                      <span>{T.heroCard2Title}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">{T.heroCard2Stop}</div>
                    <div className="flex items-center gap-3 pt-1 text-[10px]">
                      <span className="flex items-center gap-1 text-blue-400 font-semibold">
                        <span className="w-3 h-1 rounded bg-blue-500 inline-block" /> {T.heroCard2Aller}
                      </span>
                      <span className="flex items-center gap-1 text-orange-400 font-semibold">
                        <span className="w-3 h-1 rounded bg-orange-500 inline-block" /> {T.heroCard2Retour}
                      </span>
                      <span className="flex items-center gap-1 text-purple-400 font-semibold">
                        <span className="w-3 h-1 rounded bg-purple-500 inline-block" /> {T.heroCard2Third}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold">
                    25m
                  </span>
                </div>

                {/* Card 3: Remote Engine Immobilizer */}
                <div className="bg-[#0A101F]/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock size={13} className="text-red-400" />
                      <span>{T.heroCard3Title}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">{T.heroCard3Sub}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold pt-1">
                      {T.heroCard3Safety}
                    </div>
                  </div>
                  <Link href="/login">
                    <span className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold transition-colors whitespace-nowrap">
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
          3. INTERACTIVE 6-MODULE PLATFORM TOUR
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="platform-tour" className="py-20 px-4 sm:px-6 border-t border-slate-800/70 bg-[#060913]">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Section Title */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
              {T.tourBadge}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {T.tourTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300/90">{T.tourSubtitle}</p>
          </div>

          {/* 6 Module Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: "live" as ShowcaseTab, label: T.tab1, icon: MapPin, color: "text-blue-400" },
              { id: "history" as ShowcaseTab, label: T.tab2, icon: Clock, color: "text-amber-400" },
              { id: "fuel" as ShowcaseTab, label: T.tab3, icon: Fuel, color: "text-emerald-400" },
              { id: "reports" as ShowcaseTab, label: T.tab4, icon: BarChart2, color: "text-purple-400" },
              { id: "geofence" as ShowcaseTab, label: T.tab5, icon: Compass, color: "text-pink-400" },
              { id: "security" as ShowcaseTab, label: T.tab6, icon: Shield, color: "text-red-400" },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? "bg-gradient-to-b from-blue-600/30 to-[#0A101F] border-blue-500/80 text-white shadow-lg shadow-blue-950/60 scale-[1.02]"
                      : "bg-[#0A101F]/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-[#0E172A]"
                  }`}
                >
                  <Icon size={20} className={`${t.color} mb-1.5`} />
                  <span className="text-xs font-bold leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Module Stage */}
          <div className="bg-[#0A101F]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* MODULE 1: LIVE MAP */}
            {activeTab === "live" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                    <MapPin size={14} /> {T.m1Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{T.m1Title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{T.m1Desc}</p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>{T.m1Point1}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>{T.m1Point2}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>{T.m1Point3}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>{T.m1Point4}</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link href="/login">
                      <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-6">
                        {T.m1Btn}
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                    <Clock size={14} /> {T.m2Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{T.m2Title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{T.m2Desc}</p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{T.m2Point1}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-orange-500 shrink-0" />
                      <span>{T.m2Point2}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-amber-500 text-zinc-950 font-black text-[10px] inline-flex items-center justify-center shrink-0">
                        P1
                      </span>
                      <span>{T.m2Point3}</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    <Fuel size={14} /> {T.m3Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{T.m3Title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{T.m3Desc}</p>
                  <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>{T.m3Point1}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>{T.m3Point2}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      <span>{T.m3Point3}</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
                    <BarChart2 size={14} /> {T.m4Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{T.m4Title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{T.m4Desc}</p>
                  <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                      <span>{T.m4Point1}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                      <span>{T.m4Point2}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                      <span>{T.m4Point3}</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold">
                    <Compass size={14} /> {T.m5Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{T.m5Title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{T.m5Desc}</p>
                  <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-pink-400 shrink-0" />
                      <span>{T.m5Point1}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-pink-400 shrink-0" />
                      <span>{T.m5Point2}</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                    <Shield size={14} /> {T.m6Badge}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{T.m6Title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{T.m6Desc}</p>
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
                      <span>{engineCutDemo ? T.m6TestResume : T.m6TestCut}</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
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
          4. CHARTS & INTERACTIVE ROI CALCULATOR (IN MAD)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="analytics-roi" className="py-20 px-4 sm:px-6 border-t border-slate-800/70 bg-[#060913]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              {T.roiBadge}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {T.roiTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300/90">{T.roiSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Interactive Fleet ROI Simulator */}
            <div className="lg:col-span-5 bg-[#0A101F]/80 border border-slate-800/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-xl">
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <span>{T.roiSimTitle}</span>
                </h3>

                {/* Slider 1: Fleet Size */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium">{T.roiVehiclesLabel}</span>
                    <span className="font-extrabold text-blue-400 text-sm">
                      {T.roiVehiclesCount(fleetSize)}
                    </span>
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
                    <span className="text-zinc-400 font-medium">{T.roiBudgetLabel}</span>
                    <span className="font-extrabold text-amber-400 text-sm">
                      {monthlyFuelPerVehicle.toLocaleString(T.locale)} MAD
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
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4">
                  <span className="text-[11px] text-emerald-300 block">{T.roiMonthlySavedLabel}</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block">
                    {roiStats.monthlySaved.toLocaleString(T.locale)} MAD
                  </span>
                </div>
                <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-4">
                  <span className="text-[11px] text-blue-300 block">{T.roiYearlySavedLabel}</span>
                  <span className="text-xl sm:text-2xl font-black text-blue-400 mt-1 block">
                    {roiStats.yearlySaved.toLocaleString(T.locale)} MAD
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Recharts Comparison Chart */}
            <div className="lg:col-span-7 bg-[#0A101F]/80 border border-slate-800/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">{T.roiChartTitle}</h3>
                  <p className="text-xs text-zinc-400">{T.roiChartSubtitle(fleetSize)}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 w-fit">
                  <TrendingDown size={14} /> {T.roiChartBadge}
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fuelTrendData}>
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
                      contentStyle={{
                        backgroundColor: "#09090b",
                        borderColor: "#27272a",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="avant"
                      name={T.roiChartNoGps}
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gradAvant)"
                    />
                    <Area
                      type="monotone"
                      dataKey="avecGeofence"
                      name={T.roiChartWithTrackPro}
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
          5. COMPLETE FEATURE MATRIX (ALL 15 OPTIONS & MODULES)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 px-4 sm:px-6 border-t border-slate-800/70 bg-[#070B14] relative overflow-hidden">
        {/* Subtle background ambient lights */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={13} className="text-emerald-400" />
              <span>{T.navFeatures} · 15 Modules Complets</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {T.featHeader}
            </h2>
            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-2xl mx-auto">
              {T.featSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {T.feats.map((f, i) => {
              const configs = [
                { icon: MapPin, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", pill: "text-emerald-300 bg-emerald-950/60 border-emerald-500/30", glow: "hover:border-emerald-500/50 hover:shadow-emerald-950/30" },
                { icon: Route, color: "text-blue-400 bg-blue-500/10 border-blue-500/25", pill: "text-blue-300 bg-blue-950/60 border-blue-500/30", glow: "hover:border-blue-500/50 hover:shadow-blue-950/30" },
                { icon: Sliders, color: "text-sky-400 bg-sky-500/10 border-sky-500/25", pill: "text-sky-300 bg-sky-950/60 border-sky-500/30", glow: "hover:border-sky-500/50 hover:shadow-sky-950/30" },
                { icon: Clock, color: "text-amber-400 bg-amber-500/10 border-amber-500/25", pill: "text-amber-300 bg-amber-950/60 border-amber-500/30", glow: "hover:border-amber-500/50 hover:shadow-amber-950/30" },
                { icon: Wrench, color: "text-teal-400 bg-teal-500/10 border-teal-500/25", pill: "text-teal-300 bg-teal-950/60 border-teal-500/30", glow: "hover:border-teal-500/50 hover:shadow-teal-950/30" },
                { icon: FileCheck, color: "text-amber-300 bg-amber-500/15 border-amber-500/30", pill: "text-amber-200 bg-amber-950/80 border-amber-500/40", glow: "hover:border-amber-400/50 hover:shadow-amber-950/40" },
                { icon: Gauge, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/25", pill: "text-indigo-300 bg-indigo-950/60 border-indigo-500/30", glow: "hover:border-indigo-500/50 hover:shadow-indigo-950/30" },
                { icon: Power, color: "text-rose-400 bg-rose-500/10 border-rose-500/25", pill: "text-rose-300 bg-rose-950/60 border-rose-500/30", glow: "hover:border-rose-500/50 hover:shadow-rose-950/30" },
                { icon: Compass, color: "text-violet-400 bg-violet-500/10 border-violet-500/25", pill: "text-violet-300 bg-violet-950/60 border-violet-500/30", glow: "hover:border-violet-500/50 hover:shadow-violet-950/30" },
                { icon: Fuel, color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", pill: "text-emerald-200 bg-emerald-950/70 border-emerald-500/40", glow: "hover:border-emerald-400/50 hover:shadow-emerald-950/40" },
                { icon: Smartphone, color: "text-blue-300 bg-blue-500/15 border-blue-500/30", pill: "text-blue-200 bg-blue-950/70 border-blue-500/40", glow: "hover:border-blue-400/50 hover:shadow-blue-950/40" },
                { icon: Eye, color: "text-purple-400 bg-purple-500/10 border-purple-500/25", pill: "text-purple-300 bg-purple-950/60 border-purple-500/30", glow: "hover:border-purple-500/50 hover:shadow-purple-950/30" },
                { icon: Users, color: "text-orange-400 bg-orange-500/10 border-orange-500/25", pill: "text-orange-300 bg-orange-950/60 border-orange-500/30", glow: "hover:border-orange-500/50 hover:shadow-orange-950/30" },
                { icon: BarChart2, color: "text-pink-400 bg-pink-500/10 border-pink-500/25", pill: "text-pink-300 bg-pink-950/60 border-pink-500/30", glow: "hover:border-pink-500/50 hover:shadow-pink-950/30" },
                { icon: Radio, color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/25", pill: "text-cyan-200 bg-cyan-950/70 border-cyan-500/40", glow: "hover:border-cyan-400/50 hover:shadow-cyan-950/40" },
              ];
              const cfg = configs[i] || configs[0];
              const Icon = cfg.icon;

              return (
                <div
                  key={i}
                  className={`group relative p-6 sm:p-7 rounded-2xl bg-[#0A101F]/80 border border-slate-800/80 hover:border-slate-700 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-all duration-300 flex flex-col justify-between space-y-4 hover:-translate-y-1 ${cfg.glow}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${cfg.color}`}>
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
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">
                          {f.category}
                        </span>
                      )}
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                        {f.title}
                      </h3>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
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
          6. HARDWARE COMPATIBILITY
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="hardware" className="py-20 px-4 sm:px-6 border-t border-slate-800/70 bg-[#060913]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              {T.hwBadge}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {T.hwTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed">{T.hwSubtitle}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { brand: "Coban / GPS103", models: "TK103A/B, TK303F/G, TK403" },
                { brand: "Teltonika Telematics", models: "FMB920, FMB120, FMC130, FMM130" },
                { brand: "Concox / Jimi IoT", models: "GT06N, GV20, ET200, VL03" },
                { brand: "OBD & Mobile Apps", models: "Traceurs OBD-II Plug & Play" },
              ].map((hw, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-[#0A101F] border border-slate-800/80">
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
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl px-7 shadow-lg shadow-blue-900/30 border-t border-blue-400/30">
                  {T.hwBtnPrimary}
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-[#0A101F] hover:bg-[#0E172A] border-slate-700/80 text-slate-200 font-semibold rounded-xl px-6"
                >
                  {T.hwBtnSecondary}
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl">
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
          6.5 FAQ SECTION (Rich Snippets & Google SEO)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <HelpCircle size={14} />
            <span>{T.faqBadge}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {T.faqTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed">
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
                    ? "bg-[#0A101F] border-blue-500/40 shadow-lg shadow-blue-500/5"
                    : "bg-[#0A101F]/60 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full py-4 px-5 sm:px-6 flex items-center justify-between gap-4 text-start transition-colors"
                >
                  <span className="text-sm sm:text-base font-semibold text-white">
                    {item.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-blue-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/50">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          7. FOOTER
         ══════════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-900 bg-[#04060C] py-10 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/geofence-logo.svg" alt="Geofence GPS" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-white">Geofence GPS</span>
            <span>· © {new Date().getFullYear()} {T.footerRights}</span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <a
              href={`tel:${T.phoneNumber}`}
              className="hidden sm:inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <Phone size={12} />
              <span>{T.callUsText} {T.phoneNumber}</span>
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={`tel:${T.phoneNumber}`}
              className="sm:hidden inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <Phone size={12} />
              <span>{T.phoneNumber}</span>
            </a>
            <Link href="/login" className="hover:text-white transition-colors">
              {T.footerLogin}
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              {T.footerRegister}
            </Link>
            <LanguageSelector compact={false} />
          </div>
        </div>
      </footer>
    </div>
  );
}
