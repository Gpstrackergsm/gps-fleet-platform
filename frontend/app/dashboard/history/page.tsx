"use client"

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { Play, Pause, SkipBack, Download, ChevronDown, ChevronUp, Gauge, Clock, Route, TrendingUp, Flag, Car } from 'lucide-react';

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
            // Large gap (vehicle moved while offline)
            if (dt > 600) {
                filtered.push(curr);
            }
        }
    }
    return filtered;
}

function calcStats(history: Position[]): TripStats {
    if (history.length < 2) return { distance: 0, duration: '—', maxSpeed: 0, avgSpeed: 0, points: history.length };
    let dist = 0;
    for (let i = 1; i < history.length; i++) dist += haversine(history[i - 1].lat, history[i - 1].lng, history[i].lat, history[i].lng);
    const ms = new Date(history[history.length - 1].timestamp).getTime() - new Date(history[0].timestamp).getTime();
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    const speeds = history.map(p => p.speed);
    return {
        distance: dist,
        duration: h > 0 ? `${h}h ${m}m` : `${m}m`,
        maxSpeed: Math.max(...speeds),
        avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
        points: history.length,
    };
}

function exportCSV(history: Position[], vehicleName: string) {
    const header = 'Time,Speed (km/h),Latitude,Longitude,Course\n';
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
const HistoryMap = dynamic(() => import('@/components/HistoryMap'), { ssr: false, loading: () => <div className="flex-1 bg-gray-900 flex items-center justify-center text-gray-500">Loading map…</div> });

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [history, setHistory] = useState<Position[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<TripStats | null>(null);
    const [playing, setPlaying] = useState(false);
    const [playIndex, setPlayIndex] = useState(0);
    const [playSpeed, setPlaySpeed] = useState(5);
    const [showTable, setShowTable] = useState(false);
    const playRef = useRef(false);
    const indexRef = useRef(0);

    useEffect(() => {
        api.get('/devices').then(r => setDevices(r.data)).catch(console.error);
    }, []);

    const fetchHistory = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        setPlaying(false);
        setPlayIndex(0);
        try {
            const start = new Date(startDate + 'T00:00:00').toISOString();
            const end = new Date(endDate + 'T23:59:59').toISOString();
            const res = await api.get(`/devices/${selectedDevice}/history`, { params: { start, end } });
            const cleaned = filterGpsSpikes(res.data);
            setHistory(cleaned);
            setStats(calcStats(cleaned));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // Playback engine
    useEffect(() => {
        playRef.current = playing;
    }, [playing]);

    useEffect(() => {
        if (!playing || history.length === 0) return;
        const interval = setInterval(() => {
            if (!playRef.current) return;
            setPlayIndex(prev => {
                const next = prev + 1;
                if (next >= history.length) { setPlaying(false); return prev; }
                indexRef.current = next;
                return next;
            });
        }, Math.max(50, 2000 / playSpeed));
        return () => clearInterval(interval);
    }, [playing, playSpeed, history.length]);

    const vehicleName = devices.find(d => d.device_id === selectedDevice)?.name || selectedDevice;

    return (
        <div className="flex h-full bg-gray-950 text-white overflow-hidden">

            {/* ── Left Panel ── */}
            <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 overflow-y-auto">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="font-bold text-white text-base">Trip History</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Replay and analyze routes</p>
                </div>

                {/* Filters */}
                <div className="p-4 space-y-3 border-b border-gray-800">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Vehicle</label>
                        <select
                            value={selectedDevice}
                            onChange={e => setSelectedDevice(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Select vehicle…</option>
                            {devices.map(d => <option key={d.device_id} value={d.device_id}>{d.name || d.device_id}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                        </div>
                    </div>
                    <button
                        onClick={fetchHistory}
                        disabled={!selectedDevice || loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        {loading ? 'Loading…' : 'Load Trip'}
                    </button>
                </div>

                {/* Trip Stats */}
                {stats && history.length > 0 && (
                    <div className="p-4 border-b border-gray-800 space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Trip Summary</p>
                        {[
                            { icon: <Route size={14} />, label: 'Distance', value: `${stats.distance.toFixed(1)} km` },
                            { icon: <Clock size={14} />, label: 'Duration', value: stats.duration },
                            { icon: <TrendingUp size={14} />, label: 'Max Speed', value: `${stats.maxSpeed.toFixed(0)} km/h` },
                            { icon: <Gauge size={14} />, label: 'Avg Speed', value: `${stats.avgSpeed.toFixed(0)} km/h` },
                            { icon: <Flag size={14} />, label: 'Data Points', value: stats.points.toLocaleString() },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-500 text-xs">
                                    {s.icon} {s.label}
                                </div>
                                <span className="text-white text-xs font-semibold">{s.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Playback Controls */}
                {history.length > 0 && (
                    <div className="p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Playback</p>

                        {/* Progress bar */}
                        <div>
                            <input
                                type="range" min={0} max={history.length - 1} value={playIndex}
                                onChange={e => { setPlayIndex(Number(e.target.value)); setPlaying(false); }}
                                className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>{history[0] ? new Date(history[0].timestamp).toLocaleTimeString() : ''}</span>
                                <span>{history[playIndex] ? new Date(history[playIndex].timestamp).toLocaleTimeString() : ''}</span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setPlayIndex(0); setPlaying(false); }} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors">
                                <SkipBack size={14} />
                            </button>
                            <button
                                onClick={() => setPlaying(p => !p)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                            >
                                {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
                            </button>
                        </div>

                        {/* Speed */}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Playback Speed: {playSpeed}×</label>
                            <input type="range" min={1} max={20} value={playSpeed} onChange={e => setPlaySpeed(Number(e.target.value))}
                                className="w-full accent-blue-500" />
                        </div>

                        {/* Current point info */}
                        {history[playIndex] && (
                            <div className="bg-gray-800 rounded-lg p-2.5 text-xs space-y-1">
                                <div className="flex justify-between text-gray-400">
                                    <span>Speed</span>
                                    <span className="text-blue-400 font-mono">{history[playIndex].speed.toFixed(1)} km/h</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Point</span>
                                    <span className="text-gray-300">{playIndex + 1} / {history.length}</span>
                                </div>
                            </div>
                        )}

                        {/* Export */}
                        <button
                            onClick={() => exportCSV(history, vehicleName)}
                            className="w-full flex items-center justify-center gap-2 py-2 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors"
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

            {/* ── Right: Map + Table ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <HistoryMap history={history} playIndex={playIndex} />

                {/* Collapsible data table */}
                {history.length > 0 && (
                    <div className={`border-t border-gray-800 bg-gray-900 transition-all ${showTable ? 'h-52' : 'h-10'} shrink-0`}>
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
