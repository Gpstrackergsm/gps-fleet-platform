"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
    BarChart2, Download, Printer, RefreshCw, Car, Clock, Route, Gauge,
    Fuel, ShieldAlert, MapPin, ExternalLink, Calendar, Filter, TrendingUp,
    CheckCircle2, AlertTriangle, Navigation
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
    CartesianGrid, Legend, ComposedChart, Line
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────
type ReportTab = 'overview' | 'trips' | 'speeding' | 'alerts';
type Period = 'today' | '7d' | '30d' | 'month';

interface DayPoint {
    date: string;
    idleHours: number;
    km: number;
    speedingKm: number;
}

interface IdleEvent {
    start: string;
    end: string;
    minutes: number;
    lat: number;
    lng: number;
}

interface ApiDevice {
    device_id: string;
    name: string;
    current_state: string;
    speed: number;
    positionCount: number;
    idleSeconds: number;
    idleHours: number;
    movingHours: number;
    distanceKm: number;
    speedingKm: number;
    offHoursKm: number;
    avgSpeed: number;
    maxSpeed: number;
    idleEventCount: number;
    longestIdleMin: number;
    daily: DayPoint[];
    events: IdleEvent[];
}

interface AnalyticsResponse {
    period: string;
    threshold: number;
    deviceCount: number;
    fleet?: {
        daily: DayPoint[];
        hourlyIdle: number[];
    };
    devices: ApiDevice[];
}

interface Position {
    id: number;
    lat: number;
    lng: number;
    speed: number;
    course: number;
    timestamp: string;
}

interface DetectedParking {
    index: number;
    lat: number;
    lng: number;
    startTime: string;
    endTime: string;
    durationSec: number;
    durationText: string;
}

interface DetectedTrip {
    index: number;
    startTime: string;
    endTime: string;
    durationSec: number;
    durationText: string;
    distanceKm: number;
    maxSpeed: number;
    avgSpeed: number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    estFuelL: number;
    estFuelMad: number;
}

