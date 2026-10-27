"use client"

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { socket } from '@/lib/socket';
import api from '@/lib/api';
import {
    Search, Plus, Minus, Layers, Navigation, Wifi, WifiOff,
    Gauge, Clock, Car, Radio, Battery, Zap, ZapOff,
    Compass, Key, ShieldAlert, Sliders, AlertTriangle,
    CheckCircle2, X, MapPin, Globe
} from 'lucide-react';

const containerStyle = {
    width: '100%',
    height: '100%'
};

// Default center (Marrakesh, Morocco)
const defaultCenter = {
    lat: 31.626829,
    lng: -8.003744
};

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

interface GoogleMapsViewProps {
    onSwitchToLeaflet?: () => void;
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

function timeSince(date: Date): string {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return `${Math.max(0, s)}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
}

// Static libraries array to avoid re-renders in useJsApiLoader
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["geometry"];

export default function GoogleMapsView({ onSwitchToLeaflet }: GoogleMapsViewProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCnQRiDe3A6Rs9kKAOYJmA4OrOqz8_y7kM",
        region: "MA",
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const vehiclesRef = useRef<Record<string, Vehicle>>({});
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [mapType, setMapType] = useState<google.maps.MapTypeId | 'hybrid' | 'roadmap' | 'satellite' | 'terrain'>('hybrid');
    const [followMode, setFollowMode] = useState(false);
    const followModeRef = useRef(false);
    const hasFittedBounds = useRef(false);
    const [authError, setAuthError] = useState(false);

    // Catch Google Maps Billing / Auth failures
    useEffect(() => {
        (window as any).gm_authFailure = () => {
            console.error("Google Maps JavaScript API error: BillingNotEnabledMapError or AuthFailure");
            setAuthError(true);
        };
        return () => {
            if ((window as any).gm_authFailure) {
                delete (window as any).gm_authFailure;
            }
        };
    }, []);

    // 2-Way Command State
    const [commandLoading, setCommandLoading] = useState(false);
    const [commandResponse, setCommandResponse] = useState<{ message: string; success: boolean } | null>(null);

    // Keep refs in sync
    useEffect(() => { vehiclesRef.current = vehicles; }, [vehicles]);
    useEffect(() => { followModeRef.current = followMode; }, [followMode]);

    // Fetch initial fleet
    useEffect(() => {
        api.get('/devices').then(res => {
            const mapData: Record<string, Vehicle> = {};
            res.data.forEach((d: any) => {
                if (d.lat && d.lng) {
                    const lastUpdate = d.last_update ? new Date(d.last_update) : new Date(0);
                    const speed = d.speed || 0;
                    const accStatus = Boolean(d.acc_status);
                    mapData[d.device_id] = {
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
            setVehicles(mapData);
            const firstId = Object.keys(mapData)[0];
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

            // If follow mode is on and this is the selected vehicle, pan smoothly
            if (followModeRef.current && map && selectedId === data.deviceId) {
                map.panTo({ lat: data.lat, lng: data.lng });
            }
        });

        return () => {
            socket.off('position');
        };
    }, [map, selectedId]);

    // Initial Bounds Fit when map & vehicles are ready
    useEffect(() => {
        if (map && !hasFittedBounds.current && Object.keys(vehicles).length > 0) {
            const validVehicles = Object.values(vehicles).filter(v => v.lat && v.lng);
            if (validVehicles.length > 0) {
                hasFittedBounds.current = true;
                if (validVehicles.length === 1) {
                    map.setCenter({ lat: validVehicles[0].lat, lng: validVehicles[0].lng });
                    map.setZoom(16);
                } else {
                    const bounds = new google.maps.LatLngBounds();
                    validVehicles.forEach(v => bounds.extend({ lat: v.lat, lng: v.lng }));
                    map.fitBounds(bounds, 50);
                }
            }
        }
    }, [map, vehicles]);

    const onLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Select vehicle and pan smoothly
    const handleSelectVehicle = (id: string) => {
        setSelectedId(id);
        const v = vehicles[id];
        if (v && map) {
            map.panTo({ lat: v.lat, lng: v.lng });
            map.setZoom(16);
        }
    };

    // Send 2-Way Hardware Command
    const handleSendCommand = async (type: string, param?: string) => {
        if (!selectedId) return;
        setCommandLoading(true);
        setCommandResponse(null);

        try {
            const res = await api.post(`/devices/${selectedId}/command`, { type, param });
            setCommandResponse({ message: res.data.message || 'Command sent successfully', success: true });
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Failed to dispatch command to tracker';
            setCommandResponse({ message: msg, success: false });
        } finally {
            setCommandLoading(false);
            setTimeout(() => setCommandResponse(null), 5000);
        }
    };

    // Vehicle Stats Calculation
    const vehicleList = Object.values(vehicles);
    const movingCount = vehicleList.filter(v => v.state === 'moving').length;
    const idlingCount = vehicleList.filter(v => v.state === 'idling').length;
    const parkedCount = vehicleList.filter(v => v.state === 'parked').length;
    const offlineCount = vehicleList.filter(v => v.state === 'offline').length;

    const filtered = useMemo(() => {
        return vehicleList.filter(v =>
            v.name.toLowerCase().includes(search.toLowerCase()) ||
            v.device_id.includes(search) ||
            (v.plate_number && v.plate_number.toLowerCase().includes(search.toLowerCase())) ||
            (v.company_name && v.company_name.toLowerCase().includes(search.toLowerCase()))
        );
    }, [vehicleList, search]);

    const selectedVehicle = selectedId ? vehicles[selectedId] : null;

    if (loadError) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950 text-red-400 p-6">
                <AlertTriangle size={48} className="text-red-500 mb-4 animate-bounce" />
                <h3 className="text-lg font-bold text-white mb-2">Google Maps Failed to Load</h3>
                <p className="text-sm text-zinc-400 mb-5 max-w-md text-center">{loadError.message}</p>
                {onSwitchToLeaflet && (
                    <button
                        onClick={onSwitchToLeaflet}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-xl text-sm transition-all flex items-center gap-2"
                    >
                        <Globe size={16} /> Switch to OpenStreetMap
                    </button>
                )}
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400">
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-medium">Loading Google Maps...</p>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full flex overflow-hidden bg-zinc-950 font-sans">
            {/* ── Left Fleet Sidebar ── */}
            <div className="w-80 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col z-10 shrink-0 shadow-2xl">
                {/* Header & Fleet Stats */}
                <div className="p-4 border-b border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <h2 className="text-sm font-bold text-white tracking-wider uppercase">Google Live Fleet</h2>
                        </div>
                        <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
                            {vehicleList.length} Units
                        </span>
                    </div>

                    {/* Status Pill Badges */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
                        <div className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 py-1 rounded">
                            <span className="block text-xs font-bold">{movingCount}</span>
                            Moving
                        </div>
                        <div className="bg-amber-950/60 border border-amber-800/40 text-amber-400 py-1 rounded">
                            <span className="block text-xs font-bold">{idlingCount}</span>
                            Idling
                        </div>
                        <div className="bg-blue-950/60 border border-blue-800/40 text-blue-400 py-1 rounded">
                            <span className="block text-xs font-bold">{parkedCount}</span>
                            Parked
                        </div>
                        <div className="bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 py-1 rounded">
                            <span className="block text-xs font-bold">{offlineCount}</span>
                            Offline
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="mt-3 relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search IMEI, plate, client..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
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

            {/* ── Main Google Maps Area ── */}
            <div className="relative flex-1 h-full">
                {/* Map Controls Header Overlay */}
                <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
                    {/* Google Map Type Selector */}
                    <div className="flex bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                        <button
                            onClick={() => setMapType('hybrid')}
                            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                mapType === 'hybrid' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Layers size={13} /> Hybrid
                        </button>
                        <button
                            onClick={() => setMapType('roadmap')}
                            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                mapType === 'roadmap' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Layers size={13} /> Road
                        </button>
                        <button
                            onClick={() => setMapType('satellite')}
                            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                mapType === 'satellite' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
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

                    {/* Provider Switcher: Switch to Leaflet/OSM if desired */}
                    {onSwitchToLeaflet && (
                        <button
                            onClick={onSwitchToLeaflet}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-xl flex items-center gap-1.5"
                            title="Switch to OpenStreetMap"
                        >
                            <Globe size={13} className="text-blue-400" />
                            OpenStreetMap
                        </button>
                    )}
                </div>

                {/* Billing / Auth Error Notice */}
                {authError && (
                    <div className="absolute top-16 left-6 right-6 z-[600] bg-red-950/95 border-2 border-red-700 backdrop-blur rounded-2xl shadow-2xl p-5 text-white max-w-2xl mx-auto animate-in fade-in duration-300">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-900/60 rounded-xl text-red-300 shrink-0">
                                <AlertTriangle size={28} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-base text-red-100 mb-1">
                                    Google Maps: BillingNotEnabledMapError
                                </h3>
                                <p className="text-xs text-red-200 leading-relaxed mb-3">
                                    Google Cloud requires a linked billing account to activate this API key. 
                                    Google provides <strong>$200 free credit every month</strong> (covers ~28,000 map loads for free).
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {onSwitchToLeaflet && (
                                        <button
                                            onClick={onSwitchToLeaflet}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-lg"
                                        >
                                            <Globe size={14} /> Switch to OpenStreetMap (Active Now)
                                        </button>
                                    )}
                                    <a
                                        href="https://console.cloud.google.com/project/_/billing/enable"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 font-medium rounded-lg text-xs transition-colors"
                                    >
                                        Enable Billing on Google Cloud ↗
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Google Map Container */}
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={defaultCenter}
                    zoom={14}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    mapTypeId={mapType}
                    options={{
                        disableDefaultUI: true,
                        zoomControl: false,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                    }}
                >
                    {/* Render Real Directional Vehicle Markers */}
                    {Object.values(vehicles).filter(v => v.lat && v.lng).map(v => (
                        <Marker
                            key={v.id}
                            position={{ lat: v.lat, lng: v.lng }}
                            onClick={() => handleSelectVehicle(v.id)}
                            icon={{
                                path: "M 0,-18 L 12,14 L 0,8 L -12,14 Z", // Sleek aerodynamic GPS navigation arrow
                                fillColor: stateColor(v.state),
                                fillOpacity: 1,
                                strokeColor: "#ffffff",
                                strokeWeight: 2.2,
                                scale: 1.3,
                                rotation: v.course || 0,
                                anchor: new google.maps.Point(0, 0)
                            }}
                        />
                    ))}

                    {/* Active InfoWindow for Selected Vehicle */}
                    {selectedVehicle && (
                        <InfoWindow
                            position={{ lat: selectedVehicle.lat, lng: selectedVehicle.lng }}
                            onCloseClick={() => setSelectedId(null)}
                            options={{
                                pixelOffset: new google.maps.Size(0, -25)
                            }}
                        >
                            <div className="bg-zinc-900 text-white rounded-lg p-2.5 min-w-[190px] border border-zinc-800 shadow-xl font-sans">
                                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800">
                                    <h4 className="font-bold text-xs text-white">{selectedVehicle.name}</h4>
                                    <span
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                        style={{ color: stateColor(selectedVehicle.state), backgroundColor: `${stateColor(selectedVehicle.state)}20` }}
                                    >
                                        {stateLabel(selectedVehicle.state)}
                                    </span>
                                </div>
                                <div className="space-y-1 text-[11px] text-zinc-300">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Speed:</span>
                                        <span className="font-mono text-blue-400 font-bold">{selectedVehicle.speed.toFixed(1)} km/h</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Engine:</span>
                                        <span className={selectedVehicle.acc_status ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                                            {selectedVehicle.acc_status ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Battery:</span>
                                        <span className="font-mono text-green-400">{selectedVehicle.battery_level}%</span>
                                    </div>
                                </div>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>

                {/* Custom Map Zoom Controls */}
                <div className="absolute bottom-8 right-4 z-[400] flex flex-col gap-1">
                    <button
                        onClick={() => map && map.setZoom((map.getZoom() || 14) + 1)}
                        className="w-9 h-9 bg-zinc-900 border border-zinc-700 text-white rounded-t-lg flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-lg"
                        title="Zoom In"
                    >
                        <Plus size={16} />
                    </button>
                    <button
                        onClick={() => map && map.setZoom((map.getZoom() || 14) - 1)}
                        className="w-9 h-9 bg-zinc-900 border border-zinc-700 text-white rounded-b-lg flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-lg border-t-0"
                        title="Zoom Out"
                    >
                        <Minus size={16} />
                    </button>
                </div>

                {/* ── Bottom Telemetry & 2-Way Command Deck ── */}
                {selectedVehicle && (
                    <div className="absolute bottom-4 left-4 right-16 z-[400] bg-zinc-900/95 border border-zinc-800 backdrop-blur rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
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

                                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                                        <span className="font-mono text-zinc-300">IMEI: {selectedVehicle.device_id}</span>
                                        {selectedVehicle.plate_number && (
                                            <>
                                                <span>•</span>
                                                <span className="font-mono text-zinc-300">Plate: {selectedVehicle.plate_number}</span>
                                            </>
                                        )}
                                        {selectedVehicle.company_name && (
                                            <>
                                                <span>•</span>
                                                <span>Client: {selectedVehicle.company_name}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Telemetry Metrics Strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 border-t md:border-t-0 md:border-l border-zinc-800 pt-3 md:pt-0 md:pl-4">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Speed</span>
                                    <span className="text-sm font-bold font-mono text-blue-400">
                                        {selectedVehicle.speed.toFixed(1)} <span className="text-[10px] text-zinc-500 font-normal">km/h</span>
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Ignition (ACC)</span>
                                    <span className={`text-xs font-bold flex items-center gap-1 ${selectedVehicle.acc_status ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                        <Key size={12} />
                                        {selectedVehicle.acc_status ? 'ENGINE ON' : 'ENGINE OFF'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Battery</span>
                                    <span className="text-xs font-bold font-mono text-green-400 flex items-center gap-1">
                                        <Battery size={12} />
                                        {selectedVehicle.battery_level}%
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Satellites / GSM</span>
                                    <span className="text-xs font-mono text-zinc-300 flex items-center gap-1">
                                        <Radio size={12} className="text-purple-400" />
                                        {selectedVehicle.satellites ?? '--'} sats / {selectedVehicle.gsm_signal ?? '--'} dB
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Course</span>
                                    <span className="text-xs font-mono text-zinc-300 flex items-center gap-1">
                                        <Compass size={12} className="text-amber-400" />
                                        {getCourseCompass(selectedVehicle.course)}
                                    </span>
                                </div>
                            </div>

                            {/* 2-Way Hardware Remote Control Actions */}
                            <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-zinc-800 pt-3 md:pt-0 md:pl-4">
                                <button
                                    onClick={() => handleSendCommand('stop_engine')}
                                    disabled={commandLoading}
                                    className="px-3 py-2 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-lg"
                                    title="Remotely kill fuel pump / engine relay"
                                >
                                    <ZapOff size={14} className="text-red-400" />
                                    Cut Off Engine
                                </button>

                                <button
                                    onClick={() => handleSendCommand('resume_engine')}
                                    disabled={commandLoading}
                                    className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-lg"
                                    title="Restore fuel pump relay to normal"
                                >
                                    <Zap size={14} className="text-emerald-400" />
                                    Resume Engine
                                </button>

                                <button
                                    onClick={() => handleSendCommand('set_interval', '30s')}
                                    disabled={commandLoading}
                                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                    title="Set reporting frequency to 30s"
                                >
                                    <Sliders size={14} />
                                    30s Sync
                                </button>
                            </div>
                        </div>

                        {/* Remote Command Feedback Toast Banner */}
                        {commandResponse && (
                            <div className={`mt-3 p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                commandResponse.success
                                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                    : 'bg-red-950/60 border-red-800 text-red-300'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {commandResponse.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                    <span>{commandResponse.message}</span>
                                </div>
                                <button onClick={() => setCommandResponse(null)} className="text-zinc-400 hover:text-white">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
