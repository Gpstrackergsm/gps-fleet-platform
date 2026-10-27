"use client"

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { socket } from '@/lib/socket';
import api from '@/lib/api';
import {
    Search, Plus, Minus, Layers, Navigation, Wifi, WifiOff,
    Gauge, Clock, Car, Radio, Battery, Zap, ZapOff,
    Compass, Key, ShieldAlert, Sliders, AlertTriangle,
    CheckCircle2, X
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Vehicle {
    id: string;
    device_id: string;
    name: string;
    plate_number?: string;
    model?: string;
    company_name?: string;
    lat: number;
    lng: number;
    speed: number;
    course: number;
    state: 'moving' | 'parked' | 'idling' | 'offline';
    lastUpdate: Date;
    internet_status: boolean;
    gps_status: boolean;
    acc_status: boolean;
    battery_level: number;
    door_status?: boolean;
    satellites?: number;
    gsm_signal?: number;
    fuel_percent?: number;
    isTcpConnected?: boolean;
    sim_phone?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getState(speed: number, accStatus: boolean, lastUpdate: Date): 'moving' | 'parked' | 'idling' | 'offline' {
    const ageMs = Date.now() - lastUpdate.getTime();
    if (ageMs > 3 * 60 * 1000) return 'offline';
    if (!accStatus && speed <= 3) return 'parked';
    if (accStatus && speed <= 3) return 'idling';
    return 'moving';
}

function stateColor(state: string) {
    if (state === 'moving') return '#22c55e'; // Green
    if (state === 'idling') return '#f59e0b'; // Amber / Orange
    if (state === 'parked') return '#3b82f6'; // Blue
    return '#6b7280'; // Gray
}

function stateLabel(state: string) {
    if (state === 'moving') return 'MOVING';
    if (state === 'idling') return 'IDLING';
    if (state === 'parked') return 'PARKED';
    return 'OFFLINE';
}

function getCourseCompass(deg: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
    return `${deg.toFixed(0)}° (${directions[idx]})`;
}

function makeCarIcon(state: string, course: number) {
    const color = stateColor(state);
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <g transform="rotate(${course}, 18, 18)">
        <circle cx="18" cy="18" r="16" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
        <polygon points="18,5 25,27 18,22 11,27" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
      </g>
    </svg>`;
    return L.divIcon({
        html: svg,
        className: 'custom-tracker-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
    });
}

function timeSince(date: Date): string {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return `${Math.max(0, s)}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
}

// ── Map inner components ─────────────────────────────────────────────────────
function FlyTo({ target }: { target: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (target) map.flyTo(target, 16, { duration: 1.2 });
    }, [target, map]);
    return null;
}

function FitBounds({ vehicles }: { vehicles: Record<string, Vehicle> }) {
    const map = useMap();
    const fitted = useRef(false);
    useEffect(() => {
        const pts = Object.values(vehicles).filter(v => v.lat && v.lng);
        if (!fitted.current && pts.length > 0) {
            fitted.current = true;
            if (pts.length === 1) {
                map.setView([pts[0].lat, pts[0].lng], 15);
            } else {
                map.fitBounds(pts.map(v => [v.lat, v.lng] as [number, number]), { padding: [50, 50] });
            }
        }
    }, [vehicles, map]);
    return null;
}

function ZoomControls() {
    const map = useMap();
    return (
        <div className="absolute bottom-8 right-4 z-[500] flex flex-col gap-1">
            <button onClick={() => map.zoomIn()} className="w-9 h-9 bg-zinc-900 border border-zinc-700 text-white rounded-t-lg flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-lg">
                <Plus size={16} />
            </button>
            <button onClick={() => map.zoomOut()} className="w-9 h-9 bg-zinc-900 border border-zinc-700 text-white rounded-b-lg flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-lg border-t-0">
                <Minus size={16} />
            </button>
        </div>
    );
}

interface LeafletMapsViewProps {
    onSwitchToGoogle?: () => void;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function LeafletMapsView({ onSwitchToGoogle }: LeafletMapsViewProps = {}) {
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const vehiclesRef = useRef<Record<string, Vehicle>>({});
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
    const [search, setSearch] = useState('');
    const [tileLayer, setTileLayer] = useState<'street' | 'satellite'>('street');
    const [followMode, setFollowMode] = useState(false);
    const followModeRef = useRef(false);

    // 2-Way Command State
    const [commandLoading, setCommandLoading] = useState(false);
    const [commandResponse, setCommandResponse] = useState<{ message: string; success: boolean } | null>(null);

    // Keep refs in sync
    useEffect(() => { vehiclesRef.current = vehicles; }, [vehicles]);
    useEffect(() => { followModeRef.current = followMode; }, [followMode]);

    // Fetch initial fleet
    useEffect(() => {
        api.get('/devices').then(res => {
            const map: Record<string, Vehicle> = {};
            res.data.forEach((d: any) => {
                if (d.lat && d.lng) {
                    const lastUpdate = d.last_update ? new Date(d.last_update) : new Date(0);
                    const speed = d.speed || 0;
                    const accStatus = Boolean(d.acc_status);
                    map[d.device_id] = {
                        id: d.device_id,
                        device_id: d.device_id,
                        name: d.name || d.device_id,
                        plate_number: d.plate_number,
                        model: d.model,
                        company_name: d.company_name,
                        lat: d.lat,
                        lng: d.lng,
                        speed,
                        course: d.course || 0,
                        state: d.current_state || getState(speed, accStatus, lastUpdate),
                        lastUpdate,
                        internet_status: d.internet_status || false,
                        gps_status: d.gps_status || false,
                        acc_status: accStatus,
                        battery_level: d.pos_battery_level ?? d.battery_level ?? 100,
                        door_status: d.door_status || false,
                        satellites: d.satellites,
                        gsm_signal: d.gsm_signal,
                        fuel_percent: d.fuel_percent,
                        isTcpConnected: d.isTcpConnected,
                        sim_phone: d.sim_phone
                    };
                }
            });
            setVehicles(map);
            // Select first vehicle by default if none selected
            const firstId = Object.keys(map)[0];
            if (firstId) setSelectedId(firstId);
        }).catch(console.error);

        // Socket live telemetry stream
        socket.connect();
        socket.on('position', (data: any) => {
            const lastUpdate = new Date(data.lastUpdate || Date.now());
            const speed = data.speed || 0;
            const accStatus = Boolean(data.accStatus);
            const state = data.state || getState(speed, accStatus, lastUpdate);

            setVehicles(prev => {
                const existing = prev[data.deviceId];
                const updated: Vehicle = {
                    id: data.deviceId,
                    device_id: data.deviceId,
                    name: existing?.name || data.deviceId,
                    plate_number: existing?.plate_number,
                    model: existing?.model,
                    company_name: existing?.company_name,
                    lat: data.lat,
                    lng: data.lng,
                    speed,
                    course: data.course || 0,
                    state,
                    lastUpdate,
                    internet_status: true,
                    gps_status: data.gpsStatus ?? existing?.gps_status ?? true,
                    acc_status: accStatus,
                    battery_level: data.batteryLevel !== undefined ? data.batteryLevel : (existing?.battery_level ?? 100),
                    door_status: data.doorStatus ?? existing?.door_status ?? false,
                    satellites: data.satellites ?? existing?.satellites,
                    gsm_signal: data.gsmSignal ?? existing?.gsm_signal,
                    fuel_percent: data.fuelPercent ?? existing?.fuel_percent,
                    isTcpConnected: true,
                    sim_phone: existing?.sim_phone
                };
                return { ...prev, [data.deviceId]: updated };
            });

            // Follow mode
            if (followModeRef.current && data.deviceId === selectedId) {
                setFlyTarget([data.lat, data.lng]);
            }
        });

        return () => {
            socket.off('position');
            socket.disconnect();
        };
    }, [selectedId]);

    const handleSelectVehicle = useCallback((id: string) => {
        setSelectedId(id);
        const v = vehiclesRef.current[id];
        if (v) setFlyTarget([v.lat, v.lng]);
    }, []);

    // 2-Way Command Dispatcher
    const sendRemoteCommand = async (commandType: string, extraParams: any = {}) => {
        if (!selectedId) return;
        setCommandLoading(true);
        setCommandResponse(null);

        try {
            const res = await api.post(`/devices/${selectedId}/command`, {
                commandType,
                ...extraParams
            });
            setCommandResponse({
                message: res.data.message,
                success: res.data.success
            });
        } catch (err: any) {
            setCommandResponse({
                message: err.response?.data?.error || "Failed to transmit command",
                success: false
            });
        } finally {
            setCommandLoading(false);
            setTimeout(() => setCommandResponse(null), 6000);
        }
    };

    // Stats
    const all = Object.values(vehicles);
    const moving = all.filter(v => v.state === 'moving').length;
    const idling = all.filter(v => v.state === 'idling').length;
    const parked = all.filter(v => v.state === 'parked').length;
    const offline = all.filter(v => v.state === 'offline').length;

    const selectedVehicle = selectedId ? vehicles[selectedId] : null;

    const filtered = all.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.device_id.includes(search) ||
        (v.plate_number && v.plate_number.toLowerCase().includes(search.toLowerCase())) ||
        (v.company_name && v.company_name.toLowerCase().includes(search.toLowerCase()))
    );

    const tileUrl = tileLayer === 'street'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const tileAttr = tileLayer === 'street'
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        : '&copy; Esri, Maxar, Earthstar Geographics';

    return (
        <div className="flex flex-col h-full w-full bg-zinc-950">

            {/* ── Top Stats Bar ── */}
            <div className="flex items-center gap-0 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur shrink-0 overflow-x-auto">
                {[
                    { label: 'Total Fleet', value: all.length, color: 'text-zinc-200', bg: 'bg-zinc-800/30', icon: <Car size={15} /> },
                    { label: 'Moving', value: moving, color: 'text-green-400', bg: 'bg-green-500/10', icon: <Gauge size={15} /> },
                    { label: 'Idling', value: idling, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <Clock size={15} /> },
                    { label: 'Parked', value: parked, color: 'text-blue-400', bg: 'bg-blue-500/10', icon: <Navigation size={15} /> },
                    { label: 'Offline', value: offline, color: 'text-zinc-400', bg: 'bg-zinc-800/20', icon: <WifiOff size={15} /> },
                ].map((s, i) => (
                    <div key={i} className={`flex items-center gap-3 px-5 py-2.5 border-r border-zinc-800 ${s.bg} shrink-0`}>
                        <div className={s.color}>{s.icon}</div>
                        <div>
                            <div className={`text-lg font-bold leading-none ${s.color}`}>{s.value}</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{s.label}</div>
                        </div>
                    </div>
                ))}

                <div className="ml-auto px-4 flex items-center gap-2 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-zinc-400 font-mono">Live Telemetry Pipeline</span>
                </div>
            </div>

            {/* ── Main Split View ── */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* ── Left Vehicle Sidebar ── */}
                <div className="w-80 bg-zinc-900/95 border-r border-zinc-800 flex flex-col shrink-0 z-10">
                    {/* Search */}
                    <div className="p-3 border-b border-zinc-800">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, plate, IMEI..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Vehicle List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50">
                        {filtered.length === 0 && (
                            <div className="p-8 text-center text-zinc-500 text-xs">No matching vehicles found</div>
                        )}
                        {filtered.map(v => (
                            <button
                                key={v.id}
                                onClick={() => handleSelectVehicle(v.id)}
                                className={`w-full text-left p-3.5 transition-colors relative ${
                                    selectedId === v.id ? 'bg-zinc-800/80 border-l-4 border-l-blue-500' : 'hover:bg-zinc-800/40'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stateColor(v.state) }} />
                                        <span className="font-semibold text-white text-sm truncate max-w-[150px]">{v.name}</span>
                                    </div>
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                                        style={{ color: stateColor(v.state), backgroundColor: `${stateColor(v.state)}15` }}
                                    >
                                        {stateLabel(v.state)}
                                    </span>
                                </div>

                                {v.company_name && (
                                    <p className="text-[11px] text-zinc-400 mb-1">{v.company_name}</p>
                                )}

                                {/* Compact Telemetry Badges */}
                                <div className="grid grid-cols-3 gap-1 text-[11px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/60 mt-2">
                                    <div className="flex items-center gap-1">
                                        <Gauge size={11} className="text-blue-400 shrink-0" />
                                        <span className="font-mono text-zinc-200">{v.speed.toFixed(0)} <span className="text-[9px] text-zinc-500">km/h</span></span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Battery size={11} className="text-green-400 shrink-0" />
                                        <span className="font-mono text-zinc-200">{v.battery_level}%</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Key size={11} className={v.acc_status ? 'text-emerald-400 shrink-0' : 'text-zinc-600 shrink-0'} />
                                        <span className={`text-[10px] ${v.acc_status ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            {v.acc_status ? 'ENG ON' : 'ENG OFF'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 px-0.5">
                                    <span className="font-mono text-zinc-400">{v.plate_number || v.device_id.slice(-6)}</span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} />
                                        {timeSince(v.lastUpdate)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Main Map Area ── */}
                <div className="relative flex-1 h-full">
                    {/* Map Controls Header Overlay */}
                    <div className="absolute top-3 right-3 z-[500] flex items-center gap-2">
                        {/* Tile Mode Toggle */}
                        <div className="flex bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                            <button
                                onClick={() => setTileLayer('street')}
                                className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                    tileLayer === 'street' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                <Layers size={13} /> Street
                            </button>
                            <button
                                onClick={() => setTileLayer('satellite')}
                                className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                    tileLayer === 'satellite' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                <Layers size={13} /> Satellite
                            </button>
                        </div>

                        {/* Follow Mode Toggle */}
                        {selectedId && (
                            <button
                                onClick={() => setFollowMode(f => !f)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-xl flex items-center gap-1.5 transition-colors ${
                                    followMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                <Navigation size={13} className={followMode ? 'animate-spin' : ''} />
                                {followMode ? 'Following' : 'Follow'}
                            </button>
                        )}

                        {/* Switch to Google Maps */}
                        {onSwitchToGoogle && (
                            <button
                                onClick={onSwitchToGoogle}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-xl flex items-center gap-1.5"
                                title="Switch to Google Maps"
                            >
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Google Maps
                            </button>
                        )}
                    </div>

                    <MapContainer
                        center={[31.6268, -8.0037]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        className="z-0"
                    >
                        <TileLayer url={tileUrl} attribution={tileAttr} />
                        <FitBounds vehicles={vehicles} />
                        <FlyTo target={flyTarget} />
                        <ZoomControls />

                        {Object.values(vehicles).filter(v => v.lat && v.lng).map(v => (
                            <Marker
                                key={v.id}
                                position={[v.lat, v.lng]}
                                icon={makeCarIcon(v.state, v.course)}
                                eventHandlers={{ click: () => handleSelectVehicle(v.id) }}
                            >
                                <Popup maxWidth={260} className="vehicle-popup">
                                    <div className="bg-zinc-900 text-white rounded-xl p-3.5 min-w-[210px] border border-zinc-800 shadow-2xl">
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                                            <div>
                                                <h4 className="font-bold text-sm text-white">{v.name}</h4>
                                                <p className="text-[10px] text-zinc-400 font-mono">{v.device_id}</p>
                                            </div>
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded"
                                                style={{ color: stateColor(v.state), backgroundColor: `${stateColor(v.state)}15` }}
                                            >
                                                {stateLabel(v.state)}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5 text-xs text-zinc-300">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Live Speed</span>
                                                <span className="font-mono text-blue-400 font-semibold">{v.speed.toFixed(1)} km/h</span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Ignition (ACC)</span>
                                                <span className={v.acc_status ? 'text-emerald-400 font-semibold' : 'text-zinc-500 font-semibold'}>
                                                    {v.acc_status ? 'Engine ON' : 'Engine OFF'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Battery</span>
                                                <span className="font-mono text-green-400">{v.battery_level}%</span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Heading</span>
                                                <span className="font-mono text-zinc-200">{getCourseCompass(v.course)}</span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">GPS Signal</span>
                                                <span className={v.gps_status ? 'text-green-400' : 'text-zinc-500'}>
                                                    {v.gps_status ? '3D Active Lock' : 'Searching'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Last Seen</span>
                                                <span>{timeSince(v.lastUpdate)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* ── Bottom Telemetry & 2-Way Command Deck ── */}
                    {selectedVehicle && (
                        <div className="absolute bottom-4 left-4 right-16 z-[500] bg-zinc-900/95 border border-zinc-800 backdrop-blur rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                
                                {/* Vehicle Identity & Primary Telemetry */}
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
                                        style={{ backgroundColor: `${stateColor(selectedVehicle.state)}15`, borderColor: `${stateColor(selectedVehicle.state)}30` }}
                                    >
                                        <Car size={24} style={{ color: stateColor(selectedVehicle.state) }} />
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-white">{selectedVehicle.name}</h3>
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                                                style={{ color: stateColor(selectedVehicle.state), backgroundColor: `${stateColor(selectedVehicle.state)}20` }}
                                            >
                                                {stateLabel(selectedVehicle.state)}
                                            </span>
                                            {selectedVehicle.isTcpConnected && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    TCP SOCKET
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            IMEI: <span className="font-mono text-zinc-300">{selectedVehicle.device_id}</span>
                                            {selectedVehicle.plate_number && <span className="ml-3 font-semibold text-zinc-200">Plate: {selectedVehicle.plate_number}</span>}
                                            {selectedVehicle.company_name && <span className="ml-3 text-zinc-400">Client: {selectedVehicle.company_name}</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Comprehensive Telemetry Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                                    <div className="px-3 py-1">
                                        <p className="text-[10px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
                                            <Gauge size={11} className="text-blue-400" /> Speed
                                        </p>
                                        <p className="text-sm font-bold font-mono text-blue-400 mt-0.5">
                                            {selectedVehicle.speed.toFixed(1)} <span className="text-[10px] text-zinc-500 font-normal">km/h</span>
                                        </p>
                                    </div>

                                    <div className="px-3 py-1 border-l border-zinc-800">
                                        <p className="text-[10px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
                                            <Key size={11} className={selectedVehicle.acc_status ? 'text-emerald-400' : 'text-zinc-600'} /> Ignition
                                        </p>
                                        <p className={`text-sm font-bold mt-0.5 ${selectedVehicle.acc_status ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            {selectedVehicle.acc_status ? 'Engine ON' : 'Engine OFF'}
                                        </p>
                                    </div>

                                    <div className="px-3 py-1 border-l border-zinc-800">
                                        <p className="text-[10px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
                                            <Battery size={11} className="text-green-400" /> Battery
                                        </p>
                                        <p className="text-sm font-bold font-mono text-green-400 mt-0.5">
                                            {selectedVehicle.battery_level}%
                                        </p>
                                    </div>

                                    <div className="px-3 py-1 border-l border-zinc-800">
                                        <p className="text-[10px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
                                            <Compass size={11} className="text-yellow-400" /> Heading
                                        </p>
                                        <p className="text-sm font-bold font-mono text-zinc-200 mt-0.5">
                                            {getCourseCompass(selectedVehicle.course)}
                                        </p>
                                    </div>
                                </div>

                                {/* 2-Way Hardware Commands (Immobilizer / Control) */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => {
                                            if (confirm(`⚠️ EMERGENCY IMMOBILIZER WARNING:\n\nAre you sure you want to CUT THE ENGINE for vehicle "${selectedVehicle.name}"?\n\nThis will trigger the fuel pump relay to disable the vehicle.`)) {
                                                sendRemoteCommand('stop_engine');
                                            }
                                        }}
                                        disabled={commandLoading}
                                        className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg"
                                        title="Cut fuel pump relay (Immobilizer)"
                                    >
                                        <ZapOff size={14} />
                                        <span>Cut Engine</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (confirm(`Restore engine power for "${selectedVehicle.name}"?`)) {
                                                sendRemoteCommand('resume_engine');
                                            }
                                        }}
                                        disabled={commandLoading}
                                        className="px-3 py-2 bg-green-950/40 hover:bg-green-900/60 border border-green-800/80 text-green-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg"
                                        title="Restore engine power"
                                    >
                                        <Zap size={14} />
                                        <span>Resume</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const seconds = prompt("Enter GPS update interval in seconds (e.g. 10 for rapid tracking, 30 for normal):", "10");
                                            if (seconds) {
                                                sendRemoteCommand('set_interval', { intervalSeconds: seconds });
                                            }
                                        }}
                                        disabled={commandLoading}
                                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
                                        title="Adjust Reporting Interval"
                                    >
                                        <Sliders size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Command Status Banner */}
                            {commandResponse && (
                                <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                                    commandResponse.success 
                                        ? 'bg-green-950/40 border-green-800 text-green-300' 
                                        : 'bg-amber-950/40 border-amber-800 text-amber-300'
                                }`}>
                                    {commandResponse.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                    <span>{commandResponse.message}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
