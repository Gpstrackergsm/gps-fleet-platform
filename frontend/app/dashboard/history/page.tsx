"use client"

import { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import {
    Play, Pause, SkipBack, Download, ChevronDown, ChevronUp,
    Car, X, SlidersHorizontal, ExternalLink, MapPin, FastForward, Clock
} from 'lucide-react';
import type { ParkingStop } from '@/components/HistoryMap';

// ── Types ────────────────────────────────────────────────────────────────────
interface Position {
    id: number;
    lat: number;
    lng: number;
    speed: number;
    course: number;
    timestamp: string;
}
interface Device { device_id: string; name: string; }
interface TripStats {
    distance: number;
    duration: string;
    maxSpeed: number;
    avgSpeed: number;
    points: number;
}

// ── Haversine distance ────────────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
        } else {
            // Lookahead check: is the next point back near prev?
            if (i + 1 < positions.length) {
                const next = positions[i + 1];
                const dtNext = Math.max(0.5, (new Date(next.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000);
                const distNextKm = haversine(prev.lat, prev.lng, next.lat, next.lng);
                const speedNextMs = (distNextKm * 1000) / dtNext;
                if (speedNextMs <= maxSpeedMs) {
                    continue; // Discard curr (it's an abnormal jump spike!)
                }
            }
            filtered.push(curr);
        }
    }
    return filtered;
}

// ── Check if a point is stationary (speed <= 3 km/h and distance to next <= 25m) ──
function isPointStationary(positions: Position[], idx: number): boolean {
    if (!positions || idx < 0 || idx >= positions.length) return true;
    const curr = positions[idx];
    if (curr.speed > 3.5) return false;
    if (idx + 1 < positions.length) {
        const next = positions[idx + 1];
        const distKm = haversine(curr.lat, curr.lng, next.lat, next.lng);
        if (distKm > 0.025 || next.speed > 3.5) return false;
    }
    return true;
}

// ── Find next moving index (skip parking/idle points) ──────────────────────────
function findNextMovingIndex(positions: Position[], fromIdx: number): number {
    let idx = fromIdx;
    while (idx < positions.length - 1) {
        if (!isPointStationary(positions, idx)) {
            return idx;
        }
        idx++;
    }
    return Math.min(idx, positions.length - 1);
}

// ── Stats calculation ─────────────────────────────────────────────────────────
function calcStats(positions: Position[]): TripStats | null {
    if (positions.length < 2) return null;
    let dist = 0;
    let maxS = 0;
    let speedSum = 0;

    for (let i = 1; i < positions.length; i++) {
        dist += haversine(positions[i - 1].lat, positions[i - 1].lng, positions[i].lat, positions[i].lng);
        if (positions[i].speed > maxS) maxS = positions[i].speed;
        speedSum += positions[i].speed;
    }

    const t0 = new Date(positions[0].timestamp).getTime();
    const t1 = new Date(positions[positions.length - 1].timestamp).getTime();
    const diffSec = Math.max(0, Math.floor((t1 - t0) / 1000));
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    const duration = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;

    return {
        distance: parseFloat(dist.toFixed(2)),
        duration,
        maxSpeed: parseFloat(maxS.toFixed(1)),
        avgSpeed: parseFloat((speedSum / positions.length).toFixed(1)),
        points: positions.length,
    };
}

// ── Detect Parkings / Stops (≥ 2 minutes) ────────────────────────────────────
function formatStopDuration(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
}