interface AlertItem {
    id: number;
    device_id: string;
    vehicle_name?: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    lat: number;
    lng: number;
    speed: number;
    status: string;
    timestamp: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDurationSec(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    if (m > 0) return `${m} min`;
    return `${Math.max(0, Math.floor(sec))}s`;
}

function formatHours(hours: number): string {
    return formatDurationSec(Math.round(hours * 3600));
}

function filterGpsSpikes(positions: Position[], maxSpeedKmh = 180): Position[] {
    if (!positions || positions.length <= 1) return positions || [];
    const maxSpeedMs = (maxSpeedKmh * 1000) / 3600;
    const filtered: Position[] = [positions[0]];

    for (let i = 1; i < positions.length; i++) {
        const curr = positions[i];
        if (!curr.lat || !curr.lng || curr.lat === 0 || curr.lng === 0) continue;
        const prev = filtered[filtered.length - 1];
        const dt = Math.max(0.5, (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000);
        const distKm = haversine(prev.lat, prev.lng, curr.lat, curr.lng);
        const speedMs = (distKm * 1000) / dt;

        if (speedMs <= maxSpeedMs) {
            filtered.push(curr);
        } else if (i + 1 < positions.length) {
            const next = positions[i + 1];
            const dtNext = Math.max(0.5, (new Date(next.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000);
            const distNextKm = haversine(prev.lat, prev.lng, next.lat, next.lng);
            if ((distNextKm * 1000) / dtNext <= maxSpeedMs) continue;
            filtered.push(curr);
        }
    }
    return filtered;
}

function detectParkingsFromHistory(positions: Position[], minDurationSec = 120): DetectedParking[] {
    if (!positions || positions.length < 2) return [];
    const rawStops: { lat: number; lng: number; startMs: number; endMs: number }[] = [];
    let i = 0;
    const n = positions.length;

    while (i < n) {
        const anchor = positions[i];
        const anchorMs = new Date(anchor.timestamp).getTime();

        if (anchor.speed <= 4) {
            let j = i;
            let sumLat = anchor.lat;
            let sumLng = anchor.lng;
            let count = 1;

            while (j + 1 < n) {
                const next = positions[j + 1];
                const distFromAnchorKm = haversine(anchor.lat, anchor.lng, next.lat, next.lng);
                const distFromPrevKm = haversine(positions[j].lat, positions[j].lng, next.lat, next.lng);
                if (distFromAnchorKm <= 0.085 && (next.speed <= 4 || distFromPrevKm <= 0.045)) {
                    j++;
                    sumLat += next.lat;
                    sumLng += next.lng;
                    count++;
                } else {
                    break;
                }
            }

            let endMs = new Date(positions[j].timestamp).getTime();
            if (j + 1 < n) {
                const dep = positions[j + 1];
                if (haversine(positions[j].lat, positions[j].lng, dep.lat, dep.lng) <= 0.16) {
                    endMs = new Date(dep.timestamp).getTime();
                }
            }

            const durationSec = Math.floor((endMs - anchorMs) / 1000);
            if (durationSec >= minDurationSec) {
                rawStops.push({ lat: sumLat / count, lng: sumLng / count, startMs: anchorMs, endMs });
            }
            i = Math.max(i + 1, j + 1);
        } else {
            if (i + 1 < n) {
                const next = positions[i + 1];
                const distKm = haversine(anchor.lat, anchor.lng, next.lat, next.lng);
                const nextMs = new Date(next.timestamp).getTime();
                const gapSec = Math.floor((nextMs - anchorMs) / 1000);
                if (distKm <= 0.065 && gapSec >= minDurationSec) {
                    rawStops.push({
                        lat: (anchor.lat + next.lat) / 2,
                        lng: (anchor.lng + next.lng) / 2,
                        startMs: anchorMs,
                        endMs: nextMs,
                    });
                    i = i + 1;
                    continue;
                }
            }
            i++;
        }
    }

    const merged: typeof rawStops = [];
    for (const st of rawStops) {
        if (merged.length > 0) {
            const prev = merged[merged.length - 1];
            const distKm = haversine(prev.lat, prev.lng, st.lat, st.lng);
            const gapSec = (st.startMs - prev.endMs) / 1000;
            if (distKm <= 0.085 && gapSec <= 90) {
                prev.endMs = Math.max(prev.endMs, st.endMs);
                prev.lat = (prev.lat + st.lat) / 2;
                prev.lng = (prev.lng + st.lng) / 2;
                continue;
            }
        }
        merged.push({ ...st });
    }

    return merged.map((st, idx) => {
        const durationSec = Math.max(0, Math.floor((st.endMs - st.startMs) / 1000));
        return {
            index: idx + 1,
            lat: st.lat,
            lng: st.lng,
            startTime: new Date(st.startMs).toISOString(),
            endTime: new Date(st.endMs).toISOString(),
            durationSec,
            durationText: formatDurationSec(durationSec),
        };
    });
}

function detectTripsFromHistory(positions: Position[], parkings: DetectedParking[], fuelPriceMad = 13.5): DetectedTrip[] {
    if (!positions || positions.length < 2) return [];

    // Split positions into trip segments separated by parking stops
    const stopWindows = parkings.map(p => ({
        startMs: new Date(p.startTime).getTime(),
        endMs: new Date(p.endTime).getTime(),
    }));

    const segments: Position[][] = [];
    let currentSeg: Position[] = [];

    for (const pos of positions) {
        const ms = new Date(pos.timestamp).getTime();
        const inStop = stopWindows.some(w => ms > w.startMs + 15000 && ms < w.endMs - 15000);
        if (inStop) {
            if (currentSeg.length >= 2) {
                segments.push(currentSeg);
            }
            currentSeg = [];
        } else {
            if (currentSeg.length > 0) {
                const prevMs = new Date(currentSeg[currentSeg.length - 1].timestamp).getTime();
                // Also split if a stop window occurred between prevMs and ms
                const crossedStop = stopWindows.some(w => prevMs <= w.startMs && ms >= w.endMs);
                if (crossedStop) {
                    if (currentSeg.length >= 2) segments.push(currentSeg);
                    currentSeg = [pos];
                    continue;
                }
            }
            currentSeg.push(pos);
        }
    }
    if (currentSeg.length >= 2) segments.push(currentSeg);

    const trips: DetectedTrip[] = [];
    for (const seg of segments) {
        let distKm = 0;
        let maxSpeed = 0;
        let speedSum = 0;
        for (let i = 1; i < seg.length; i++) {
            distKm += haversine(seg[i - 1].lat, seg[i - 1].lng, seg[i].lat, seg[i].lng);
            if (seg[i].speed > maxSpeed) maxSpeed = seg[i].speed;
            speedSum += seg[i].speed;
        }
        if (distKm < 0.15) continue; // Ignore micro movements < 150m

        const startMs = new Date(seg[0].timestamp).getTime();
        const endMs = new Date(seg[seg.length - 1].timestamp).getTime();
        const durationSec = Math.max(60, Math.floor((endMs - startMs) / 1000));
        const estFuelL = (distKm * 8.0) / 100;

        trips.push({
            index: trips.length + 1,
            startTime: seg[0].timestamp,
            endTime: seg[seg.length - 1].timestamp,
            durationSec,
            durationText: formatDurationSec(durationSec),
            distanceKm: parseFloat(distKm.toFixed(2)),
            maxSpeed: parseFloat(maxSpeed.toFixed(1)),
            avgSpeed: parseFloat((speedSum / seg.length).toFixed(1)),
            startLat: seg[0].lat,
            startLng: seg[0].lng,
            endLat: seg[seg.length - 1].lat,
            endLng: seg[seg.length - 1].lng,
            estFuelL: parseFloat(estFuelL.toFixed(2)),
            estFuelMad: Math.round(estFuelL * fuelPriceMad),
        });
    }

    return trips;
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const escapeCell = (val: string | number) => {
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const csvContent =
        '\uFEFF' + // UTF-8 BOM for Excel
        headers.map(escapeCell).join(',') +
        '\n' +
        rows.map(r => r.map(escapeCell).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');
    const [period, setPeriod] = useState<Period>('7d');
    const [selectedDevice, setSelectedDevice] = useState<string>('all');
    const [speedThreshold, setSpeedThreshold] = useState<number>(100);
    const [fuelPrice, setFuelPrice] = useState<number>(13.5);

    // Fleet Analytics state
    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);

    // Detailed Trips & Parkings state
    const [tripDevice, setTripDevice] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [historyPoints, setHistoryPoints] = useState<Position[]>([]);
    const [loadingTrips, setLoadingTrips] = useState<boolean>(false);

    // Alerts state
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);

    // Load saved fuel price
    useEffect(() => {
        try {
            const p = localStorage.getItem('fuel_price');
            if (p) setFuelPrice(Number(p) || 13.5);
        } catch { /* ignore */ }
    }, []);

    // Fetch Fleet Analytics
    const fetchFleetAnalytics = useCallback(async () => {
        try {
            setLoadingAnalytics(true);
            const res = await api.get(`/fuel/analytics?period=${period}&threshold=${speedThreshold}`);
            const data = res.data as AnalyticsResponse;
            setAnalytics(data);
            if (!tripDevice && data.devices && data.devices.length > 0) {
                setTripDevice(data.devices[0].device_id);
            }
        } catch (err) {
            console.error('Error loading reports analytics:', err);
        } finally {
            setLoadingAnalytics(false);
        }
    }, [period, speedThreshold, tripDevice]);

    useEffect(() => {
        fetchFleetAnalytics();
    }, [fetchFleetAnalytics]);

    // Fetch Alerts when on alerts tab or initially
    const fetchAlertsData = useCallback(async () => {
        try {
            setLoadingAlerts(true);
            const res = await api.get('/alerts');
            setAlerts(res.data || []);
        } catch (err) {
            console.error('Error loading alerts for report:', err);
        } finally {
            setLoadingAlerts(false);
        }
    }, []);

    useEffect(() => {
        fetchAlertsData();
    }, [fetchAlertsData]);

    // Fetch History for Trips & Parkings tab
    const fetchTripHistory = useCallback(async (devId?: string) => {
        const targetDevice = devId || tripDevice;
        if (!targetDevice) return;
        try {
            setLoadingTrips(true);
            const start = new Date(startDate + 'T00:00:00').toISOString();
            const end = new Date(endDate + 'T23:59:59').toISOString();
            const res = await api.get(`/devices/${targetDevice}/history`, { params: { start, end } });
            setHistoryPoints(filterGpsSpikes(res.data || []));
        } catch (err) {
            console.error('Error loading device history for report:', err);
        } finally {
            setLoadingTrips(false);
        }
    }, [tripDevice, startDate, endDate]);

    useEffect(() => {
        if (activeTab === 'trips' && tripDevice) {
            fetchTripHistory(tripDevice);
        }
    }, [activeTab, tripDevice, fetchTripHistory]);

    // Filtered devices for Overview & Speeding
    const filteredDevices = useMemo(() => {
        if (!analytics?.devices) return [];
        if (selectedDevice === 'all') return analytics.devices;
        return analytics.devices.filter(d => d.device_id === selectedDevice);
    }, [analytics, selectedDevice]);

    // Fleet KPI Totals
    const kpis = useMemo(() => {
        let totalKm = 0;
        let movingHours = 0;
        let idleHours = 0;
        let speedingKm = 0;
        let offHoursKm = 0;
        let maxSpeed = 0;
        let totalStops = 0;

        for (const d of filteredDevices) {
            totalKm += d.distanceKm || 0;
            movingHours += d.movingHours || 0;
            idleHours += d.idleHours || 0;
            speedingKm += d.speedingKm || 0;
            offHoursKm += d.offHoursKm || 0;
            totalStops += d.idleEventCount || 0;
            if ((d.maxSpeed || 0) > maxSpeed) maxSpeed = d.maxSpeed;
        }

        // Estimate total fuel: ~8L/100km driving + 1.5L/h idle
        const drivingL = (totalKm * 8.0) / 100;
        const idleL = idleHours * 1.5;
        const totalFuelL = drivingL + idleL;
        const totalFuelMad = Math.round(totalFuelL * fuelPrice);

        return {
            totalKm: parseFloat(totalKm.toFixed(1)),
            movingHours,
            idleHours,
            speedingKm: parseFloat(speedingKm.toFixed(1)),
            offHoursKm: parseFloat(offHoursKm.toFixed(1)),
            maxSpeed: parseFloat(maxSpeed.toFixed(1)),
            totalStops,
            totalFuelL: parseFloat(totalFuelL.toFixed(1)),
            totalFuelMad,
        };
    }, [filteredDevices, fuelPrice]);

    // Daily chart data
    const dailyChartData = useMemo(() => {
        if (!analytics) return [];
        if (selectedDevice === 'all' && analytics.fleet?.daily) {
            return analytics.fleet.daily.map(d => ({
                date: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
                km: parseFloat((d.km || 0).toFixed(1)),
                idleHours: parseFloat((d.idleHours || 0).toFixed(2)),
                speedingKm: parseFloat((d.speedingKm || 0).toFixed(1)),
            }));
        }
        const dev = analytics.devices.find(d => d.device_id === selectedDevice);
        if (!dev?.daily) return [];
        return dev.daily.map(d => ({
            date: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
            km: parseFloat((d.km || 0).toFixed(1)),
            idleHours: parseFloat((d.idleHours || 0).toFixed(2)),
            speedingKm: parseFloat((d.speedingKm || 0).toFixed(1)),
        }));
    }, [analytics, selectedDevice]);

    // Computed Parkings & Trips for the selected vehicle in `trips` tab
    const detectedParkings = useMemo(() => detectParkingsFromHistory(historyPoints), [historyPoints]);
    const detectedTrips = useMemo(
        () => detectTripsFromHistory(historyPoints, detectedParkings, fuelPrice),
        [historyPoints, detectedParkings, fuelPrice]
    );

    // Filtered Alerts
    const filteredAlerts = useMemo(() => {
        if (selectedDevice === 'all') return alerts;
        return alerts.filter(a => a.device_id === selectedDevice);
    }, [alerts, selectedDevice]);

    // Export current report to CSV
    const handleExportCSV = () => {
        const dateTag = new Date().toISOString().slice(0, 10);
        if (activeTab === 'overview') {
            downloadCSV(
                `rapport_flotte_${period}_${dateTag}.csv`,
                [
                    'Véhicule',
                    'IMEI / ID',
                    'Distance (km)',
                    'Temps Conduite',
                    'Temps Ralenti / Arrêt',
                    'Nb Arrêts',
                    'Vitesse Moy (km/h)',
                    'Vitesse Max (km/h)',
                    'Carburant Estimé (L)',
                    'Coût Carburant Estimé (MAD)',
                ],
                filteredDevices.map(d => {
                    const fuelL = (d.distanceKm * 8.0) / 100 + d.idleHours * 1.5;
                    return [
                        d.name || d.device_id,
                        d.device_id,
                        d.distanceKm.toFixed(1),
                        formatHours(d.movingHours),
                        formatHours(d.idleHours),
                        d.idleEventCount,
                        d.avgSpeed.toFixed(1),
                        d.maxSpeed.toFixed(1),
                        fuelL.toFixed(1),
                        Math.round(fuelL * fuelPrice),
                    ];
                })
            );
        } else if (activeTab === 'trips') {
            const devName = analytics?.devices.find(d => d.device_id === tripDevice)?.name || tripDevice;
            const rows: (string | number)[][] = [];
            for (const t of detectedTrips) {
                rows.push([
                    'TRAJET #' + t.index,
                    new Date(t.startTime).toLocaleString(),
                    new Date(t.endTime).toLocaleString(),
                    t.durationText,
                    t.distanceKm,
                    t.avgSpeed,
                    t.maxSpeed,
                    `${t.estFuelMad} MAD`,
                    `${t.endLat.toFixed(5)}, ${t.endLng.toFixed(5)}`,
                ]);
            }
            for (const p of detectedParkings) {
                rows.push([
                    'PARKING P' + p.index,
                    new Date(p.startTime).toLocaleString(),
                    new Date(p.endTime).toLocaleString(),
                    p.durationText,
                    0,
                    0,
                    0,
                    '0 MAD',
                    `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
                ]);
            }
            downloadCSV(
                `rapport_trajets_parkings_${devName}_${startDate}_${endDate}.csv`,
                ['Type', 'Début', 'Fin', 'Durée', 'Distance (km)', 'Vit. Moy (km/h)', 'Vit. Max (km/h)', 'Coût Estimé', 'Coordonnées'],
                rows
            );
        } else if (activeTab === 'speeding') {
            downloadCSV(
                `rapport_securite_vitesse_${period}_${dateTag}.csv`,
                ['Véhicule', 'Distance Totale (km)', 'Km en Survitesse', 'Vitesse Max (km/h)', 'Km Hors Horaires (Nuit)', 'Plus Long Ralenti (min)'],
                filteredDevices.map(d => [
                    d.name || d.device_id,
                    d.distanceKm.toFixed(1),
                    d.speedingKm.toFixed(1),
                    d.maxSpeed.toFixed(1),
                    d.offHoursKm.toFixed(1),
                    d.longestIdleMin,
                ])
            );
        } else if (activeTab === 'alerts') {
            downloadCSV(
                `rapport_alertes_${dateTag}.csv`,
                ['Date / Heure', 'Véhicule', 'Type', 'Sévérité', 'Message', 'Vitesse (km/h)', 'Statut', 'Latitude', 'Longitude'],
                filteredAlerts.map(a => [
                    new Date(a.timestamp).toLocaleString(),
                    a.vehicle_name || a.device_id,
                    a.type,
                    a.severity,
                    a.message,
                    a.speed || 0,
                    a.status,
                    a.lat,
                    a.lng,
                ])
            );
        }
    };

    const periodLabels: Record<Period, string> = {
        today: "Aujourd'hui",
        '7d': '7 derniers jours',
        '30d': '30 derniers jours',
        month: 'Ce mois',
    };

    return (
        <div className="h-full bg-gray-950 text-white overflow-y-auto print:bg-white print:text-black">
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

                {/* ── Header & Actions ── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800 pb-5">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                <BarChart2 size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                                    Rapports & Analyses de Flotte
                                </h1>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Kilométrage, trajets, parkings avec durée, coûts carburant (MAD) et sécurité
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        {/* Period selector (for Overview / Speeding) */}
                        {activeTab !== 'trips' && (
                            <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
                                {(['today', '7d', '30d', 'month'] as Period[]).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            period === p
                                                ? 'bg-blue-600 text-white shadow'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {periodLabels[p]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Vehicle Filter */}
                        {activeTab !== 'trips' && (
                            <select
                                value={selectedDevice}
                                onChange={e => setSelectedDevice(e.target.value)}
                                className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="all">Tous les véhicules ({analytics?.devices?.length || 0})</option>
                                {analytics?.devices?.map(d => (
                                    <option key={d.device_id} value={d.device_id}>
                                        {d.name || d.device_id}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={() => {
                                fetchFleetAnalytics();
                                if (activeTab === 'trips') fetchTripHistory();
                                if (activeTab === 'alerts') fetchAlertsData();
                            }}
                            className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors"
                            title="Actualiser"
                        >
                            <RefreshCw size={15} className={loadingAnalytics || loadingTrips ? 'animate-spin text-blue-400' : ''} />
                        </button>

                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-950/50"
                        >
                            <Download size={14} />
                            <span>Exporter Excel (CSV)</span>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-semibold transition-colors"
                        >
                            <Printer size={14} />
                            <span className="hidden sm:inline">Imprimer / PDF</span>
                        </button>
                    </div>
                </div>

                {/* ── Report Type Navigation Tabs ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 print:hidden">
                    {[
                        {
                            id: 'overview' as ReportTab,
                            label: 'Synthèse Flotte & Km',
                            sub: 'Distance, heures & carburant',
                            icon: Route,
                            color: 'text-blue-400',
                        },
                        {
                            id: 'trips' as ReportTab,
                            label: 'Trajets & Parkings',
                            sub: 'Tous les arrêts avec durée',
                            icon: MapPin,
                            color: 'text-amber-400',
                        },
                        {
                            id: 'speeding' as ReportTab,
                            label: 'Vitesse & Conduite',
                            sub: 'Survitesse & conduite de nuit',
                            icon: Gauge,
                            color: 'text-purple-400',
                        },
                        {
                            id: 'alerts' as ReportTab,
                            label: 'Journal des Alertes',
                            sub: `${filteredAlerts.length} alerte(s) enregistrée(s)`,
                            icon: ShieldAlert,
                            color: 'text-red-400',
                        },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                                    active
                                        ? 'bg-blue-600/15 border-blue-500/60 shadow-lg shadow-blue-950/30'
                                        : 'bg-gray-900/70 border-gray-800 hover:bg-gray-900 hover:border-gray-700'
                                }`}
                            >
                                <div className={`p-2 rounded-xl bg-gray-800/80 ${tab.color} shrink-0`}>
                                    <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs md:text-sm font-bold text-white truncate">{tab.label}</div>
                                    <div className="text-[11px] text-gray-400 truncate mt-0.5">{tab.sub}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ══════════════════════════════════════════════════════════════════════════
                    TAB 1: SYNTHÈSE FLOTTE & KILOMÉTRAGE
                   ══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                                    <span>Distance Totale</span>
                                    <Route size={15} className="text-blue-400" />
                                </div>
                                <div className="text-xl font-extrabold text-white">{kpis.totalKm.toLocaleString()} km</div>
                                <div className="text-[11px] text-gray-500 mt-1">{filteredDevices.length} véhicule(s)</div>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                                    <span>Temps Conduite</span>
                                    <Navigation size={15} className="text-emerald-400" />
                                </div>
                                <div className="text-xl font-extrabold text-emerald-400">{formatHours(kpis.movingHours)}</div>
                                <div className="text-[11px] text-gray-500 mt-1">Moteur en marche</div>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                                    <span>Parkings / Ralenti</span>
                                    <Clock size={15} className="text-amber-400" />
                                </div>
                                <div className="text-xl font-extrabold text-amber-400">{formatHours(kpis.idleHours)}</div>
                                <div className="text-[11px] text-gray-500 mt-1">{kpis.totalStops} arrêt(s) détectés</div>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                                    <span>Coût Carburant Est.</span>
                                    <Fuel size={15} className="text-orange-400" />
                                </div>
                                <div className="text-xl font-extrabold text-orange-400">{kpis.totalFuelMad.toLocaleString()} MAD</div>
                                <div className="text-[11px] text-gray-500 mt-1">≈ {kpis.totalFuelL} L ({fuelPrice} MAD/L)</div>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                                    <span>Vitesse Max</span>
                                    <Gauge size={15} className="text-purple-400" />
                                </div>
                                <div className="text-xl font-extrabold text-purple-400">{kpis.maxSpeed} km/h</div>
                                <div className="text-[11px] text-gray-500 mt-1">{kpis.speedingKm} km en survitesse</div>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                                    <span>Conduite de Nuit</span>
                                    <AlertTriangle size={15} className="text-pink-400" />
                                </div>
                                <div className="text-xl font-extrabold text-pink-400">{kpis.offHoursKm} km</div>
                                <div className="text-[11px] text-gray-500 mt-1">Hors horaires (22h–06h)</div>
                            </div>
                        </div>

                        {/* Daily Activity Chart */}
                        {dailyChartData.length > 0 && (
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-white">Évolution Journalière (Kilométrage & Heures d&apos;Arrêt)</h3>
                                        <p className="text-xs text-gray-400">Comparaison quotidienne de la distance parcourue et des heures de stationnement/ralenti</p>
                                    </div>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={dailyChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                                            <YAxis yAxisId="left" stroke="#60a5fa" fontSize={11} unit=" km" />
                                            <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={11} unit=" h" />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: 12, fontSize: 12 }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                            <Bar yAxisId="left" dataKey="km" name="Distance (km)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                            <Line yAxisId="right" type="monotone" dataKey="idleHours" name="Arrêts / Ralenti (h)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Detailed Fleet Table */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white">
                                    Récapitulatif par Véhicule ({filteredDevices.length})
                                </h3>
                                <span className="text-xs text-gray-400">
                                    Période : <strong className="text-white">{periodLabels[period]}</strong>
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-950/80 text-gray-400 uppercase border-b border-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Véhicule</th>
                                            <th className="px-4 py-3 text-right">Distance</th>
                                            <th className="px-4 py-3 text-right">Temps Conduite</th>
                                            <th className="px-4 py-3 text-right">Arrêts / Ralenti</th>
                                            <th className="px-4 py-3 text-right">Vit. Moy / Max</th>
                                            <th className="px-4 py-3 text-right">Carburant Est.</th>
                                            <th className="px-4 py-3 text-right">Coût MAD</th>
                                            <th className="px-4 py-3 text-center print:hidden">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {loadingAnalytics ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                                    Chargement des données de la flotte…
                                                </td>
                                            </tr>
                                        ) : filteredDevices.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                                    Aucun véhicule trouvé.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDevices.map(d => {
                                                const estL = (d.distanceKm * 8.0) / 100 + d.idleHours * 1.5;
                                                const estMad = Math.round(estL * fuelPrice);
                                                return (
                                                    <tr key={d.device_id} className="hover:bg-gray-800/40 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                                                            <Car size={15} className="text-blue-400 shrink-0" />
                                                            <span>{d.name || d.device_id}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono font-bold text-white">
                                                            {d.distanceKm.toFixed(1)} km
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                                                            {formatHours(d.movingHours)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-amber-400 font-medium">
                                                            {formatHours(d.idleHours)} <span className="text-gray-500 text-[10px]">({d.idleEventCount})</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono">
                                                            <span className="text-gray-300">{d.avgSpeed.toFixed(0)}</span>
                                                            <span className="text-gray-600 mx-1">/</span>
                                                            <span className="text-purple-400 font-bold">{d.maxSpeed.toFixed(0)} km/h</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-gray-300">
                                                            {estL.toFixed(1)} L
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono font-bold text-orange-400">
                                                            {estMad.toLocaleString()} MAD
                                                        </td>
                                                        <td className="px-4 py-3 text-center print:hidden">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        setTripDevice(d.device_id);
                                                                        setActiveTab('trips');
                                                                    }}
                                                                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-colors"
                                                                >
                                                                    🅿️ Parkings
                                                                </button>
                                                                <Link
                                                                    href={`/dashboard/history?device=${d.device_id}`}
                                                                    className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[11px] font-semibold transition-colors"
                                                                >
                                                                    Carte
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════════════
                    TAB 2: RAPPORT DÉTAILLÉ DES TRAJETS & PARKINGS
                   ══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'trips' && (
                    <div className="space-y-6">
                        {/* Filter Bar for Trips & Parkings */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-wrap items-end gap-3 print:hidden">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs text-gray-400 mb-1 block font-medium">Véhicule</label>
                                <select
                                    value={tripDevice}
                                    onChange={e => setTripDevice(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                >
                                    {analytics?.devices?.map(d => (
                                        <option key={d.device_id} value={d.device_id}>
                                            {d.name || d.device_id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 mb-1 block font-medium">Date Début</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 mb-1 block font-medium">Date Fin</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <button
                                onClick={() => fetchTripHistory()}
                                disabled={loadingTrips || !tripDevice}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                            >
                                {loadingTrips ? 'Analyse en cours…' : 'Générer le rapport'}
                            </button>

                            {tripDevice && (
                                <Link
                                    href={`/dashboard/history?device=${tripDevice}`}
                                    className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                >
                                    <MapPin size={14} />
                                    <span>Voir sur la carte History</span>
                                </Link>
                            )}
                        </div>

                        {/* Summary Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <span className="text-xs text-gray-400 block">Trajets effectués</span>
                                <span className="text-xl font-extrabold text-blue-400 mt-1 block">{detectedTrips.length} trajet(s)</span>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <span className="text-xs text-gray-400 block">Distance cumulée</span>
                                <span className="text-xl font-extrabold text-white mt-1 block">
                                    {detectedTrips.reduce((s, t) => s + t.distanceKm, 0).toFixed(1)} km
                                </span>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <span className="text-xs text-gray-400 block">Parkings détectés (≥ 2 min)</span>
                                <span className="text-xl font-extrabold text-amber-400 mt-1 block">{detectedParkings.length} parking(s)</span>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <span className="text-xs text-gray-400 block">Durée totale en parking</span>
                                <span className="text-xl font-extrabold text-amber-300 mt-1 block">
                                    {formatDurationSec(detectedParkings.reduce((s, p) => s + p.durationSec, 0))}
                                </span>
                            </div>
                        </div>

                        {/* Parkings Table */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-amber-500 text-gray-950 font-black text-xs flex items-center justify-center">
                                        P
                                    </span>
                                    <h3 className="text-sm font-bold text-white">
                                        Liste de tous les Parkings / Arrêts ({detectedParkings.length})
                                    </h3>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-950/80 text-gray-400 uppercase border-b border-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left">#</th>
                                            <th className="px-4 py-3 text-left">Arrivée (Début)</th>
                                            <th className="px-4 py-3 text-left">Départ (Fin)</th>
                                            <th className="px-4 py-3 text-left">Durée de stationnement</th>
                                            <th className="px-4 py-3 text-left">Coordonnées GPS</th>
                                            <th className="px-4 py-3 text-right print:hidden">Localisation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {loadingTrips ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                    Chargement des stationnements…
                                                </td>
                                            </tr>
                                        ) : detectedParkings.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                    Aucun parking (≥ 2 min) sur cette période.
                                                </td>
                                            </tr>
                                        ) : (
                                            detectedParkings.map(p => (
                                                <tr key={p.index} className="hover:bg-gray-800/40">
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded bg-amber-500 text-gray-950 font-extrabold text-[11px]">
                                                            P{p.index}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-200 font-medium">
                                                        {new Date(p.startTime).toLocaleString([], {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-200 font-medium">
                                                        {new Date(p.endTime).toLocaleString([], {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                                            {p.durationText}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-gray-400">
                                                        {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right print:hidden">
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
                                                        >
                                                            <span>Google Maps</span>
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Trips Table */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Route size={16} className="text-blue-400" />
                                    <h3 className="text-sm font-bold text-white">
                                        Détail des Trajets ({detectedTrips.length})
                                    </h3>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-950/80 text-gray-400 uppercase border-b border-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Trajet</th>
                                            <th className="px-4 py-3 text-left">Départ</th>
                                            <th className="px-4 py-3 text-left">Arrivée</th>
                                            <th className="px-4 py-3 text-right">Durée</th>
                                            <th className="px-4 py-3 text-right">Distance</th>
                                            <th className="px-4 py-3 text-right">Vit. Moy / Max</th>
                                            <th className="px-4 py-3 text-right">Carburant Est.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {detectedTrips.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                    Aucun trajet significatif détecté sur cette période.
                                                </td>
                                            </tr>
                                        ) : (
                                            detectedTrips.map(t => (
                                                <tr key={t.index} className="hover:bg-gray-800/40">
                                                    <td className="px-4 py-3 font-bold text-blue-400">#{t.index}</td>
                                                    <td className="px-4 py-3 text-gray-200">
                                                        {new Date(t.startTime).toLocaleString([], {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-200">
                                                        {new Date(t.endTime).toLocaleString([], {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                                                        {t.durationText}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                                                        {t.distanceKm} km
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono">
                                                        {t.avgSpeed} / <span className="text-purple-400 font-bold">{t.maxSpeed} km/h</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-orange-400 font-bold">
                                                        {t.estFuelMad} MAD <span className="text-gray-500 font-normal">({t.estFuelL} L)</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════════════
                    TAB 3: VITESSE & SÉCURITÉ DE CONDUITE
                   ══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'speeding' && (
                    <div className="space-y-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-bold text-white">Rapport d&apos;Excès de Vitesse & Conduite Hors Horaires</h3>
                                <p className="text-xs text-gray-400">Analyse des dépassements du seuil de vitesse autorisé et des trajets de nuit (22h00 – 06h00)</p>
                            </div>
                            <div className="flex items-center gap-2 print:hidden">
                                <label className="text-xs text-gray-400">Seuil survitesse :</label>
                                <select
                                    value={speedThreshold}
                                    onChange={e => setSpeedThreshold(Number(e.target.value))}
                                    className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                                >
                                    <option value={80}>80 km/h</option>
                                    <option value={90}>90 km/h</option>
                                    <option value={100}>100 km/h</option>
                                    <option value={110}>110 km/h</option>
                                    <option value={120}>120 km/h</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-950/80 text-gray-400 uppercase border-b border-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Véhicule</th>
                                        <th className="px-4 py-3 text-right">Distance Totale</th>
                                        <th className="px-4 py-3 text-right">Km en Survitesse (&gt;{speedThreshold} km/h)</th>
                                        <th className="px-4 py-3 text-right">Vitesse Max Atteinte</th>
                                        <th className="px-4 py-3 text-right">Conduite de Nuit (22h-06h)</th>
                                        <th className="px-4 py-3 text-center">Évaluation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/60">
                                    {filteredDevices.map(d => {
                                        const speedRatio = d.distanceKm > 0 ? (d.speedingKm / d.distanceKm) * 100 : 0;
                                        const isSafe = d.maxSpeed <= speedThreshold && speedRatio < 2;
                                        return (
                                            <tr key={d.device_id} className="hover:bg-gray-800/40">
                                                <td className="px-4 py-3 font-bold text-white">{d.name || d.device_id}</td>
                                                <td className="px-4 py-3 text-right font-mono">{d.distanceKm.toFixed(1)} km</td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-red-400">
                                                    {d.speedingKm.toFixed(1)} km ({speedRatio.toFixed(1)}%)
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-purple-400">
                                                    {d.maxSpeed.toFixed(1)} km/h
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-pink-400">
                                                    {d.offHoursKm.toFixed(1)} km
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {isSafe ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px]">
                                                            <CheckCircle2 size={12} /> Conforme
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-[11px]">
                                                            <AlertTriangle size={12} /> Survitesse
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════════════
                    TAB 4: JOURNAL DES ALERTES
                   ══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'alerts' && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">
                                Historique des Alertes ({filteredAlerts.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-950/80 text-gray-400 uppercase border-b border-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Date & Heure</th>
                                        <th className="px-4 py-3 text-left">Véhicule</th>
                                        <th className="px-4 py-3 text-left">Type / Message</th>
                                        <th className="px-4 py-3 text-center">Sévérité</th>
                                        <th className="px-4 py-3 text-right">Vitesse</th>
                                        <th className="px-4 py-3 text-right print:hidden">Position</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/60">
                                    {loadingAlerts ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                Chargement des alertes…
                                            </td>
                                        </tr>
                                    ) : filteredAlerts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                Aucune alerte enregistrée.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAlerts.slice(0, 200).map(a => (
                                            <tr key={a.id} className="hover:bg-gray-800/40">
                                                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                                                    {new Date(a.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-white">
                                                    {a.vehicle_name || a.device_id}
                                                </td>
                                                <td className="px-4 py-3 text-gray-200">{a.message || a.type}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                                                        {a.severity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-blue-400 font-bold">
                                                    {a.speed ? `${a.speed.toFixed(1)} km/h` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right print:hidden">
                                                    {a.lat && a.lng ? (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                                        >
                                                            <span>Maps</span>
                                                            <ExternalLink size={11} />
                                                        </a>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
