"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import {
    Fuel, TrendingDown, TrendingUp, Clock, Gauge, DollarSign, Award, Car,
    RefreshCw, Sliders, AlertCircle, CheckCircle2, Download, Sparkles,
    ChevronDown, ChevronRight, MapPin, Leaf, Moon, Lightbulb, Minus,
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
    CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '@/lib/api';
import { useTheme } from '@/lib/useTheme';

type Period = 'today' | '7d' | '30d' | 'month';
type VType = 'light' | 'van' | 'truck';
type Grade = 'A' | 'B' | 'C' | 'D' | 'E';
type SortKey = 'cost' | 'idle' | 'km' | 'score';

const RATES: Record<VType, number> = { light: 1.3, van: 1.8, truck: 3.0 }; // idle L/h
const SPEED_EXTRA_L_PER_100KM = 2.2;
const CO2_PER_LITER = 2.64; // kg CO2 per liter of diesel

interface DayPoint { date: string; idleHours: number; km: number; speedingKm: number }
interface IdleEvent { start: string; end: string; minutes: number; lat: number; lng: number }
interface Totals { idleHours: number; km: number; speedingKm: number }
interface ApiDevice {
    device_id: string; name: string; current_state: string; speed: number;
    positionCount: number; idleSeconds: number; idleHours: number; movingHours: number;
    distanceKm: number; speedingKm: number; offHoursKm: number; avgSpeed: number; maxSpeed: number;
    idleEventCount: number; longestIdleMin: number; hourlyIdle: number[];
    daily: DayPoint[]; events: IdleEvent[]; prev: Totals;
}
interface ApiResponse {
    period: string; threshold: number; deviceCount: number;
    fleet?: { daily: DayPoint[]; hourlyIdle: number[]; prev: Totals };
    topEvents?: (IdleEvent & { device_id: string; name: string })[];
    devices: ApiDevice[];
}

interface VehicleStat extends ApiDevice {
    vehicleType: VType;
    rate: number;
    idleL: number; speedL: number; wasteL: number;
    idleCost: number; speedCost: number; cost: number;
    prevCost: number;
    co2: number;
    score: number | null;
    grade: Grade | null;
    idleRatio: number;
    dailyCost: { date: string; idleCost: number; speedCost: number; km: number; idleHours: number }[];
}