function detectParkings(positions: Position[], minDurationSec = 120): ParkingStop[] {
    if (!positions || positions.length < 2) return [];

    const rawStops: {
        lat: number;
        lng: number;
        startMs: number;
        endMs: number;
        positionIndex: number;
    }[] = [];

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
                const distDepKm = haversine(positions[j].lat, positions[j].lng, dep.lat, dep.lng);
                if (distDepKm <= 0.16) {
                    endMs = new Date(dep.timestamp).getTime();
                }
            }

            const durationSec = Math.floor((endMs - anchorMs) / 1000);
            if (durationSec >= minDurationSec) {
                rawStops.push({
                    lat: sumLat / count,
                    lng: sumLng / count,
                    startMs: anchorMs,
                    endMs,
                    positionIndex: i,
                });
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
                        positionIndex: i,
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
            durationText: formatStopDuration(durationSec),
            positionIndex: st.positionIndex,
        };
    });
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(history: Position[], vehicleName: string) {
    const header = 'Timestamp,Speed_kmh,Latitude,Longitude,Course\n';
    const rows = history.map(p =>
        `${new Date(p.timestamp).toISOString()},${p.speed.toFixed(1)},${p.lat.toFixed(6)},${p.lng.toFixed(6)},${p.course}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vehicleName}_history.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Lazy-loaded map (SSR safe) ────────────────────────────────────────────────
const HistoryMap = dynamic(() => import('@/components/HistoryMap'), {
    ssr: false,
    loading: () => <div className="flex-1 bg-gray-900 flex items-center justify-center text-gray-500">Loading map…</div>
});

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [selectedRange, setSelectedRange] = useState<string>('today'); // '6h' | '12h' | '18h' | '24h' | 'today' | 'yesterday' | 'custom'
    const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [history, setHistory] = useState<Position[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<TripStats | null>(null);

    // Playback state
    const [playing, setPlaying] = useState(false);
    const [playIndex, setPlayIndex] = useState(0);
    const [playSpeed, setPlaySpeed] = useState(5);
    const [ignoreStopping, setIgnoreStopping] = useState(true); // Default: skip stopped points!

    const [showTable, setShowTable] = useState(false);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [focusedParking, setFocusedParking] = useState<ParkingStop | null>(null);

    const playRef = useRef(false);
    const indexRef = useRef(0);
    const ignoreStoppingRef = useRef(true);

    const parkings = useMemo(() => detectParkings(history), [history]);
    const totalParkingSec = useMemo(() => parkings.reduce((acc, p) => acc + p.durationSec, 0), [parkings]);

    // Keep refs synchronized
    useEffect(() => {
        playRef.current = playing;
    }, [playing]);

    useEffect(() => {
        ignoreStoppingRef.current = ignoreStopping;
    }, [ignoreStopping]);

    // Reusable fetch for any range
    const fetchHistoryForRange = async (
        devId: string,
        rangeType: string,
        customStart?: string,
        customEnd?: string
    ) => {
        if (!devId) return;
        setLoading(true);
        setPlaying(false);
        setPlayIndex(0);
        setFocusedParking(null);
        setMobileFiltersOpen(false);

        try {
            let startIso = '';
            let endIso = '';
            const now = new Date();

            if (rangeType === '6h') {
                startIso = new Date(now.getTime() - 6 * 3600 * 1000).toISOString();
                endIso = now.toISOString();
            } else if (rangeType === '12h') {
                startIso = new Date(now.getTime() - 12 * 3600 * 1000).toISOString();
                endIso = now.toISOString();
            } else if (rangeType === '18h') {
                startIso = new Date(now.getTime() - 18 * 3600 * 1000).toISOString();
                endIso = now.toISOString();
            } else if (rangeType === '24h') {
                startIso = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
                endIso = now.toISOString();
            } else if (rangeType === 'today') {
                const s = new Date(now);
                s.setHours(0, 0, 0, 0);
                startIso = s.toISOString();
                const e = new Date(now);
                e.setHours(23, 59, 59, 999);
                endIso = e.toISOString();
            } else if (rangeType === 'yesterday') {
                const s = new Date(now.getTime() - 24 * 3600 * 1000);
                s.setHours(0, 0, 0, 0);
                startIso = s.toISOString();
                const e = new Date(now.getTime() - 24 * 3600 * 1000);
                e.setHours(23, 59, 59, 999);
                endIso = e.toISOString();
            } else {
                // Custom date range
                startIso = new Date((customStart || startDate) + 'T00:00:00').toISOString();
                endIso = new Date((customEnd || endDate) + 'T23:59:59').toISOString();
            }

            const res = await api.get(`/devices/${devId}/history`, {
                params: { start: startIso, end: endIso }
            });
            const cleaned = filterGpsSpikes(res.data);
            setHistory(cleaned);
            setStats(calcStats(cleaned));

            // If ignoreStopping is active, automatically position playIndex at the first moving point
            if (cleaned.length > 0) {
                const firstMoving = findNextMovingIndex(cleaned, 0);
                setPlayIndex(firstMoving);
                indexRef.current = firstMoving;
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Quick range switch handler
    const applyQuickRange = (range: '6h' | '12h' | '18h' | '24h' | 'today' | 'yesterday') => {
        setSelectedRange(range);
        const now = new Date();
        if (range === '6h' || range === '12h' || range === '18h' || range === '24h') {
            setStartDate(now.toISOString().slice(0, 10));
            setEndDate(now.toISOString().slice(0, 10));
        } else if (range === 'yesterday') {
            const yest = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);
            setStartDate(yest);
            setEndDate(yest);
        } else {
            setStartDate(now.toISOString().slice(0, 10));
            setEndDate(now.toISOString().slice(0, 10));
        }

        if (selectedDevice) {
            fetchHistoryForRange(selectedDevice, range);
        }
    };

    useEffect(() => {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const preselectedDevice = params?.get('device') || '';

        api.get('/devices').then(r => {
            setDevices(r.data);
            if (preselectedDevice) {
                setSelectedDevice(preselectedDevice);
                fetchHistoryForRange(preselectedDevice, selectedRange);
            }
        }).catch(console.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchHistory = () => {
        if (!selectedDevice) return;
        fetchHistoryForRange(selectedDevice, selectedRange, startDate, endDate);
    };

    // Smart Toggle Play (starts immediately at moving point if stopped)
    const togglePlay = () => {
        if (!playing) {
            if (history.length === 0) return;
            let startIndex = playIndex >= history.length - 1 ? 0 : playIndex;

            // If ignoreStopping is ON and we are parked/stopped, immediately jump to moving point!
            if (ignoreStopping && isPointStationary(history, startIndex)) {
                const firstMoving = findNextMovingIndex(history, startIndex);
                if (firstMoving < history.length) {
                    startIndex = firstMoving;
                    setPlayIndex(startIndex);
                    indexRef.current = startIndex;
                }
            } else {
                setPlayIndex(startIndex);
                indexRef.current = startIndex;
            }

            setPlaying(true);
        } else {
            setPlaying(false);
        }
    };

    // Playback engine with intelligent stop-skipping
    useEffect(() => {
        if (!playing || history.length === 0) return;

        const interval = setInterval(() => {
            if (!playRef.current) return;

            setPlayIndex(prev => {
                let next = prev + 1;
                if (next >= history.length) {
                    setPlaying(false);
                    return prev;
                }

                // If ignoreStopping is active and next point is stationary, skip straight past the stop!
                if (ignoreStoppingRef.current && isPointStationary(history, next)) {
                    const nextMoving = findNextMovingIndex(history, next);
                    if (nextMoving > next && nextMoving < history.length) {
                        next = nextMoving;
                    } else if (nextMoving >= history.length - 1) {
                        setPlaying(false);
                        return history.length - 1;
                    }
                }

                indexRef.current = next;
                return next;
            });
        }, Math.max(50, 2000 / playSpeed));

        return () => clearInterval(interval);
    }, [playing, playSpeed, history]);

    const vehicleName = devices.find(d => d.device_id === selectedDevice)?.name || selectedDevice;

    // Filter controls JSX reusable for Desktop & Mobile drawer
    const renderFilterControls = (isMobile = false) => (
        <div className="flex flex-col h-full bg-gray-900 overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-white text-base">Trip History</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Replay and analyze routes</p>
                </div>
                {isMobile && (
                    <button onClick={() => setMobileFiltersOpen(false)} className="text-gray-400 hover:text-white p-1">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="p-4 space-y-3.5 border-b border-gray-800">
                {/* Vehicle Selector */}
                <div>
                    <label className="text-xs text-gray-400 font-semibold mb-1 block">Vehicle</label>
                    <select
                        value={selectedDevice}
                        onChange={e => {
                            setSelectedDevice(e.target.value);
                            if (e.target.value) {
                                fetchHistoryForRange(e.target.value, selectedRange, startDate, endDate);
                            }
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Select vehicle…</option>
                        {devices.map(d => <option key={d.device_id} value={d.device_id}>{d.name || d.device_id}</option>)}
                    </select>
                </div>

                {/* Quick Time Range Presets (6h, 12h, 18h, 24h, Today, Yesterday) */}
                <div>
                    <label className="text-xs text-gray-400 font-semibold mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-blue-400" />
                            <span>Quick Range</span>
                        </span>
                        <span className="text-[10px] text-gray-500">Instant replay</span>
                    </label>

                    {/* Top Row: 6h, 12h, 18h */}
                    <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                        <button
                            type="button"
                            onClick={() => applyQuickRange('6h')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                selectedRange === '6h'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/60'
                            }`}
                        >
                            <span>Last 6h</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => applyQuickRange('12h')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                selectedRange === '12h'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/60'
                            }`}
                        >
                            <span>Last 12h</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => applyQuickRange('18h')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                selectedRange === '18h'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/60'
                            }`}
                        >
                            <span>Last 18h</span>
                        </button>
                    </div>

                    {/* Bottom Row: 24h, Today, Yesterday */}
                    <div className="grid grid-cols-3 gap-1.5">
                        <button
                            type="button"
                            onClick={() => applyQuickRange('24h')}
                            className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                selectedRange === '24h'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-400 border border-gray-700/50'
                            }`}
                        >
                            Last 24h
                        </button>
                        <button
                            type="button"
                            onClick={() => applyQuickRange('today')}
                            className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                selectedRange === 'today'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-400 border border-gray-700/50'
                            }`}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => applyQuickRange('yesterday')}
                            className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                selectedRange === 'yesterday'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-400 border border-gray-700/50'
                            }`}
                        >
                            Yesterday
                        </button>
                    </div>
                </div>

                {/* Custom Date Pickers */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-800/80">
                    <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Custom Start</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => {
                                setStartDate(e.target.value);
                                setSelectedRange('custom');
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Custom End</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => {
                                setEndDate(e.target.value);
                                setSelectedRange('custom');
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <button
                    onClick={fetchHistory}
                    disabled={!selectedDevice || loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-blue-600/20"
                >
                    {loading ? 'Loading…' : 'Fetch History'}
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="p-4 border-b border-gray-800 space-y-2.5">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trip Summary</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-800 rounded-lg p-2.5">
                            <span className="text-gray-500 block">Distance</span>
                            <span className="text-white font-bold text-sm">{stats.distance} km</span>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2.5">
                            <span className="text-gray-500 block">Duration</span>
                            <span className="text-white font-bold text-sm">{stats.duration}</span>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2.5">
                            <span className="text-gray-500 block">Max Speed</span>
                            <span className="text-blue-400 font-bold text-sm">{stats.maxSpeed} km/h</span>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2.5">
                            <span className="text-gray-500 block">Parkings ({parkings.length})</span>
                            <span className="text-amber-400 font-bold text-sm">{totalParkingSec > 0 ? formatStopDuration(totalParkingSec) : '0m'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Parkings / Stops List */}
            {history.length > 0 && (
                <div className="p-4 border-b border-gray-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-amber-500 text-gray-950 font-black text-[10px] inline-flex items-center justify-center">P</span>
                            <span>Parkings / Arrêts ({parkings.length})</span>
                        </h3>
                        {totalParkingSec > 0 && (
                            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                Total: {formatStopDuration(totalParkingSec)}
                            </span>
                        )}
                    </div>

                    {parkings.length === 0 ? (
                        <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-2.5 text-center">
                            Aucun parking détecté (≥ 2 min)
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {parkings.map(p => {
                                const isFocused = focusedParking?.index === p.index;
                                const startStr = new Date(p.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const endStr = new Date(p.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <button
                                        key={p.index}
                                        onClick={() => {
                                            setPlaying(false);
                                            setPlayIndex(p.positionIndex);
                                            setFocusedParking({ ...p });
                                            if (isMobile) setMobileFiltersOpen(false);
                                        }}
                                        className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                                            isFocused
                                                ? 'bg-amber-500/15 border-amber-500/50 text-white'
                                                : 'bg-gray-800/70 hover:bg-gray-800 border-gray-700/60 text-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-6 h-6 rounded-md bg-amber-500 text-gray-950 font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                                                P{p.index}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-xs font-semibold text-white truncate">
                                                    {startStr} <span className="text-gray-500">→</span> {endStr}
                                                </div>
                                                <div className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
                                                    <MapPin size={10} className="text-amber-400 shrink-0" />
                                                    <span>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                            {p.durationText}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Desktop Playback Controls */}
            {history.length > 0 && (
                <div className="hidden md:flex flex-col p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Route Replay</h3>
                        <span className="text-[10px] font-mono text-gray-500">{history.length} pts</span>
                    </div>

                    {/* Ignore Stopping / Skip Stops Feature Toggle */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs">
                        <div className="flex items-center gap-1.5">
                            <FastForward size={14} className="text-amber-400 shrink-0" />
                            <span className="text-amber-200 font-semibold text-[11.5px]">Ignorer les arrêts (Skip stops)</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={ignoreStopping}
                                onChange={e => setIgnoreStopping(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                    </div>

                    {/* Timeline Slider */}
                    <div>
                        <input
                            type="range"
                            min={0}
                            max={history.length - 1}
                            value={playIndex}
                            onChange={e => { setPlayIndex(Number(e.target.value)); setPlaying(false); }}
                            className="w-full accent-blue-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
                            <span>{history[0] ? new Date(history[0].timestamp).toLocaleTimeString() : ''}</span>
                            <span>{history[playIndex] ? new Date(history[playIndex].timestamp).toLocaleTimeString() : ''}</span>
                        </div>
                    </div>

                    {/* Play/Pause Button */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const startIdx = ignoreStopping ? findNextMovingIndex(history, 0) : 0;
                                setPlayIndex(startIdx);
                                setPlaying(false);
                            }}
                            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
                            title="Reset to start of movement"
                        >
                            <SkipBack size={14} />
                        </button>
                        <button
                            onClick={togglePlay}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-600/30"
                        >
                            {playing ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Play Movement</>}
                        </button>
                    </div>

                    {/* Playback Speed Controls */}
                    <div>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Speed: <strong className="text-white font-mono">{playSpeed}×</strong></span>
                            <div className="flex items-center gap-1">
                                {[1, 5, 10, 20].map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setPlaySpeed(s)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                                            playSpeed === s
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {s}×
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={25}
                            value={playSpeed}
                            onChange={e => setPlaySpeed(Number(e.target.value))}
                            className="w-full accent-blue-500 h-1.5"
                        />
                    </div>

                    {/* Current Telemetry Card */}
                    {history[playIndex] && (
                        <div className="bg-gray-800/80 rounded-xl p-2.5 text-xs space-y-1 border border-gray-700/60">
                            <div className="flex justify-between text-gray-400">
                                <span>Speed</span>
                                <span className={`font-mono font-bold ${history[playIndex].speed > 3 ? 'text-blue-400' : 'text-amber-400'}`}>
                                    {history[playIndex].speed.toFixed(1)} km/h {history[playIndex].speed <= 3 ? '(Arrêté)' : ''}
                                </span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Point</span>
                                <span className="text-gray-300 font-mono">{playIndex + 1} / {history.length}</span>
                            </div>
                            <div className="pt-1.5 border-t border-gray-700/60 flex justify-end">
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${history[playIndex].lat},${history[playIndex].lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                                >
                                    <span>Google Maps</span>
                                    <ExternalLink size={11} />
                                </a>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => exportCSV(history, vehicleName)}
                        className="w-full flex items-center justify-center gap-2 py-2 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl text-xs font-semibold transition-colors"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            )}

            {history.length === 0 && !loading && selectedDevice && (
                <div className="p-4 text-center text-gray-500 text-sm">
                    <Car size={32} className="mx-auto mb-2 text-gray-700" />
                    No data for this period
                </div>
            )}
        </div>
    );

    return (
        <div className="relative flex h-full bg-gray-950 text-white overflow-hidden">
            {/* ── Desktop Left Panel (Hidden on Mobile) ── */}
            <div className="hidden md:flex w-72 bg-gray-900 border-r border-gray-800 flex-col shrink-0 overflow-y-auto">
                {renderFilterControls(false)}
            </div>

            {/* ── Mobile Slide-Over Filter Drawer ── */}
            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-[600] flex md:hidden animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileFiltersOpen(false)} />
                    <div className="relative w-80 max-w-[85vw] h-full z-10 flex flex-col shadow-2xl border-r border-gray-800 animate-in slide-in-from-left duration-200">
                        {renderFilterControls(true)}
                    </div>
                </div>
            )}

            {/* ── Right: Map Area ── */}
            <div className="flex-1 relative flex flex-col overflow-hidden h-full w-full">
                {/* Floating Mobile Filter Trigger */}
                <button
                    onClick={() => setMobileFiltersOpen(true)}
                    className="md:hidden absolute top-3 left-3 z-[400] bg-gray-900/90 border border-gray-700 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur"
                >
                    <SlidersHorizontal size={13} className="text-blue-400" />
                    <span>Filter Trip ({selectedRange})</span>
                    {parkings.length > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.2 rounded bg-amber-500 text-gray-950 font-extrabold text-[10px]">
                            {parkings.length}P
                        </span>
                    )}
                </button>

                <HistoryMap history={history} playIndex={playIndex} parkings={parkings} focusedParking={focusedParking} />

                {/* Mobile Floating Bottom Playback Bar */}
                {history.length > 0 && (
                    <div className="md:hidden absolute bottom-2 left-2 right-2 z-[400] bg-gray-900/95 border border-gray-800 backdrop-blur rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white truncate max-w-[140px]">{vehicleName}</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIgnoreStopping(v => !v)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-all ${
                                        ignoreStopping
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                            : 'bg-gray-800 text-gray-400 border-gray-700'
                                    }`}
                                >
                                    <FastForward size={10} />
                                    <span>{ignoreStopping ? 'Skip Arrêts: ON' : 'Skip: OFF'}</span>
                                </button>
                                <span className="text-blue-400 font-mono font-bold">{history[playIndex]?.speed.toFixed(1) || 0} km/h</span>
                                {history[playIndex] && (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${history[playIndex].lat},${history[playIndex].lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 p-0.5"
                                        title="Open in Google Maps"
                                    >
                                        <ExternalLink size={12} />
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={togglePlay}
                                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg"
                            >
                                {playing ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={history.length - 1}
                                value={playIndex}
                                onChange={e => { setPlayIndex(Number(e.target.value)); setPlaying(false); }}
                                className="flex-1 accent-blue-500 h-1.5"
                            />
                            <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                {history[playIndex] ? new Date(history[playIndex].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                        </div>
                    </div>
                )}

                {/* Desktop Collapsible Data Table */}
                {history.length > 0 && (
                    <div className={`hidden md:block border-t border-gray-800 bg-gray-900 transition-all ${showTable ? 'h-52' : 'h-10'} shrink-0`}>
                        <button
                            onClick={() => setShowTable(v => !v)}
                            className="w-full flex items-center justify-center gap-2 h-10 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            {showTable ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                            {showTable ? 'Hide' : 'Show'} Data Table ({history.length.toLocaleString()} points)
                        </button>
                        {showTable && (
                            <div className="overflow-auto h-40">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-gray-950 text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-3 py-2 text-left">#</th>
                                            <th className="px-3 py-2 text-left">Time</th>
                                            <th className="px-3 py-2 text-left">Speed</th>
                                            <th className="px-3 py-2 text-left">Latitude</th>
                                            <th className="px-3 py-2 text-left">Longitude</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {history.map((p, i) => (
                                            <tr key={p.id} className={`${i === playIndex ? 'bg-blue-600/20 text-white' : 'text-gray-400 hover:bg-gray-800/30'}`}>
                                                <td className="px-3 py-1.5 font-mono">{i + 1}</td>
                                                <td className="px-3 py-1.5">{new Date(p.timestamp).toLocaleTimeString()}</td>
                                                <td className="px-3 py-1.5 text-blue-400 font-mono">{p.speed.toFixed(1)}</td>
                                                <td className="px-3 py-1.5 font-mono">{p.lat.toFixed(5)}</td>
                                                <td className="px-3 py-1.5 font-mono">{p.lng.toFixed(5)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
