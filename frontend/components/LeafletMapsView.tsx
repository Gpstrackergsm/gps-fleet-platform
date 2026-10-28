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
    CheckCircle2, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Tag, MapPin
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

function generateVehicleMarkerSvg(state: string, course: number, isSelected: boolean): string {
    const selectedHalo = isSelected
        ? `<circle cx="18" cy="18" r="17" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-dasharray="3,2" opacity="0.95"/>`
        : '';

    if (state === 'moving') {
        // High-precision aerodynamic directional arrow rotated by vehicle heading
        return `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          ${selectedHalo}
          <g transform="rotate(${course || 0}, 18, 18)">
            <!-- Contrast drop-shadow -->
            <path d="M 18,5 L 28.5,31 L 18,25 L 7.5,31 Z" fill="#000000" fill-opacity="0.38"/>
            <!-- Directional radar ring -->
            <circle cx="18" cy="18" r="15" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-width="1.2" stroke-dasharray="2,2"/>
            <!-- Navigation Arrowhead -->
            <path d="M 18,3.5 L 28,29.5 L 18,23.5 L 8,29.5 Z" fill="#22c55e" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
          </g>
        </svg>`.trim();
    }

    if (state === 'parked') {
        // Universal Blue Parking "P" badge
        return `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          ${selectedHalo}
          <!-- Contrast drop-shadow -->
          <circle cx="18" cy="19.5" r="14" fill="#000000" fill-opacity="0.35"/>
          <!-- Outer border ring -->
          <circle cx="18" cy="18" r="14" fill="#1d4ed8" stroke="#ffffff" stroke-width="2.2"/>
          <!-- Inner badge -->
          <circle cx="18" cy="18" r="11" fill="#2563eb"/>
          <!-- Bold 'P' -->
          <text x="18" y="23" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">P</text>
        </svg>`.trim();
    }

    if (state === 'idling') {
        // Amber Idling badge with Ignition Key icon
        return `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          ${selectedHalo}
          <!-- Contrast drop-shadow -->
          <circle cx="18" cy="19.5" r="14" fill="#000000" fill-opacity="0.35"/>
          <!-- Outer border ring -->
          <circle cx="18" cy="18" r="14" fill="#b45309" stroke="#ffffff" stroke-width="2.2"/>
          <!-- Inner badge -->
          <circle cx="18" cy="18" r="11" fill="#f59e0b"/>
          <!-- Ignition Key symbol -->
          <g transform="translate(18, 18) scale(0.62) translate(-18, -18)">
            <circle cx="13" cy="13" r="4.5" fill="none" stroke="#ffffff" stroke-width="2.6"/>
            <path d="M16.5 16.5 L26 26 M22.5 22.5 L25 25 M20 25 L22.5 27.5" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none"/>
          </g>
        </svg>`.trim();
    }

    // Default: offline
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      ${selectedHalo}
      <!-- Contrast drop-shadow -->
      <circle cx="18" cy="19.5" r="13" fill="#000000" fill-opacity="0.3"/>
      <!-- Outer border ring -->
      <circle cx="18" cy="18" r="13" fill="#334155" stroke="#ffffff" stroke-width="2"/>
      <!-- Inner badge -->
      <circle cx="18" cy="18" r="10" fill="#64748b"/>
      <!-- Offline dot / slash -->
      <circle cx="18" cy="18" r="3" fill="#ffffff"/>
    </svg>`.trim();
}

function makeCarIcon(state: string, course: number, isSelected: boolean = false) {
    const svg = generateVehicleMarkerSvg(state, course, isSelected);
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

    // Panel Visibility States (Can hide/collapse any menu part)
    const [fleetOpen, setFleetOpen] = useState(true);
    const [telemetryOpen, setTelemetryOpen] = useState(true);
    const [showMapLabels, setShowMapLabels] = useState(false);

    // Reverse Geocoded Addresses
    const [addresses, setAddresses] = useState<Record<string, string>>({});
    const addressCache = useRef<Record<string, string>>({});

    const resolveAddress = useCallback(async (lat: number, lng: number, deviceId: string) => {
        const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (addressCache.current[cacheKey]) {
            setAddresses(prev => {
                if (prev[deviceId] === addressCache.current[cacheKey]) return prev;
                return { ...prev, [deviceId]: addressCache.current[cacheKey] };
            });
            return;
        }

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.display_name) {
                    addressCache.current[cacheKey] = data.display_name;
                    setAddresses(prev => ({ ...prev, [deviceId]: data.display_name }));
                }
            }
        } catch {
            // fallback gracefully
        }
    }, []);

    // Keep refs in sync
    useEffect(() => { vehiclesRef.current = vehicles; }, [vehicles]);
    useEffect(() => { followModeRef.current = followMode; }, [followMode]);

    // Resolve addresses when vehicles update
    useEffect(() => {
        Object.values(vehicles).forEach(v => {
            if (v.lat && v.lng) {
                resolveAddress(v.lat, v.lng, v.device_id);
            }
        });
    }, [vehicles, resolveAddress]);

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
                // Strict multi-tenant isolation: only update vehicles that belong to this user's fleet
                if (!existing) {
                    return prev;
                }
                const updated: Vehicle = {
                    ...existing,
                    lat: data.lat,
                    lng: data.lng,
                    speed,
                    course: data.course || 0,
                    state,
                    lastUpdate,
                    internet_status: true,
                    gps_status: data.gpsStatus ?? existing.gps_status ?? true,
                    acc_status: accStatus,
                    battery_level: data.batteryLevel !== undefined ? data.batteryLevel : existing.battery_level,
                    door_status: data.doorStatus ?? existing.door_status ?? false,
                    satellites: data.satellites ?? existing.satellites,
                    gsm_signal: data.gsmSignal ?? existing.gsm_signal,
                    fuel_percent: data.fuelPercent ?? existing.fuel_percent,
                    isTcpConnected: true,
                    sim_phone: existing.sim_phone
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

    const handleSelectVehicle = useCallback((id: string, toggleLabel = false) => {
        setSelectedId(id);
        setTelemetryOpen(true);
        if (toggleLabel) {
            setShowMapLabels(prev => selectedId === id ? !prev : true);
        }
        const v = vehiclesRef.current[id];
        if (v) setFlyTarget([v.lat, v.lng]);
    }, [selectedId]);

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

            {/* ── Top Stats Bar (Desktop only) ── */}
            <div className="hidden md:flex items-center gap-0 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur shrink-0 overflow-x-auto">
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

                {/* ── Desktop Left Vehicle Sidebar ── */}
                {fleetOpen && (
                    <div className="hidden md:flex w-80 bg-zinc-900/95 border-r border-zinc-800 flex-col shrink-0 z-10 transition-all duration-300">
                        {/* Header */}
                        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-zinc-300 tracking-wider">Live Fleet</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">{filtered.length} Units</span>
                                <button
                                    onClick={() => setFleetOpen(false)}
                                    className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                                    title="Hide Fleet Panel"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                            </div>
                        </div>

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
                                    <p className="text-[11px] text-zinc-400 mb-0.5">{v.company_name}</p>
                                )}

                                {/* Physical Street Address */}
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 truncate my-1">
                                    <MapPin size={11} className="text-red-400 shrink-0" />
                                    <span className="truncate" title={addresses[v.device_id] || `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`}>
                                        {addresses[v.device_id] || `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`}
                                    </span>
                                </div>

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
            )}

            {/* ── Mobile Slide-Over Fleet Drawer ── */}
            {fleetOpen && (
                <div className="fixed inset-0 z-[600] md:hidden">
                    <div
                        onClick={() => setFleetOpen(false)}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-zinc-900 border-r border-zinc-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
                        <div className="flex items-center justify-between p-3.5 border-b border-zinc-800">
                            <div className="flex items-center gap-2">
                                <Car size={16} className="text-blue-400" />
                                <span className="font-bold text-white text-sm">Active Fleet</span>
                                <span className="text-xs bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded-full font-mono">{filtered.length}</span>
                            </div>
                            <button
                                onClick={() => setFleetOpen(false)}
                                className="p-1 text-zinc-400 hover:text-white rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

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

                        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50">
                            {filtered.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => { handleSelectVehicle(v.id); setFleetOpen(false); }}
                                    className={`w-full text-left p-3.5 transition-colors ${
                                        selectedId === v.id ? 'bg-zinc-800 border-l-4 border-l-blue-500' : 'hover:bg-zinc-800/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-white text-sm truncate">{v.name}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: stateColor(v.state), backgroundColor: `${stateColor(v.state)}20` }}>
                                            {stateLabel(v.state)}
                                        </span>
                                    </div>
                                    <div className="text-xs font-mono text-zinc-400 flex items-center justify-between">
                                        <span className="text-blue-400 font-bold">{v.speed.toFixed(0)} km/h</span>
                                        <span>{timeSince(v.lastUpdate)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Map Area ── */}
            <div className="relative flex-1 h-full">
                {/* Floating Fleet Reopen Trigger Button (When Fleet Menu is Hidden) */}
                {!fleetOpen && (
                    <button
                        onClick={() => setFleetOpen(true)}
                        className="absolute top-3 left-3 z-[500] bg-zinc-900/95 border border-zinc-700 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur hover:bg-zinc-800 transition-colors"
                        title="Show Fleet List"
                    >
                        <Car size={13} className="text-blue-400" />
                        <span>Fleet</span>
                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">{all.length}</span>
                        <ChevronRight size={13} className="text-zinc-400" />
                    </button>
                )}

                    {/* Map Controls Header Overlay */}
                    <div className="absolute top-3 right-3 z-[500] flex items-center gap-1.5 max-w-[calc(100vw-110px)] overflow-x-auto no-scrollbar">
                        {/* Tile Mode Toggle */}
                        <div className="flex bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                            <button
                                onClick={() => setTileLayer('street')}
                                className={`px-2.5 py-1.5 text-[11px] md:text-xs font-semibold flex items-center gap-1 transition-colors ${
                                    tileLayer === 'street' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                <Layers size={12} /> Street
                            </button>
                            <button
                                onClick={() => setTileLayer('satellite')}
                                className={`px-2.5 py-1.5 text-[11px] md:text-xs font-semibold flex items-center gap-1 transition-colors ${
                                    tileLayer === 'satellite' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                Satellite
                            </button>
                        </div>

                        {/* Follow Mode Toggle */}
                        {selectedId && (
                            <button
                                onClick={() => setFollowMode(f => !f)}
                                className={`px-2.5 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg border shadow-xl flex items-center gap-1 transition-colors ${
                                    followMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                <Navigation size={12} className={followMode ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">{followMode ? 'Following' : 'Follow'}</span>
                            </button>
                        )}

                        {/* Switch to Google Maps */}
                        {onSwitchToGoogle && (
                            <button
                                onClick={onSwitchToGoogle}
                                className="px-2.5 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-xl flex items-center gap-1"
                                title="Switch to Google Maps"
                            >
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="hidden sm:inline">Google</span>
                            </button>
                        )}

                        {/* Toggle Vehicle Labels */}
                        <button
                            onClick={() => setShowMapLabels(prev => !prev)}
                            className={`px-2.5 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg border shadow-xl flex items-center gap-1 transition-colors ${
                                showMapLabels ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                            }`}
                            title="Toggle vehicle label on map"
                        >
                            <Tag size={12} />
                            <span className="hidden sm:inline">Labels</span>
                        </button>
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
                                icon={makeCarIcon(v.state, v.course, v.id === selectedId)}
                                eventHandlers={{ click: () => handleSelectVehicle(v.id, true) }}
                            >
                                {showMapLabels && selectedId === v.id && (
                                    <Popup maxWidth={220} className="vehicle-popup">
                                        <div className="bg-zinc-900 text-white rounded-lg p-2 min-w-[130px] max-w-[190px] border border-zinc-800 shadow-xl font-sans">
                                            <div className="flex items-center justify-between gap-1 pb-1 border-b border-zinc-800">
                                                <h4 className="font-bold text-xs text-white truncate">{v.name}</h4>
                                                <span
                                                    className="text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0"
                                                    style={{ color: stateColor(v.state), backgroundColor: `${stateColor(v.state)}20` }}
                                                >
                                                    {stateLabel(v.state)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-1 text-[11px]">
                                                <span className="text-blue-400 font-mono font-bold">{v.speed.toFixed(0)} km/h</span>
                                                <span className={v.acc_status ? 'text-emerald-400 text-[10px] font-semibold' : 'text-zinc-500 text-[10px]'}>
                                                    {v.acc_status ? 'ENG ON' : 'ENG OFF'}
                                                </span>
                                            </div>
                                            {addresses[v.device_id] && (
                                                <div className="text-[9px] text-zinc-400 truncate pt-1 flex items-center gap-1">
                                                    <MapPin size={9} className="text-red-400 shrink-0" />
                                                    <span className="truncate">{addresses[v.device_id]}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                )}
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* ── Bottom Telemetry & 2-Way Command Deck ── */}
                    {selectedVehicle && (
                        <>
                            {/* Floating Reopen Pill when Telemetry is Hidden */}
                            {!telemetryOpen && (
                                <button
                                    onClick={() => setTelemetryOpen(true)}
                                    className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] bg-zinc-900/95 border border-zinc-700 text-white px-3.5 py-1.5 rounded-full shadow-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur hover:bg-zinc-800 transition-colors animate-in fade-in"
                                    title="Show vehicle telemetry"
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stateColor(selectedVehicle.state) }} />
                                    <span>{selectedVehicle.name}</span>
                                    <span className="text-[10px] text-blue-400 font-mono font-bold">{selectedVehicle.speed.toFixed(0)} km/h</span>
                                    <ChevronUp size={14} className="text-zinc-400" />
                                </button>
                            )}

                            {/* Full Telemetry Card */}
                            <div className={`absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-16 z-[500] bg-zinc-900/95 border border-zinc-800 backdrop-blur rounded-2xl shadow-2xl p-3 md:p-4 transition-all duration-200 ${!telemetryOpen ? 'hidden' : 'block animate-in fade-in slide-in-from-bottom-2'}`}>
                                {/* Card Header: Identity & Panel Controls */}
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 border"
                                            style={{ backgroundColor: `${stateColor(selectedVehicle.state)}15`, borderColor: `${stateColor(selectedVehicle.state)}30` }}
                                        >
                                            <Car size={20} style={{ color: stateColor(selectedVehicle.state) }} />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="text-xs md:text-base font-bold text-white truncate max-w-[130px] md:max-w-none">{selectedVehicle.name}</h3>
                                                <span
                                                    className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase"
                                                    style={{ color: stateColor(selectedVehicle.state), backgroundColor: `${stateColor(selectedVehicle.state)}20` }}
                                                >
                                                    {stateLabel(selectedVehicle.state)}
                                                </span>
                                                {selectedVehicle.isTcpConnected && (
                                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 hidden sm:inline-flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        TCP
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-zinc-400 truncate">
                                                {selectedVehicle.plate_number ? `Plate: ${selectedVehicle.plate_number}` : `IMEI: ${selectedVehicle.device_id}`}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-200 font-medium truncate mt-0.5 max-w-[220px] sm:max-w-md">
                                                <MapPin size={12} className="text-red-400 shrink-0" />
                                                <span className="truncate" title={addresses[selectedVehicle.device_id] || ""}>
                                                    {addresses[selectedVehicle.device_id] || "Resolving street address..."}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            <span className="text-sm md:text-base font-bold font-mono text-blue-400 block leading-tight">
                                                {selectedVehicle.speed.toFixed(1)} <span className="text-[9px] text-zinc-500 font-normal">km/h</span>
                                            </span>
                                            <span className="text-[9px] text-zinc-400">{timeSince(selectedVehicle.lastUpdate)}</span>
                                        </div>

                                        {/* Minimize / Close Telemetry Buttons */}
                                        <button
                                            onClick={() => setTelemetryOpen(false)}
                                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors ml-1"
                                            title="Minimize Telemetry Panel"
                                        >
                                            <ChevronDown size={18} />
                                        </button>
                                        <button
                                            onClick={() => { setSelectedId(null); setTelemetryOpen(false); }}
                                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                                            title="Close Panel"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Telemetry Metrics Strip */}
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 text-center pb-2.5 mb-2.5 border-b border-zinc-800/60">
                                    <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40">
                                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">Engine</span>
                                        <span className={`text-[11px] font-bold ${selectedVehicle.acc_status ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            {selectedVehicle.acc_status ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                    <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40">
                                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">Battery</span>
                                        <span className="text-[11px] font-bold font-mono text-green-400">{selectedVehicle.battery_level}%</span>
                                    </div>
                                    <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40">
                                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">Heading</span>
                                        <span className="text-[11px] font-mono text-amber-400">{getCourseCompass(selectedVehicle.course)}</span>
                                    </div>
                                    <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40">
                                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">GPS</span>
                                        <span className={`text-[11px] font-mono font-bold ${selectedVehicle.gps_status ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {selectedVehicle.gps_status ? '3D Lock' : 'No Fix'}
                                        </span>
                                    </div>
                                    <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40 hidden sm:block">
                                        <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">Coordinates</span>
                                        <span className="text-[10px] font-mono text-zinc-300 truncate block">{selectedVehicle.lat.toFixed(4)}, {selectedVehicle.lng.toFixed(4)}</span>
                                    </div>
                                </div>

                                {/* 2-Way Hardware Remote Control Actions */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    <button
                                        onClick={() => {
                                            if (confirm(`⚠️ EMERGENCY IMMOBILIZER WARNING:\n\nAre you sure you want to CUT THE ENGINE for vehicle "${selectedVehicle.name}"?`)) {
                                                sendRemoteCommand('stop_engine');
                                            }
                                        }}
                                        disabled={commandLoading}
                                        className="py-1.5 px-2 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 text-[10px] md:text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors disabled:opacity-50 shadow-lg"
                                        title="Remotely kill fuel pump / engine relay"
                                    >
                                        <ZapOff size={12} className="text-red-400 shrink-0" />
                                        <span className="truncate">Cut Engine</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (confirm(`Restore engine power for "${selectedVehicle.name}"?`)) {
                                                sendRemoteCommand('resume_engine');
                                            }
                                        }}
                                        disabled={commandLoading}
                                        className="py-1.5 px-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-200 text-[10px] md:text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors disabled:opacity-50 shadow-lg"
                                        title="Restore fuel pump relay to normal"
                                    >
                                        <Zap size={12} className="text-emerald-400 shrink-0" />
                                        <span className="truncate">Resume</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const seconds = prompt("Enter GPS update interval in seconds (e.g. 10 for rapid tracking, 30 for normal):", "30");
                                            if (seconds) {
                                                sendRemoteCommand('set_interval', { intervalSeconds: seconds });
                                            }
                                        }}
                                        disabled={commandLoading}
                                        className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[10px] md:text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                        title="Set reporting frequency"
                                    >
                                        <Sliders size={12} className="shrink-0" />
                                        <span className="truncate">Sync Rate</span>
                                    </button>
                                </div>

                                {/* Command Status Banner */}
                                {commandResponse && (
                                    <div className={`mt-2 p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                                        commandResponse.success 
                                            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
                                            : 'bg-red-950/80 border-red-800 text-red-300'
                                    }`}>
                                        <div className="flex items-center gap-1.5 truncate">
                                            {commandResponse.success ? <CheckCircle2 size={13} className="shrink-0" /> : <AlertTriangle size={13} className="shrink-0 text-red-400" />}
                                            <span className="truncate">{commandResponse.message}</span>
                                        </div>
                                        <button onClick={() => setCommandResponse(null)} className="text-zinc-400 hover:text-white shrink-0 ml-1">
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