const fmt = (n: number, d = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const dd = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fmtDur = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`);

const gradeOf = (s: number): Grade => (s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 65 ? 'C' : s >= 50 ? 'D' : 'E');
const gradeBadge: Record<Grade, string> = {
    A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    B: 'bg-green-500/20 text-green-400 border-green-500/40',
    C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    D: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    E: 'bg-red-500/20 text-red-400 border-red-500/40',
};


function Trend({ cur, prev }: { cur: number; prev: number }) {
    if (!(prev > 0)) return <span className="text-[11px] text-gray-500 flex items-center gap-1"><Minus size={12} />Pas de période de comparaison</span>;
    const pct = ((cur - prev) / prev) * 100;
    if (Math.abs(pct) < 1) return <span className="text-[11px] text-gray-400 flex items-center gap-1"><Minus size={12} />Stable vs période précédente</span>;
    const down = pct < 0; // for waste, down = good
    return (
        <span className={`text-[11px] font-semibold flex items-center gap-1 ${down ? 'text-emerald-400' : 'text-red-400'}`}>
            {down ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {down ? '' : '+'}{fmt(pct, 0)}% vs période précédente
        </span>
    );
}

export default function FuelEcoPage() {
    const { theme } = useTheme();
    const light = theme === 'light';
    const c = {
        grid: light ? '#e2e8f0' : '#1f2937',
        text: light ? '#64748b' : '#9ca3af',
        textStrong: light ? '#334155' : '#d1d5db',
    };
    const tooltipStyle = {
        contentStyle: { background: light ? '#ffffff' : '#0b1220', border: `1px solid ${light ? '#cbd5e1' : '#1f2937'}`, borderRadius: 12, fontSize: 12, color: light ? '#0f172a' : '#e5e7eb' },
        labelStyle: { color: c.text },
        cursor: { fill: light ? 'rgba(15,23,42,0.05)' : 'rgba(148,163,184,0.08)' },
    };
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<Period>('7d');
    const [fuelPrice, setFuelPrice] = useState(13.5);
    const [speedThreshold, setSpeedThreshold] = useState(100);
    const [thresholdInput, setThresholdInput] = useState('100');
    const [targetReduction, setTargetReduction] = useState(35);
    const [vehicleTypes, setVehicleTypes] = useState<Record<string, VType>>({});
    const [sortKey, setSortKey] = useState<SortKey>('cost');
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('fuel_vehicle_types');
            if (raw) setVehicleTypes(JSON.parse(raw));
            const price = localStorage.getItem('fuel_price');
            if (price) setFuelPrice(Number(price) || 13.5);
        } catch { /* ignore */ }
    }, []);

    const setType = (id: string, t: VType) =>
        setVehicleTypes(prev => {
            const next = { ...prev, [id]: t };
            try { localStorage.setItem('fuel_vehicle_types', JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get(`/fuel/analytics?period=${period}&threshold=${speedThreshold}`);
            setData(res.data as ApiResponse);
        } catch (err) {
            console.error('Failed to fetch fuel analytics:', err);
            setError("Impossible de charger les données carburant. Vérifiez votre connexion puis réessayez.");
        } finally {
            setLoading(false);
        }
    }, [period, speedThreshold]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const commitThreshold = () => {
        const v = Math.min(200, Math.max(40, Number(thresholdInput) || 100));
        setThresholdInput(String(v));
        setSpeedThreshold(v);
    };

    // ---------- Per-vehicle computation ----------
    const vehicles: VehicleStat[] = useMemo(() => {
        if (!data) return [];
        return data.devices.map(d => {
            const vt = vehicleTypes[d.device_id] || 'light';
            const rate = RATES[vt];
            const idleL = d.idleHours * rate;
            const speedL = (d.speedingKm / 100) * SPEED_EXTRA_L_PER_100KM;
            const wasteL = idleL + speedL;
            const prevL = d.prev.idleHours * rate + (d.prev.speedingKm / 100) * SPEED_EXTRA_L_PER_100KM;

            const engineH = d.idleHours + d.movingHours;
            const idleRatio = engineH > 0 ? d.idleHours / engineH : 0;
            const speedRatio = d.distanceKm > 0 ? d.speedingKm / d.distanceKm : 0;
            const active = d.distanceKm > 0 || d.idleHours > 0;
            const score = active
                ? Math.max(20, Math.min(100, Math.round(100 - Math.min(50, idleRatio * 80) - Math.min(30, speedRatio * 150))))
                : null;

            return {
                ...d,
                vehicleType: vt, rate, idleL, speedL, wasteL,
                idleCost: idleL * fuelPrice, speedCost: speedL * fuelPrice, cost: wasteL * fuelPrice,
                prevCost: prevL * fuelPrice,
                co2: wasteL * CO2_PER_LITER,
                score, grade: score === null ? null : gradeOf(score),
                idleRatio,
                dailyCost: d.daily.map(x => ({
                    date: x.date,
                    idleCost: x.idleHours * rate * fuelPrice,
                    speedCost: (x.speedingKm / 100) * SPEED_EXTRA_L_PER_100KM * fuelPrice,
                    km: x.km, idleHours: x.idleHours,
                })),
            };
        });
    }, [data, vehicleTypes, fuelPrice]);

    const sorted = useMemo(() => {
        const arr = [...vehicles];
        switch (sortKey) {
            case 'idle': return arr.sort((a, b) => b.idleHours - a.idleHours);
            case 'km': return arr.sort((a, b) => b.distanceKm - a.distanceKm);
            case 'score': return arr.sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
            default: return arr.sort((a, b) => b.cost - a.cost);
        }
    }, [vehicles, sortKey]);

    // ---------- Fleet aggregates ----------
    const fleet = useMemo(() => {
        const sum = (f: (v: VehicleStat) => number) => vehicles.reduce((s, v) => s + f(v), 0);
        const scored = vehicles.filter(v => v.score !== null);
        const days = data?.fleet?.daily.length || 1;
        const idleCost = sum(v => v.idleCost);
        const speedCost = sum(v => v.speedCost);
        const cost = idleCost + speedCost;
        const prevCost = sum(v => v.prevCost);
        const idleHours = sum(v => v.idleHours);
        const movingHours = sum(v => v.movingHours);
        return {
            days,
            cost, idleCost, speedCost, prevCost,
            wasteL: sum(v => v.wasteL), idleL: sum(v => v.idleL), speedL: sum(v => v.speedL),
            idleHours, prevIdleHours: data?.fleet?.prev.idleHours || 0,
            km: sum(v => v.distanceKm), prevKm: data?.fleet?.prev.km || 0,
            speedingKm: sum(v => v.speedingKm),
            offHoursKm: sum(v => v.offHoursKm),
            co2: sum(v => v.co2),
            idleShare: idleHours + movingHours > 0 ? (idleHours / (idleHours + movingHours)) * 100 : 0,
            avgScore: scored.length ? Math.round(scored.reduce((s, v) => s + (v.score as number), 0) / scored.length) : 0,
            monthlyIdleCost: (idleCost / days) * 30,
            monthlyCost: (cost / days) * 30,
        };
    }, [vehicles, data]);

    // ---------- Chart data ----------
    const dailyChart = useMemo(() => {
        if (!data?.fleet) return [];
        return data.fleet.daily.map((day, i) => ({
            date: day.date,
            label: dd(day.date),
            idle: Math.round(vehicles.reduce((s, v) => s + (v.dailyCost[i]?.idleCost || 0), 0)),
            speed: Math.round(vehicles.reduce((s, v) => s + (v.dailyCost[i]?.speedCost || 0), 0)),
        }));
    }, [data, vehicles]);

    const hourlyChart = useMemo(() =>
        Array.from({ length: 24 }, (_, h) => ({
            hour: `${h}h`,
            hours: Number(vehicles.reduce((s, v) => s + (v.hourlyIdle[h] || 0), 0).toFixed(2)),
            cost: Math.round(vehicles.reduce((s, v) => s + (v.hourlyIdle[h] || 0) * v.rate * fuelPrice, 0)),
        })), [vehicles, fuelPrice]);

    const pieData = useMemo(() => [
        { name: 'Ralenti', value: Math.round(fleet.idleCost), color: '#f59e0b' },
        { name: 'Vitesse', value: Math.round(fleet.speedCost), color: '#ef4444' },
    ], [fleet]);

    const topWasters = useMemo(() =>
        [...vehicles].sort((a, b) => b.cost - a.cost).slice(0, 8)
            .map(v => ({ name: v.name, idle: Math.round(v.idleCost), speed: Math.round(v.speedCost) })), [vehicles]);

    // ---------- Automatic insights ----------
    const insights = useMemo(() => {
        const out: { icon: 'cost' | 'clock' | 'trend' | 'moon' | 'ok'; text: string }[] = [];
        if (!vehicles.length || fleet.cost <= 0) {
            if (vehicles.length) out.push({ icon: 'ok', text: 'Aucun gaspillage significatif détecté sur cette période. Excellent travail !' });
            return out;
        }
        const worst = [...vehicles].sort((a, b) => b.cost - a.cost)[0];
        out.push({ icon: 'cost', text: `${worst.name} concentre ${fmt((worst.cost / fleet.cost) * 100)}% du gaspillage de la flotte (${fmt(worst.cost)} MAD).` });
        const peak = hourlyChart.reduce((m, x) => (x.hours > m.hours ? x : m), hourlyChart[0]);
        if (peak.hours > 0) {
            const h = Number(peak.hour.replace('h', ''));
            out.push({ icon: 'clock', text: `Le ralenti est maximal entre ${h}h et ${(h + 1) % 24}h (${fmt(peak.hours, 1)} h cumulées sur la flotte).` });
        }
        if (fleet.prevCost > 0) {
            const pct = ((fleet.cost - fleet.prevCost) / fleet.prevCost) * 100;
            if (Math.abs(pct) >= 1) out.push({ icon: 'trend', text: `Le gaspillage est en ${pct < 0 ? 'baisse' : 'hausse'} de ${fmt(Math.abs(pct))}% par rapport à la période précédente.` });
        }
        const longest = data?.topEvents?.[0];
        if (longest) out.push({ icon: 'clock', text: `Plus long ralenti : ${longest.name}, ${fmtDur(longest.minutes)} le ${fmtDateTime(longest.start)}.` });
        if (fleet.offHoursKm > 1) out.push({ icon: 'moon', text: `${fmt(fleet.offHoursKm, 1)} km parcourus hors horaires de travail (20h–6h) : usage à vérifier.` });
        return out;
    }, [vehicles, fleet, hourlyChart, data]);

    const eventRate = (id: string) => vehicles.find(v => v.device_id === id)?.rate ?? RATES.light;

    // ---------- Export ----------
    const handleExportCSV = () => {
        const head = 'Vehicule;Type;Distance_km;Heures_Ralenti;Km_sup_seuil;Km_hors_horaires;Vitesse_Max;Litres_Gaspilles;Cout_MAD;CO2_kg;Score;Grade\n';
        const rows = sorted.map(v =>
            [`"${v.name}"`, v.vehicleType, v.distanceKm, v.idleHours, v.speedingKm, v.offHoursKm, v.maxSpeed,
                v.wasteL.toFixed(1), Math.round(v.cost), v.co2.toFixed(1), v.score ?? '', v.grade ?? ''].join(';')
        ).join('\n');
        const blob = new Blob(['\uFEFF' + head + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Rapport_Eco_Carburant_${period}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const periodLabel = period === 'today' ? "aujourd'hui" : period === '7d' ? 'sur 7 jours' : period === '30d' ? 'sur 30 jours' : 'ce mois';
    const hasData = !!data && vehicles.length > 0;
    const xInterval = dailyChart.length > 14 ? Math.ceil(dailyChart.length / 10) - 1 : 0;

    return (
        <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6 lg:p-8 pb-24">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Fuel size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
                            Éco-Carburant & Réduction des Coûts
                            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">Données GPS réelles</span>
                        </h1>
                        <p className="text-xs md:text-sm text-gray-400">Ralenti, vitesse, tendances et événements détectés automatiquement sur votre flotte</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center gap-1">
                        {(['today', '7d', '30d', 'month'] as Period[]).map(p => (
                            <button key={p} onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                                {p === 'today' ? "Aujourd'hui" : p === '7d' ? '7 Jours' : p === '30d' ? '30 Jours' : 'Ce Mois'}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleExportCSV} disabled={!hasData}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-300 transition-colors disabled:opacity-40">
                        <Download size={14} /><span className="hidden sm:inline">Exporter CSV</span>
                    </button>
                    <button onClick={fetchAnalytics} title="Actualiser"
                        className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white transition-colors">
                        <RefreshCw size={15} className={loading ? 'animate-spin text-blue-400' : ''} />
                    </button>
                </div>
            </div>

            {/* Parameters */}
            <div className="my-5 p-3.5 bg-gray-900/60 border border-gray-800 rounded-2xl flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                    <Sliders size={15} className="text-blue-400 shrink-0" />
                    <span>Prix gasoil :</span>
                    <input type="number" step="0.1" value={fuelPrice}
                        onChange={e => { const v = Number(e.target.value) || 13.5; setFuelPrice(v); try { localStorage.setItem('fuel_price', String(v)); } catch { /* ignore */ } }}
                        className="w-16 px-2 py-1 bg-gray-950 border border-gray-700 rounded-lg text-amber-400 font-semibold text-center focus:border-blue-500 focus:outline-none" />
                    <span>MAD / L</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                    <Gauge size={15} className="text-red-400 shrink-0" />
                    <span>Seuil vitesse :</span>
                    <input type="number" step="5" value={thresholdInput}
                        onChange={e => setThresholdInput(e.target.value)}
                        onBlur={commitThreshold}
                        onKeyDown={e => { if (e.key === 'Enter') commitThreshold(); }}
                        className="w-16 px-2 py-1 bg-gray-950 border border-gray-700 rounded-lg text-red-400 font-semibold text-center focus:border-blue-500 focus:outline-none" />
                    <span>km/h</span>
                </div>
                <div className="ml-auto text-[11px] text-gray-500">
                    Branchement : <span className="text-emerald-400 font-semibold">Standard ACC</span> · consommation estimée selon la catégorie du véhicule
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-2xl border border-red-900/50 bg-red-950/30 text-sm text-red-300 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span>
                    <button onClick={fetchAnalytics} className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold">Réessayer</button>
                </div>
            )}

            {loading && !data && (
                <div className="flex items-center justify-center py-24 text-gray-400 text-sm gap-3">
                    <RefreshCw size={18} className="animate-spin text-blue-400" />Analyse de l'historique GPS en cours...
                </div>
            )}

            {!loading && !error && data && vehicles.length === 0 && (
                <div className="text-center py-20 text-gray-500 text-sm">Aucun véhicule trouvé pour ce compte.</div>
            )}

            {hasData && (
                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>

                    {/* Insights */}
                    {insights.length > 0 && (
                        <div className="mb-6 p-4 rounded-2xl border border-blue-900/40 bg-gradient-to-r from-blue-950/30 to-gray-900">
                            <h2 className="text-sm font-bold flex items-center gap-2 mb-3"><Lightbulb size={16} className="text-amber-400" />Ce qu'il faut retenir {periodLabel}</h2>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {insights.map((it, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-gray-300 bg-gray-950/60 border border-gray-800 rounded-xl p-3">
                                        {it.icon === 'moon' ? <Moon size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                                            : it.icon === 'clock' ? <Clock size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                            : it.icon === 'trend' ? <TrendingDown size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                            : it.icon === 'ok' ? <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                                            : <DollarSign size={14} className="text-red-400 mt-0.5 shrink-0" />}
                                        <span>{it.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                        <div className="xl:col-span-2 bg-gradient-to-br from-red-950/40 to-gray-900 border border-red-900/40 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-red-300/80 uppercase tracking-wider">Gaspillage financier</span>
                                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400"><DollarSign size={16} /></div>
                            </div>
                            <div className="text-3xl font-extrabold tracking-tight">{fmt(fleet.cost)} <span className="text-sm font-semibold text-red-400">MAD</span></div>
                            <p className="text-xs text-red-300/80 mt-1">≈ {fmt(fleet.wasteL, 1)} litres perdus</p>
                            <div className="mt-2"><Trend cur={fleet.cost} prev={fleet.prevCost} /></div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-950/40 to-gray-900 border border-amber-900/40 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider">Ralenti inutile</span>
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400"><Clock size={16} /></div>
                            </div>
                            <div className="text-3xl font-extrabold tracking-tight">{fmt(fleet.idleHours, 1)} <span className="text-sm font-semibold text-amber-400">h</span></div>
                            <p className="text-xs text-amber-300/80 mt-1">{fmt(fleet.idleShare)}% du temps moteur allumé</p>
                            <div className="mt-2"><Trend cur={fleet.idleHours} prev={fleet.prevIdleHours} /></div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-950/40 to-gray-900 border border-emerald-900/40 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-emerald-300/80 uppercase tracking-wider">Score éco</span>
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Award size={16} /></div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{fleet.avgScore}</span>
                                <span className="text-sm text-gray-400">/ 100</span>
                            </div>
                            <p className="text-xs text-emerald-300/80 mt-1">{fleet.avgScore >= 80 ? 'Bonne conduite' : fleet.avgScore >= 65 ? 'À améliorer' : 'Action requise'}</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-950/40 to-gray-900 border border-blue-900/40 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-blue-300/80 uppercase tracking-wider">Distance</span>
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><Car size={16} /></div>
                            </div>
                            <div className="text-3xl font-extrabold tracking-tight">{fmt(fleet.km)} <span className="text-sm font-semibold text-blue-400">km</span></div>
                            <p className="text-xs text-blue-300/80 mt-1">{fmt(fleet.speedingKm, 1)} km au-dessus de {speedThreshold} km/h</p>
                        </div>

                        <div className="bg-gradient-to-br from-teal-950/40 to-gray-900 border border-teal-900/40 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-teal-300/80 uppercase tracking-wider">CO₂ évitable</span>
                                <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400"><Leaf size={16} /></div>
                            </div>
                            <div className="text-3xl font-extrabold tracking-tight">{fmt(fleet.co2)} <span className="text-sm font-semibold text-teal-400">kg</span></div>
                            <p className="text-xs text-teal-300/80 mt-1">émissions liées au gaspillage</p>
                        </div>
                    </div>

                    {/* Charts row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h2 className="text-sm font-bold mb-1">Gaspillage par jour (MAD)</h2>
                            <p className="text-xs text-gray-400 mb-4">Évolution quotidienne : ralenti et excès de vitesse empilés</p>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyChart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: c.text, fontSize: 11 }} axisLine={false} tickLine={false} interval={xInterval} />
                                        <YAxis tick={{ fill: c.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip {...tooltipStyle} formatter={(v: any) => `${fmt(Number(v))} MAD`} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="idle" name="Ralenti" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="speed" name="Vitesse" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col">
                            <h2 className="text-sm font-bold mb-1">Origine des pertes</h2>
                            <p className="text-xs text-gray-400 mb-2">Répartition en MAD</p>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3} stroke="none">
                                            {pieData.map((p, i) => <Cell key={i} fill={p.color} />)}
                                        </Pie>
                                        <Tooltip {...tooltipStyle} formatter={(v: any) => `${fmt(Number(v))} MAD`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-auto space-y-2 text-xs">
                                <div className="flex justify-between"><span className="flex items-center gap-2 text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Ralenti</span><span className="font-semibold">{fmt(fleet.idleCost)} MAD · {fmt(fleet.idleL, 1)} L</span></div>
                                <div className="flex justify-between"><span className="flex items-center gap-2 text-red-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Vitesse &gt; {speedThreshold}</span><span className="font-semibold">{fmt(fleet.speedCost)} MAD · {fmt(fleet.speedL, 1)} L</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Charts row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h2 className="text-sm font-bold mb-1">Quand le ralenti se produit (heure du jour)</h2>
                            <p className="text-xs text-gray-400 mb-4">Heures de ralenti cumulées par tranche horaire : repérez les moments à corriger</p>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourlyChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                                        <XAxis dataKey="hour" tick={{ fill: c.text, fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                                        <YAxis tick={{ fill: c.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => (n === 'hours' ? `${fmt(Number(v), 1)} h` : `${fmt(Number(v))} MAD`)} />
                                        <Bar dataKey="hours" name="hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h2 className="text-sm font-bold mb-1">Véhicules les plus coûteux (MAD)</h2>
                            <p className="text-xs text-gray-400 mb-4">Classement du gaspillage par véhicule</p>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topWasters} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
                                        <XAxis type="number" tick={{ fill: c.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" width={50} tick={{ fill: c.textStrong, fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip {...tooltipStyle} formatter={(v: any) => `${fmt(Number(v))} MAD`} />
                                        <Bar dataKey="idle" name="Ralenti" stackId="a" fill="#f59e0b" />
                                        <Bar dataKey="speed" name="Vitesse" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* ROI simulator */}
                    <div className="mb-6 bg-gradient-to-br from-blue-950/30 via-gray-900 to-emerald-950/20 border border-blue-900/40 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                            <h2 className="text-sm font-bold flex items-center gap-2"><Sparkles size={16} className="text-blue-400" />Simulateur d'économies (ROI)</h2>
                            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">Projection mensuelle</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-5">Basé sur {fleet.days} jour{fleet.days > 1 ? 's' : ''} d'historique réel, extrapolé à 30 jours.</p>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2 text-xs">
                                    <span className="text-gray-300 font-medium">Réduction du ralenti visée</span>
                                    <span className="text-lg font-bold text-emerald-400">{targetReduction}%</span>
                                </div>
                                <input type="range" min={10} max={80} step={5} value={targetReduction}
                                    onChange={e => setTargetReduction(Number(e.target.value))}
                                    className="w-full accent-emerald-500 cursor-pointer" />
                                <div className="flex justify-between text-[10px] text-gray-500 mt-1"><span>10%</span><span>35% recommandé</span><span>80%</span></div>
                            </div>
                            <div className="p-4 rounded-xl bg-gray-950/80 border border-emerald-900/40">
                                <span className="text-xs text-gray-400">Économie mensuelle projetée</span>
                                <div className="text-2xl font-black text-emerald-400 mt-1">+ {fmt((fleet.monthlyIdleCost * targetReduction) / 100)} <span className="text-sm font-semibold">MAD / mois</span></div>
                                <span className="text-[11px] text-gray-500">sur un ralenti de {fmt(fleet.monthlyIdleCost)} MAD / mois</span>
                            </div>
                            <div className="p-4 rounded-xl bg-gray-950/80 border border-emerald-900/40">
                                <span className="text-xs text-gray-400">Économie annuelle projetée</span>
                                <div className="text-2xl font-black text-emerald-400 mt-1">+ {fmt((fleet.monthlyIdleCost * targetReduction * 12) / 100)} <span className="text-sm font-semibold">MAD / an</span></div>
                                <span className="text-[11px] text-emerald-400/90">≈ {fmt((((fleet.monthlyIdleCost * targetReduction) / 100) / fuelPrice) * 12 * CO2_PER_LITER)} kg de CO₂ évités / an</span>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle table */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
                        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold flex items-center gap-2"><Car size={18} className="text-blue-400" />Analyse détaillée par véhicule</h2>
                                <p className="text-xs text-gray-400">Cliquez sur un véhicule pour voir son historique jour par jour, ses heures de ralenti et ses événements</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>Trier par</span>
                                <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                                    className="bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500">
                                    <option value="cost">Coût gaspillé</option>
                                    <option value="idle">Temps de ralenti</option>
                                    <option value="km">Distance</option>
                                    <option value="score">Score éco (pire d'abord)</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-950/70 text-gray-400 font-semibold border-b border-gray-800">
                                    <tr>
                                        <th className="p-3.5 pl-4">Véhicule</th>
                                        <th className="p-3.5">Catégorie</th>
                                        <th className="p-3.5">Statut</th>
                                        <th className="p-3.5">Distance</th>
                                        <th className="p-3.5">Ralenti</th>
                                        <th className="p-3.5">Km &gt; {speedThreshold}</th>
                                        <th className="p-3.5">Vit. max</th>
                                        <th className="p-3.5">Perdu</th>
                                        <th className="p-3.5">Coût</th>
                                        <th className="p-3.5">Score</th>
                                        <th className="p-3.5 text-center pr-4">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/60">
                                    {sorted.map((v, i) => {
                                        const open = expanded === v.device_id;
                                        return (
                                            <Fragment key={v.device_id}>
                                                <tr className="hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => setExpanded(open ? null : v.device_id)}>
                                                    <td className="p-3.5 pl-4 font-semibold">
                                                        <div className="flex items-center gap-2">
                                                            {open ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-gray-500" />}
                                                            <span className="text-gray-500 w-4">{i + 1}.</span>
                                                            <div>
                                                                <div>{v.name}</div>
                                                                <div className="text-[10px] text-gray-500 font-mono">{v.device_id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3.5" onClick={e => e.stopPropagation()}>
                                                        <select value={v.vehicleType} onChange={e => setType(v.device_id, e.target.value as VType)}
                                                            className="bg-gray-950 border border-gray-700 text-gray-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500">
                                                            <option value="light">Léger (1,3 L/h)</option>
                                                            <option value="van">Fourgon (1,8 L/h)</option>
                                                            <option value="truck">Poids lourd (3,0 L/h)</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${v.current_state === 'moving' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : v.current_state === 'idling' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-gray-800 text-gray-400'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${v.current_state === 'moving' ? 'bg-emerald-400' : v.current_state === 'idling' ? 'bg-amber-400' : 'bg-gray-500'}`} />
                                                            {v.current_state === 'moving' ? `En route (${Math.round(v.speed)} km/h)` : v.current_state === 'idling' ? 'Ralenti' : 'Stationné'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 font-mono text-gray-300">{fmt(v.distanceKm, 1)} km</td>
                                                    <td className="p-3.5 text-amber-400 font-medium">{fmt(v.idleHours, 1)} h</td>
                                                    <td className={`p-3.5 font-medium ${v.speedingKm > 0 ? 'text-red-400' : 'text-gray-500'}`}>{fmt(v.speedingKm, 1)} km</td>
                                                    <td className={`p-3.5 font-semibold ${v.maxSpeed > 120 ? 'text-red-400' : v.maxSpeed > speedThreshold ? 'text-amber-400' : 'text-gray-300'}`}>{v.maxSpeed} km/h</td>
                                                    <td className="p-3.5 font-semibold">{fmt(v.wasteL, 1)} L</td>
                                                    <td className="p-3.5 font-bold text-red-400">{fmt(v.cost)} MAD</td>
                                                    <td className="p-3.5">
                                                        {v.score === null ? <span className="text-gray-600">—</span> : (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-14 bg-gray-800 h-2 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${v.score >= 80 ? 'bg-emerald-400' : v.score >= 65 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${v.score}%` }} />
                                                                </div>
                                                                <span className="font-semibold text-gray-300">{v.score}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5 text-center pr-4">
                                                        {v.grade ? <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${gradeBadge[v.grade]}`}>{v.grade}</span> : <span className="text-gray-600">—</span>}
                                                    </td>
                                                </tr>

                                                {open && (
                                                    <tr className="bg-gray-950/60">
                                                        <td colSpan={11} className="p-5">
                                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                                                                {[
                                                                    { l: 'Ralenti / temps moteur', v: `${fmt(v.idleRatio * 100)}%` },
                                                                    { l: 'Vitesse moyenne en route', v: `${v.avgSpeed} km/h` },
                                                                    { l: 'Événements de ralenti', v: `${v.idleEventCount}` },
                                                                    { l: 'Plus long ralenti', v: v.longestIdleMin ? fmtDur(v.longestIdleMin) : '—' },
                                                                    { l: 'Km hors horaires (20h–6h)', v: `${fmt(v.offHoursKm, 1)} km` },
                                                                ].map(s => (
                                                                    <div key={s.l} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                                                                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">{s.l}</div>
                                                                        <div className="text-lg font-bold mt-0.5">{s.v}</div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                                <div>
                                                                    <div className="text-xs font-semibold text-gray-300 mb-2">Gaspillage par jour (MAD)</div>
                                                                    <div className="h-44">
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <BarChart data={v.dailyCost.map(x => ({ label: dd(x.date), idle: Math.round(x.idleCost), speed: Math.round(x.speedCost) }))} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                                                                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                                                                                <XAxis dataKey="label" tick={{ fill: c.text, fontSize: 10 }} axisLine={false} tickLine={false} interval={xInterval} />
                                                                                <YAxis tick={{ fill: c.text, fontSize: 10 }} axisLine={false} tickLine={false} />
                                                                                <Tooltip {...tooltipStyle} formatter={(val: any) => `${fmt(Number(val))} MAD`} />
                                                                                <Bar dataKey="idle" name="Ralenti" stackId="a" fill="#f59e0b" />
                                                                                <Bar dataKey="speed" name="Vitesse" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
                                                                            </BarChart>
                                                                        </ResponsiveContainer>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-semibold text-gray-300 mb-2">Ralenti par heure du jour (h)</div>
                                                                    <div className="h-44">
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <BarChart data={v.hourlyIdle.map((h, idx) => ({ hour: `${idx}h`, h }))} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                                                                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                                                                                <XAxis dataKey="hour" tick={{ fill: c.text, fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                                                                                <YAxis tick={{ fill: c.text, fontSize: 10 }} axisLine={false} tickLine={false} />
                                                                                <Tooltip {...tooltipStyle} formatter={(val: any) => `${fmt(Number(val), 2)} h`} />
                                                                                <Bar dataKey="h" name="Ralenti" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                                                                            </BarChart>
                                                                        </ResponsiveContainer>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-5">
                                                                <div className="text-xs font-semibold text-gray-300 mb-2">Plus longs ralentis (≥ 3 min)</div>
                                                                {v.events.length === 0 ? (
                                                                    <div className="text-xs text-gray-500">Aucun ralenti prolongé sur cette période.</div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                                                        {v.events.slice(0, 6).map((e, k) => (
                                                                            <a key={k} href={`https://www.google.com/maps?q=${e.lat},${e.lng}`} target="_blank" rel="noreferrer"
                                                                                className="flex items-center justify-between gap-3 bg-gray-900 border border-gray-800 hover:border-blue-500/50 rounded-xl px-3 py-2 transition-colors">
                                                                                <div>
                                                                                    <div className="text-xs font-semibold text-amber-400">{fmtDur(e.minutes)} · ≈ {fmt((e.minutes / 60) * v.rate, 1)} L · {fmt((e.minutes / 60) * v.rate * fuelPrice)} MAD</div>
                                                                                    <div className="text-[11px] text-gray-400">{fmtDateTime(e.start)}</div>
                                                                                </div>
                                                                                <MapPin size={14} className="text-blue-400 shrink-0" />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Idle events log */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
                        <div className="p-4 border-b border-gray-800">
                            <h2 className="text-base font-bold flex items-center gap-2"><Clock size={18} className="text-amber-400" />Journal des ralentis prolongés</h2>
                            <p className="text-xs text-gray-400">Les plus longues périodes moteur allumé à l'arrêt de la flotte, avec lieu et coût</p>
                        </div>
                        {!data?.topEvents || data.topEvents.length === 0 ? (
                            <div className="p-6 text-xs text-gray-500">Aucun ralenti prolongé détecté sur cette période.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-950/70 text-gray-400 font-semibold border-b border-gray-800">
                                        <tr>
                                            <th className="p-3.5 pl-4">Véhicule</th>
                                            <th className="p-3.5">Début</th>
                                            <th className="p-3.5">Durée</th>
                                            <th className="p-3.5">Carburant perdu</th>
                                            <th className="p-3.5">Coût</th>
                                            <th className="p-3.5 pr-4">Lieu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {data.topEvents.slice(0, 15).map((e, i) => {
                                            const liters = (e.minutes / 60) * eventRate(e.device_id);
                                            return (
                                                <tr key={i} className="hover:bg-gray-800/40">
                                                    <td className="p-3.5 pl-4 font-semibold">{e.name}</td>
                                                    <td className="p-3.5 text-gray-300">{fmtDateTime(e.start)}</td>
                                                    <td className="p-3.5 text-amber-400 font-semibold">{fmtDur(e.minutes)}</td>
                                                    <td className="p-3.5">{fmt(liters, 1)} L</td>
                                                    <td className="p-3.5 text-red-400 font-semibold">{fmt(liters * fuelPrice)} MAD</td>
                                                    <td className="p-3.5 pr-4">
                                                        <a href={`https://www.google.com/maps?q=${e.lat},${e.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                                                            <MapPin size={12} />Voir sur la carte
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Action plan */}
                    <div className="p-5 bg-gradient-to-r from-gray-900 to-gray-950 border border-gray-800 rounded-2xl">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Sparkles size={16} className="text-amber-400" />Plan d'action recommandé</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-300">
                            <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl">
                                <strong className="text-amber-400 block mb-1">1. Couper le moteur après 3 minutes</strong>
                                {sorted[0] && sorted[0].idleHours > 0
                                    ? <>Commencez par {sorted[0].name} ({fmt(sorted[0].idleHours, 1)} h de ralenti). Chaque heure évitée économise environ {fmt(sorted[0].rate * fuelPrice)} MAD.</>
                                    : <>Sensibilisez les conducteurs : un moteur allumé à l'arrêt consomme 1 à 3 L par heure.</>}
                            </div>
                            <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl">
                                <strong className="text-red-400 block mb-1">2. Limiter la vitesse à {speedThreshold} km/h</strong>
                                {fleet.speedingKm > 0
                                    ? <>{fmt(fleet.speedingKm, 1)} km ont été roulés au-dessus du seuil. Rouler plus doucement peut économiser jusqu'à 2 L / 100 km.</>
                                    : <>Aucun excès significatif détecté : continuez ainsi.</>}
                            </div>
                            <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl">
                                <strong className="text-emerald-400 block mb-1">3. Challenge éco-conduite</strong>
                                {(() => {
                                    const best = [...vehicles].filter(v => v.score !== null).sort((a, b) => (b.score as number) - (a.score as number))[0];
                                    return best
                                        ? <>Meilleur score : {best.name} ({best.score}/100). Affichez le classement chaque mois pour motiver toute l'équipe.</>
                                        : <>Affichez le classement chaque mois pour motiver les conducteurs.</>;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
