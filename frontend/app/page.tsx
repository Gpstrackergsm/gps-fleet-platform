"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft, MapPin, Shield, Activity, Car, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/LanguageContext";

export default function Home() {
  const { t, isRTL } = useLanguage();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className={`flex flex-col min-h-screen bg-black text-white ${isRTL ? 'font-sans' : ''}`}>
      {/* ── Top Navigation Bar with Language Selector ── */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-black/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Car size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight block leading-none">
                TrackPro<span className="text-blue-500">.</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono tracking-wider">EU FLEET</span>
            </div>
          </Link>

          {/* Right Header: Language Switcher & Sign In */}
          <div className="flex items-center gap-3">
            {/* Language Selector (English / Français / العربية) */}
            <LanguageSelector />

            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="bg-zinc-900/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200 text-xs font-semibold px-4 rounded-lg transition-colors"
              >
                {t('signIn')}
              </Button>
            </Link>

            <Link href="/login" className="hidden sm:inline-block">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all hover:shadow-blue-600/50"
              >
                {t('launchDashboard')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 relative overflow-hidden">
        {/* Abstract Background Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/25 via-black to-black z-0 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="z-10 max-w-4xl space-y-8">
          {/* Operational Status Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium">{t('systemOperational')}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-100 to-zinc-500 leading-[1.15] animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both">
            {t('heroTitleLine1')} <br />
            <span className="text-white">{t('heroTitleLine2')}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
            {t('heroSubtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center pt-2 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 fill-mode-both">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200 text-base font-bold px-8 py-6 rounded-full shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <span>{t('launchDashboard')}</span>
                <ArrowIcon className="h-5 w-5 shrink-0" />
              </Button>
            </Link>

            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-zinc-900/60 hover:bg-zinc-800 border-zinc-700 text-zinc-200 text-base font-semibold px-7 py-6 rounded-full transition-colors"
              >
                {t('signInToFleet')}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* ── Feature Cards Grid ── */}
      <section className="border-t border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md z-10 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-blue-500/40 transition-colors flex flex-col items-center text-center space-y-3 group">
            <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
              <MapPin size={28} />
            </div>
            <h3 className="text-lg font-bold text-white">{t('feature1Title')}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('feature1Desc')}</p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-purple-500/40 transition-colors flex flex-col items-center text-center space-y-3 group">
            <div className="p-3.5 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:scale-110 transition-transform">
              <Activity size={28} />
            </div>
            <h3 className="text-lg font-bold text-white">{t('feature2Title')}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('feature2Desc')}</p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-emerald-500/40 transition-colors flex flex-col items-center text-center space-y-3 group">
            <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:scale-110 transition-transform">
              <Shield size={28} />
            </div>
            <h3 className="text-lg font-bold text-white">{t('feature3Title')}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('feature3Desc')}</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-900 bg-black py-8 px-4 sm:px-6 z-10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{t('copyright')}</span>
          </div>

          {/* Footer Language Switcher */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">Languages:</span>
            <LanguageSelector compact={false} />
          </div>
        </div>
      </footer>
    </div>
  );
}
