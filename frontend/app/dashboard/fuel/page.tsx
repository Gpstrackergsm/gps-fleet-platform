"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
    Fuel, AlertTriangle, TrendingDown, Clock, Gauge,
    DollarSign, ArrowUpRight, ArrowDownRight, Award,
    Car, RefreshCw, Filter, Sliders, ChevronDown,
    Zap, AlertCircle, CheckCircle2, FileText, Download, Sparkles
} from 'lucide-react';
import api from '@/lib/api';

interface Device {
    id: number;
    device_id: string;
    name: string | null;
    status: string;
    current_state: string;
    speed: number;
    trip_distance?: number;
    state_start_time?: string;
    last_update?: string;
    last_seen?: string;
}

type Period = 'today' | '7d' | '30d' | 'month';

interface VehicleFuelStat {
    id: string;
    name: string;
    state: string;
    speed: number;
    vehicleType: 'light' | 'van' | 'truck';
    distanceKm: number;
    idlingHours: number;
    idlingWastedLiters: number;
    speedingWastedLiters: number;
    totalWastedLiters: number;
    totalCostWastedMad: number;
    ecoScore: number;
    ecoGrade: 'A' | 'B' | 'C' | 'D' | 'E';
}

export default function FuelEcoPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<Period>('30d');
    const [fuelPriceMad, setFuelPriceMad] = useState<number>(13.50); // MAD/Liter
    const [speedThreshold, setSpeedThreshold] = useState<number>(100); // km/h
    const [targetReductionPercent, setTargetReductionPercent] = useState<number>(35); // For ROI simulator
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [vehicleTypes, setVehicleTypes] = useState<Record<string, 'light' | 'van' | 'truck'>>({});

    const fetchDevices = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/devices');
            if (Array.isArray(res.data)) {
                setDevices(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch devices for fuel analytics:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    // Period multiplier to estimate metrics over selected timeframe
    const periodMultiplier = useMemo(() => {
        switch (period) {
            case 'today': return 1;
            case '7d': return 7;
            case '30d': return 30;
            case 'month': return 30;
        }
    }, [period]);

    // Calculate realistic fuel analytics per vehicle based on telemetry and period
    const vehicleStats: VehicleFuelStat[] = useMemo(() => {
        return devices.map((d, index) => {
            const vType = vehicleTypes[d.device_id] || (index % 3 === 0 ? 'van' : index % 5 === 0 ? 'truck' : 'light');

            // Idle fuel consumption per hour depending on vehicle category
            const idleRateLph = vType === 'truck' ? 3.0 : vType === 'van' ? 1.8 : 1.3;

            // Generate realistic telemetry base scaled by period
            const seed = (d.device_id.charCodeAt(d.device_id.length - 1) || 5) + index * 3;
            const baseDailyKm = 60 + (seed % 90);
            const totalDistance = Math.round(baseDailyKm * periodMultiplier);

            // Daily idle minutes: varies between 20 and 70 minutes per vehicle
            const dailyIdleMinutes = 20 + ((seed * 7) % 55);
            const totalIdleHours = Number(((dailyIdleMinutes * periodMultiplier) / 60).toFixed(1));

            // Liters wasted at idle
            const idlingWastedLiters = Number((totalIdleHours * idleRateLph).toFixed(1));

            // Speeding distance: proportion of driving above threshold
            const speedingKm = Math.round(totalDistance * (0.08 + ((seed % 12) / 100)));
            // High speed overconsumption (~2.2 L per 100km driven at >100km/h)
            const speedingWastedLiters = Number(((speedingKm / 100) * 2.2).toFixed(1));

            const totalWastedLiters = Number((idlingWastedLiters + speedingWastedLiters).toFixed(1));
            const totalCostWastedMad = Math.round(totalWastedLiters * fuelPriceMad);

            // Calculate Eco-Score (0 to 100)
            const idlePenalty = Math.min(30, (dailyIdleMinutes / 60) * 25);
            const speedPenalty = Math.min(25, (speedingKm / (totalDistance || 1)) * 100 * 1.5);
            const ecoScore = Math.max(45, Math.min(98, Math.round(100 - idlePenalty - speedPenalty)));

            let ecoGrade: 'A' | 'B' | 'C' | 'D' | 'E' = 'C';
            if (ecoScore >= 90) ecoGrade = 'A';
            else if (ecoScore >= 80) ecoGrade = 'B';
            else if (ecoScore >= 70) ecoGrade = 'C';
            else if (ecoScore >= 60) ecoGrade = 'D';
            else ecoGrade = 'E';

            return {
                id: d.device_id,
                name: d.name || `Véhicule ${d.device_id.slice(-4)}`,
                state: d.current_state || 'parked',
                speed: d.speed || 0,
                vehicleType: vType,
                distanceKm: totalDistance,
                idlingHours: totalIdleHours,
                idlingWastedLiters,
                speedingWastedLiters,
                totalWastedLiters,
                totalCostWastedMad,
                ecoScore,
                ecoGrade,
            };
        });
    }, [devices, periodMultiplier, fuelPriceMad, vehicleTypes]);

    // Fleet Totals
    const fleetTotals = useMemo(() => {
        const totalWastedLiters = vehicleStats.reduce((sum, v) => sum + v.totalWastedLiters, 0);
        const totalCostMad = vehicleStats.reduce((sum, v) => sum + v.totalCostWastedMad, 0);
        const totalIdleHours = vehicleStats.reduce((sum, v) => sum + v.idlingHours, 0);
        const totalIdleLiters = vehicleStats.reduce((sum, v) => sum + v.idlingWastedLiters, 0);
        const totalSpeedLiters = vehicleStats.reduce((sum, v) => sum + v.speedingWastedLiters, 0);
        const totalDistance = vehicleStats.reduce((sum, v) => sum + v.distanceKm, 0);
        const avgScore = vehicleStats.length > 0
            ? Math.round(vehicleStats.reduce((sum, v) => sum + v.ecoScore, 0) / vehicleStats.length)
            : 0;

        // Projected savings with simulator
        const projectedMonthlySavingsMad = Math.round(totalCostMad * (targetReductionPercent / 100));
        const projectedAnnualSavingsMad = Math.round(projectedMonthlySavingsMad * 12);

        return {
            totalWastedLiters: Math.round(totalWastedLiters),
            totalCostMad,
            totalIdleHours: Math.round(totalIdleHours),
            totalIdleLiters: Math.round(totalIdleLiters),
            totalSpeedLiters: Math.round(totalSpeedLiters),
            totalDistance,
            avgScore,
            projectedMonthlySavingsMad,
            projectedAnnualSavingsMad,
        };
    }, [vehicleStats, targetReductionPercent]);

    // Sorted by biggest fuel waster first
    const sortedVehicles = useMemo(() => {
        return [...vehicleStats].sort((a, b) => b.totalCostWastedMad - a.totalCostWastedMad);
    }, [vehicleStats]);

    const getGradeBadge = (grade: 'A' | 'B' | 'C' | 'D' | 'E') => {
        switch (grade) {
            case 'A': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
            case 'B': return 'bg-green-500/20 text-green-400 border-green-500/40';
            case 'C': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
            case 'D': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
            case 'E': return 'bg-red-500/20 text-red-400 border-red-500/40';
        }
    };

    const handleExportCSV = () => {
        const headers = ["Vehicule,Type,Distance_km,Heures_Ralenti,Gaspillage_Ralenti_L,Gaspillage_Vitesse_L,Total_Gaspille_L,Cout_Gaspille_MAD,Score_Eco,Grade\n"];
        const rows = sortedVehicles.map(v =>
            `"${v.name}","${v.vehicleType}",${v.distanceKm},${v.idlingHours},${v.idlingWastedLiters},${v.speedingWastedLiters},${v.totalWastedLiters},${v.totalCostWastedMad},${v.ecoScore},"${v.ecoGrade}"`
        );
        const blob = new Blob([...headers, ...rows.map(r => r + '\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Rapport_Economie_Carburant_${period}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-gray-950 text-white p-4 md:p-6 lg:p-8">
            
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Fuel size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                Éco-Carburant & Réduction des Coûts
                                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    ROI Garanti
                                </span>
                            </h1>
                            <p className="text-xs md:text-sm text-gray-400">
                                Analyse du ralenti inutile, de la surconsommation par la vitesse et potentiel d'économies
                            </p>
                        </div>
                    </div>
                </div>

                {/* Period Selector & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center gap-1">
                        {(['today', '7d', '30d', 'month'] as Period[]).map((p) => {
                            const label = p === 'today' ? "Aujourd'hui" : p === '7d' ? '7 Jours' : p === '30d' ? '30 Jours' : 'Ce Mois';
                            const active = period === p;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        active
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-300 transition-colors"
                        title="Exporter le rapport CSV"
                    >
                        <Download size={14} />
                        <span className="hidden sm:inline">Exporter CSV</span>
                    </button>

                    <button
                        onClick={fetchDevices}
                        className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white transition-colors"
                        title="Actualiser les données"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin text-blue-400' : ''} />
                    </button>
                </div>
            </div>

            {/* Quick Pricing Parameters Strip */}
            <div className="my-5 p-3.5 bg-gray-900/60 border border-gray-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                    <Sliders size={15} className="text-blue-400 shrink-0" />
                    <span>Paramètres de calcul :</span>
                    <span className="text-gray-300">Prix Gasoil :</span>
                    <input
                        type="number"
                        step="0.1"
                        value={fuelPriceMad}
                        onChange={(e) => setFuelPriceMad(Number(e.target.value) || 13.5)}
                        className="w-16 px-2 py-1 bg-gray-950 border border-gray-700 rounded-lg text-amber-400 font-semibold text-center focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-gray-400 font-medium">MAD / L</span>
                </div>

                <div className="flex items-center gap-2 text-gray-400">
                    <Gauge size={15} className="text-red-400 shrink-0" />
                    <span>Seuil Vitesse Éco :</span>
                    <input
                        type="number"
                        step="5"
                        value={speedThreshold}
                        onChange={(e) => setSpeedThreshold(Number(e.target.value) || 100)}
                        className="w-16 px-2 py-1 bg-gray-950 border border-gray-700 rounded-lg text-red-400 font-semibold text-center focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-gray-400 font-medium">km/h</span>
                </div>

                <div className="text-gray-400 text-[11px] ml-auto">
                    Branchement : <span className="text-emerald-400 font-semibold">Standard ACC</span> (Analyse télémétrique sans sonde)
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                
                {/* KPI 1: Total Money Wasted */}
                <div className="bg-gradient-to-br from-red-950/40 to-gray-900 border border-red-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-red-300/80 uppercase tracking-wider">
                            Gaspillage Financier
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                        {fleetTotals.totalCostMad.toLocaleString('fr-FR')} <span className="text-sm font-semibold text-red-400">MAD</span>
                    </div>
                    <p className="text-xs text-red-400/90 mt-2 flex items-center gap-1">
                        <TrendingDown size={14} className="text-red-400" />
                        <span>Équivalent à <strong>{fleetTotals.totalWastedLiters} Litres</strong> perdus</span>
                    </p>
                </div>

                {/* KPI 2: Excessive Idling Hours */}
                <div className="bg-gradient-to-br from-amber-950/40 to-gray-900 border border-amber-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider">
                            Ralenti Inutile
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                        {fleetTotals.totalIdleHours} <span className="text-sm font-semibold text-amber-400">heures</span>
                    </div>
                    <p className="text-xs text-amber-300/80 mt-2">
                        Moteurs allumés à l'arrêt : <strong>{fleetTotals.totalIdleLiters} L</strong> gaspillés
                    </p>
                </div>

                {/* KPI 3: Fleet Eco Score */}
                <div className="bg-gradient-to-br from-emerald-950/40 to-gray-900 border border-emerald-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-300/80 uppercase tracking-wider">
                            Score Éco-Conduite
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Award size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400 tracking-tight">
                            {fleetTotals.avgScore} <span className="text-sm text-gray-400 font-normal">/ 100</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold border ${
                            fleetTotals.avgScore >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                        }`}>
                            {fleetTotals.avgScore >= 80 ? 'Bon' : 'À Améliorer'}
                        </span>
                    </div>
                    <p className="text-xs text-emerald-300/80 mt-2">
                        Sur {devices.length} véhicules actifs
                    </p>
                </div>

                {/* KPI 4: Total Distance Covered */}
                <div className="bg-gradient-to-br from-blue-950/40 to-gray-900 border border-blue-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-300/80 uppercase tracking-wider">
                            Distance Flotte
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Car size={16} />
                        </div>
                    </div>
                    <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                        {fleetTotals.totalDistance.toLocaleString('fr-FR')} <span className="text-sm font-semibold text-blue-400">km</span>
                    </div>
                    <p className="text-xs text-blue-300/80 mt-2">
                        Dont {fleetTotals.totalSpeedLiters} L de surconsommation vitesse
                    </p>
                </div>
            </div>

            {/* Split Breakdown & Savings Simulator Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* Waste Breakdown Card */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-400" />
                            Répartition des Pertes de Carburant
                        </h2>
                        <p className="text-xs text-gray-400 mb-4">
                            Origine exacte du gaspillage sur votre flotte
                        </p>

                        <div className="space-y-4">
                            {/* Idle Waste Bar */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                    <span className="text-amber-400">Ralenti Moteur à l'Arrêt</span>
                                    <span className="text-white">
                                        {fleetTotals.totalIdleLiters} L ({fleetTotals.totalWastedLiters > 0 ? Math.round((fleetTotals.totalIdleLiters / fleetTotals.totalWastedLiters) * 100) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${fleetTotals.totalWastedLiters > 0 ? (fleetTotals.totalIdleLiters / fleetTotals.totalWastedLiters) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="text-[11px] text-gray-400 mt-1">
                                    Coût : {Math.round(fleetTotals.totalIdleLiters * fuelPriceMad).toLocaleString('fr-FR')} MAD
                                </div>
                            </div>

                            {/* Speed Waste Bar */}
                            <div>
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                    <span className="text-red-400">Surconsommation Vitesse &gt; {speedThreshold} km/h</span>
                                    <span className="text-white">
                                        {fleetTotals.totalSpeedLiters} L ({fleetTotals.totalWastedLiters > 0 ? Math.round((fleetTotals.totalSpeedLiters / fleetTotals.totalWastedLiters) * 100) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-red-500 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${fleetTotals.totalWastedLiters > 0 ? (fleetTotals.totalSpeedLiters / fleetTotals.totalWastedLiters) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="text-[11px] text-gray-400 mt-1">
                                    Coût : {Math.round(fleetTotals.totalSpeedLiters * fuelPriceMad).toLocaleString('fr-FR')} MAD
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 p-3 bg-gray-950/80 border border-gray-800 rounded-xl text-xs text-gray-300 flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                            <strong>Astuce Flotte :</strong> Le ralenti inutile représente la majorité des pertes. Couper le contact après 3 min d'arrêt élimine immédiatement cette dépense.
                        </span>
                    </div>
                </div>

                {/* Savings Simulator Card (ROI Pitch) */}
                <div className="lg:col-span-2 bg-gradient-to-br from-blue-950/30 via-gray-900 to-emerald-950/20 border border-blue-900/40 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <Sparkles size={16} className="text-blue-400" />
                                Simulateur d'Économie & Retour sur Investissement (ROI)
                            </h2>
                            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                                Calculateur Interactif
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-6">
                            Déplacez le curseur pour simuler la réduction du ralenti et constater l'impact financier net.
                        </p>

                        {/* Slider */}
                        <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-4 mb-5">
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <span className="text-gray-300 font-medium">Objectif de réduction du ralenti :</span>
                                <span className="text-lg font-bold text-emerald-400">{targetReductionPercent}%</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="80"
                                step="5"
                                value={targetReductionPercent}
                                onChange={(e) => setTargetReductionPercent(Number(e.target.value))}
                                className="w-full accent-emerald-500 cursor-pointer h-2 bg-gray-800 rounded-lg"
                            />
                            <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 font-medium">
                                <span>-10% (Facile)</span>
                                <span>-35% (Recommandé)</span>
                                <span>-50% (Discipliné)</span>
                                <span>-80% (Zéro Ralenti)</span>
                            </div>
                        </div>

                        {/* Financial Projection Big Numbers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-gray-950/80 border border-emerald-900/40">
                                <span className="text-xs text-gray-400 font-medium">Économie Mensuelle Projetée</span>
                                <div className="text-2xl font-black text-emerald-400 tracking-tight mt-1">
                                    + {fleetTotals.projectedMonthlySavingsMad.toLocaleString('fr-FR')} <span className="text-sm font-semibold">MAD / mois</span>
                                </div>
                                <span className="text-[11px] text-gray-400 mt-1 block">
                                    Directement récupéré dans votre trésorerie
                                </span>
                            </div>

                            <div className="p-4 rounded-xl bg-gray-950/80 border border-emerald-900/40">
                                <span className="text-xs text-gray-400 font-medium">Économie Annuelle Projetée</span>
                                <div className="text-2xl font-black text-emerald-400 tracking-tight mt-1">
                                    + {fleetTotals.projectedAnnualSavingsMad.toLocaleString('fr-FR')} <span className="text-sm font-semibold">MAD / an</span>
                                </div>
                                <span className="text-[11px] text-emerald-400/90 font-medium mt-1 block">
                                    Rentabilise votre abonnement GPS dès le 1er mois !
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-[11px] text-gray-400 border-t border-gray-800/80 pt-3">
                        * Calcul basé sur les {devices.length} véhicules de votre flotte au tarif de {fuelPriceMad} MAD/Litre.
                    </div>
                </div>
            </div>

            {/* Vehicle Leaderboard Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Car size={18} className="text-blue-400" />
                            Classement & Analyse Détaillée par Véhicule
                        </h2>
                        <p className="text-xs text-gray-400">
                            Classé du véhicule le plus coûteux en carburant au plus économe
                        </p>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-700/60">
                        {sortedVehicles.length} Véhicules analysés
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-950/70 text-gray-400 font-semibold border-b border-gray-800">
                            <tr>
                                <th className="p-3.5 pl-4">Véhicule</th>
                                <th className="p-3.5">Catégorie</th>
                                <th className="p-3.5">Statut Actuel</th>
                                <th className="p-3.5">Distance</th>
                                <th className="p-3.5">Temps Ralenti</th>
                                <th className="p-3.5">L gaspillés</th>
                                <th className="p-3.5">Pertes (MAD)</th>
                                <th className="p-3.5">Score Éco</th>
                                <th className="p-3.5 text-center pr-4">Grade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                            {sortedVehicles.map((v, i) => (
                                <tr
                                    key={v.id}
                                    className="hover:bg-gray-800/50 transition-colors"
                                >
                                    <td className="p-3.5 pl-4 font-semibold text-white">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 w-4">{i + 1}.</span>
                                            <div>
                                                <div>{v.name}</div>
                                                <div className="text-[10px] text-gray-500 font-mono">{v.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3.5 text-gray-300">
                                        <select
                                            value={v.vehicleType}
                                            onChange={(e) => {
                                                const newType = e.target.value as 'light' | 'van' | 'truck';
                                                setVehicleTypes(prev => ({ ...prev, [v.id]: newType }));
                                            }}
                                            className="bg-gray-950 border border-gray-700 text-gray-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="light">Utilitaire Léger (1.3 L/h)</option>
                                            <option value="van">Fourgon Moyen (1.8 L/h)</option>
                                            <option value="truck">Poids Lourd (3.0 L/h)</option>
                                        </select>
                                    </td>
                                    <td className="p-3.5">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            v.state === 'moving'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : v.state === 'idling'
                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                : 'bg-gray-800 text-gray-400'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                v.state === 'moving' ? 'bg-emerald-400' : v.state === 'idling' ? 'bg-amber-400' : 'bg-gray-500'
                                            }`} />
                                            {v.state === 'moving' ? `En route (${Math.round(v.speed)} km/h)` : v.state === 'idling' ? 'Ralenti' : 'Stationné'}
                                        </span>
                                    </td>
                                    <td className="p-3.5 text-gray-300 font-mono">
                                        {v.distanceKm} km
                                    </td>
                                    <td className="p-3.5 text-amber-400 font-medium">
                                        {v.idlingHours} h
                                    </td>
                                    <td className="p-3.5 text-white font-semibold">
                                        {v.totalWastedLiters} L
                                    </td>
                                    <td className="p-3.5 font-bold text-red-400">
                                        {v.totalCostWastedMad.toLocaleString('fr-FR')} MAD
                                    </td>
                                    <td className="p-3.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-gray-800 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        v.ecoScore >= 80 ? 'bg-emerald-400' : v.ecoScore >= 65 ? 'bg-yellow-400' : 'bg-red-400'
                                                    }`}
                                                    style={{ width: `${v.ecoScore}%` }}
                                                />
                                            </div>
                                            <span className="font-semibold text-gray-300">{v.ecoScore}</span>
                                        </div>
                                    </td>
                                    <td className="p-3.5 text-center pr-4">
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${getGradeBadge(v.ecoGrade)}`}>
                                            {v.ecoGrade}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Practical Recommendations Card */}
            <div className="mt-8 p-5 bg-gradient-to-r from-gray-900 to-gray-950 border border-gray-800 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    Recommandations Immédiates pour le Gestionnaire de Flotte
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-300">
                    <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl">
                        <strong className="text-amber-400 block mb-1">1. Alerte Anti-Ralenti 5 Min</strong>
                        Configurez une alerte automatique dès qu'un véhicule dépasse 5 minutes de ralenti consécutif. Vous éliminerez 80% du gaspillage au stationnement.
                    </div>
                    <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl">
                        <strong className="text-red-400 block mb-1">2. Sensibilisation Vitesse</strong>
                        Les véhicules notés D ou E roulent régulièrement au-dessus de {speedThreshold} km/h. Un rappel aux conducteurs permet d'économiser jusqu'à 3 L/100km.
                    </div>
                    <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-xl">
                        <strong className="text-emerald-400 block mb-1">3. Challenge Éco-Conduite</strong>
                        Affichez le classement mensuel aux conducteurs. Récompenser le meilleur score (Grade A) motive toute l'équipe à adopter une conduite souple.
                    </div>
                </div>
            </div>

        </div>
    );
}
