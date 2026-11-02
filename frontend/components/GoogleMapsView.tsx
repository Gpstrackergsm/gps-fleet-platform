"use client"

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, TrafficLayer } from '@react-google-maps/api';
import { socket } from '@/lib/socket';
import api from '@/lib/api';
import {
    Search, Plus, Minus, Layers, Navigation, Wifi, WifiOff,
    Gauge, Clock, Car, Radio, Battery, Zap, ZapOff,
    Compass, Key, ShieldAlert, Sliders, AlertTriangle,
    CheckCircle2, X, MapPin, Globe, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Tag, ExternalLink,
    Route, Fuel, TrendingUp, History
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
    stateStartTime: Date;
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

interface DailyVehicleStats {
    distanceKm: number;
    wasteMad: number;
    maxSpeed: number;
}

const FUEL_IDLE_RATES: Record<string, number> = { light: 1.3, van: 1.8, truck: 3.0 };
const SPEED_EXTRA_L_PER_100KM = 2.2;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if ([lat1, lon1, lat2, lon2].some(isNaN)) return 0;
    const R = 6371;
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function formatStateDuration(date: Date): string {
    const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (s < 60) return '< 1m';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    return h > 0 ? `${d}j ${h}h` : `${d}j`;
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&"']/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return c;
        }
    });
}

function generateMarkerWithLabelSvg(rawName: string, state: string, course: number, isSelected: boolean) {
    const raw = (rawName || 'Vehicle').trim();
    const name = raw.length > 16 ? raw.slice(0, 15) + '…' : raw;
    const cleanName = escapeXml(name);
    const charWidth = 6.4;
    const textWidth = Math.round(Math.max(46, Math.min(125, cleanName.length * charWidth + 14)));
    const svgWidth = Math.round(Math.max(textWidth + 8, 44));
    const labelHeight = 16;
    const iconSize = 22;
    const gap = 2;
    const svgHeight = labelHeight + gap + iconSize + 2;

    const labelX = Math.round((svgWidth - textWidth) / 2);
    const iconCenterX = Math.round(svgWidth / 2);
    const iconCenterY = labelHeight + gap + Math.round(iconSize / 2);

    let stateSvg = '';
    if (state === 'moving') {
        stateSvg = `
          <g transform="rotate(${course || 0}, ${iconCenterX}, ${iconCenterY})">
            <path d="M ${iconCenterX},${iconCenterY - 9} L ${iconCenterX + 6.5},${iconCenterY + 8} L ${iconCenterX},${iconCenterY + 4.5} L ${iconCenterX - 6.5},${iconCenterY + 8} Z" fill="#22c55e" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
          </g>
        `;
    } else if (state === 'parked') {
        stateSvg = `
          <circle cx="${iconCenterX}" cy="${iconCenterY}" r="8.5" fill="#2563eb" stroke="#ffffff" stroke-width="1.8"/>
          <text x="${iconCenterX}" y="${iconCenterY + 3.5}" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">P</text>
        `;
    } else if (state === 'idling') {
        stateSvg = `
          <circle cx="${iconCenterX}" cy="${iconCenterY}" r="8.5" fill="#f59e0b" stroke="#ffffff" stroke-width="1.8"/>
          <g transform="translate(${iconCenterX}, ${iconCenterY}) scale(0.42) translate(-18, -18)">
            <circle cx="13" cy="13" r="4.5" fill="none" stroke="#ffffff" stroke-width="3"/>
            <path d="M16.5 16.5 L26 26 M22.5 22.5 L25 25 M20 25 L22.5 27.5" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none"/>
          </g>
        `;
    } else {
        stateSvg = `
          <circle cx="${iconCenterX}" cy="${iconCenterY}" r="7.5" fill="#64748b" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="${iconCenterX}" cy="${iconCenterY}" r="2" fill="#ffffff"/>
        `;
    }

    const stateDotColor = state === 'moving' ? '#22c55e' : state === 'idling' ? '#f59e0b' : state === 'parked' ? '#3b82f6' : '#94a3b8';
    const borderColor = isSelected ? '#38bdf8' : 'rgba(255,255,255,0.22)';
    const bgFill = isSelected ? 'rgba(15, 23, 42, 0.96)' : 'rgba(10, 10, 12, 0.88)';

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
      <!-- Drop shadow for the pill -->
      <rect x="${labelX}" y="2" width="${textWidth}" height="${labelHeight}" rx="4" fill="#000000" fill-opacity="0.35"/>
      <!-- Label Box -->
      <rect x="${labelX}" y="1" width="${textWidth}" height="${labelHeight}" rx="4" fill="${bgFill}" stroke="${borderColor}" stroke-width="${isSelected ? 1.5 : 1}"/>
      <circle cx="${labelX + 5.5}" cy="${1 + labelHeight / 2}" r="2.2" fill="${stateDotColor}"/>
      <text x="${labelX + 11}" y="${1 + labelHeight / 2 + 3.2}" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#ffffff">${cleanName}</text>
      <!-- State Icon Below Label -->
      ${stateSvg}
    </svg>`.trim();

    return { svg, svgWidth, svgHeight, iconCenterX, iconCenterY };
}

function getGoogleVehicleIcon(name: string, state: string, course: number, isSelected: boolean): google.maps.Icon {
    const { svg, svgWidth, svgHeight, iconCenterX, iconCenterY } = generateMarkerWithLabelSvg(name, state, course, isSelected);
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: typeof google !== 'undefined' && google.maps?.Size ? new google.maps.Size(svgWidth, svgHeight) : undefined,
        anchor: typeof google !== 'undefined' && google.maps?.Point ? new google.maps.Point(iconCenterX, iconCenterY) : undefined,
    };
}

// Hide commercial POIs (casinos, hotels, restaurants, shops, landmarks) - keep only roads & street names
const GOOGLE_MAP_STYLES: google.maps.MapTypeStyle[] = [
    {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'transit.station',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
    },
    {
        featureType: 'road',
        elementType: 'labels',
        stylers: [{ visibility: 'on' }]
    }
];

// Static libraries array to avoid re-renders in useJsApiLoader
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["geometry"];

export default function GoogleMapsView({ onSwitchToLeaflet }: GoogleMapsViewProps) {
    const router = useRouter();
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCnQRiDe3A6Rs9kKAOYJmA4OrOqz8_y7kM",
        region: "MA",
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const vehiclesRef = useRef<Record<string, Vehicle>>({});
    const [dailyStats, setDailyStats] = useState<Record<string, DailyVehicleStats>>({});
    const [, setTick] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [mapType, setMapType] = useState<google.maps.MapTypeId | 'hybrid' | 'roadmap' | 'satellite' | 'terrain'>('hybrid');
    const [showTraffic, setShowTraffic] = useState(false);
    const [followMode, setFollowMode] = useState(false);
    const followModeRef = useRef(false);
    const hasFittedBounds = useRef(false);
    const [authError, setAuthError] = useState(false);

    // Panel Visibility States: Fullscreen Clean Satellite Map by default
    const [fleetOpen, setFleetOpen] = useState(false);
    const [telemetryOpen, setTelemetryOpen] = useState(false);
    const [showMapLabels, setShowMapLabels] = useState(true);

    // Reverse Geocoded Addresses
    const [addresses, setAddresses] = useState<Record<string, string>>({});
    const addressCache = useRef<Record<string, string>>({});
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const [mapSearch, setMapSearch] = useState('');

    // Refresh relative timers (state duration & last update) every 15s
    useEffect(() => {
        const timer = setInterval(() => setTick(n => n + 1), 15000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Today's Distance (km), Fuel Waste (MAD), and Max Speed (km/h) per vehicle
    const fetchTodayStats = useCallback(async () => {
        try {
            let vehicleTypes: Record<string, string> = {};
            let fuelPrice = 13.5;
            if (typeof window !== 'undefined') {
                try {
                    const rawTypes = localStorage.getItem('fuel_vehicle_types');
                    if (rawTypes) vehicleTypes = JSON.parse(rawTypes);
                    const rawPrice = localStorage.getItem('fuel_price');
                    if (rawPrice) fuelPrice = Number(rawPrice) || 13.5;
                } catch { /* ignore */ }
            }

            const res = await api.get('/fuel/analytics?period=today&threshold=100');
            const devicesList: any[] = res.data?.devices || [];
            const statsMap: Record<string, DailyVehicleStats> = {};

            devicesList.forEach((d: any) => {
                const vt = vehicleTypes[d.device_id] || 'light';
                const rate = FUEL_IDLE_RATES[vt] || 1.3;
                const idleL = (Number(d.idleHours) || 0) * rate;
                const speedL = ((Number(d.speedingKm) || 0) / 100) * SPEED_EXTRA_L_PER_100KM;
                const eventsCostSum = Array.isArray(d.events) && d.events.length > 0
                    ? d.events.reduce((s: number, e: any) => s + Math.round(((Number(e.minutes) || 0) / 60) * rate * fuelPrice), 0)
                    : Math.round(idleL * fuelPrice * 10) / 10;
                const speedCostRounded = Math.round(speedL * fuelPrice * 10) / 10;
                const totalMad = Math.round((eventsCostSum + speedCostRounded) * 10) / 10;

                statsMap[d.device_id] = {
                    distanceKm: Number(d.distanceKm) || 0,
                    wasteMad: totalMad >= 1 ? Math.round(totalMad) : totalMad,
                    maxSpeed: Number(d.maxSpeed) || 0,
                };
            });

            setDailyStats(statsMap);
        } catch (err) {
            console.error('Failed to fetch daily vehicle stats:', err);
        }
    }, []);

    useEffect(() => {
        fetchTodayStats();
        const interval = setInterval(fetchTodayStats, 60000);
        return () => clearInterval(interval);
    }, [fetchTodayStats]);

    const resolveAddress = useCallback((lat: number, lng: number, deviceId: string) => {
        if (!isLoaded || typeof window === 'undefined' || !window.google?.maps) return;
        const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (addressCache.current[cacheKey]) {
            setAddresses(prev => {
                if (prev[deviceId] === addressCache.current[cacheKey]) return prev;
                return { ...prev, [deviceId]: addressCache.current[cacheKey] };
            });
            return;
        }

        if (!geocoderRef.current) {
            geocoderRef.current = new google.maps.Geocoder();
        }

        geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
                // Filter out cryptic Plus Codes (e.g. MXH5+2G6, Marrakesh, Morocco)
                const plusCodeRegex = /^[A-Z0-9]{2,8}\+[A-Z0-9]{2,}/i;
                const valid = results.filter(r => !plusCodeRegex.test(r.formatted_address.trim()));
                const pool = valid.length > 0 ? valid : results;

                const streetResult = pool.find(r => 
                    (r.types.includes('street_address') || r.types.includes('subpremise') || r.types.includes('premise')) &&
                    !r.formatted_address.toLowerCase().includes('route sans nom') &&
                    !r.formatted_address.toLowerCase().includes('unnamed road')
                ) || pool.find(r => 
                    r.types.includes('route') &&
                    !r.formatted_address.toLowerCase().includes('route sans nom') &&
                    !r.formatted_address.toLowerCase().includes('unnamed road')
                ) || pool.find(r =>
                    r.types.includes('neighborhood') || r.types.includes('sublocality')
                ) || pool[0];

                const cleanAddress = streetResult.formatted_address;
                addressCache.current[cacheKey] = cleanAddress;
                setAddresses(prev => ({ ...prev, [deviceId]: cleanAddress }));
            }
        });
    }, [isLoaded]);

    // Resolve addresses for vehicles
    useEffect(() => {
        if (isLoaded) {
            Object.values(vehicles).forEach(v => {
                if (v.lat && v.lng) {
                    resolveAddress(v.lat, v.lng, v.device_id);
                }
            });
        }
    }, [isLoaded, vehicles, resolveAddress]);

    const handleSearchAddress = (e: React.FormEvent) => {
        e.preventDefault();
        if (!mapSearch.trim() || !isLoaded || !map) return;
        if (!geocoderRef.current && window.google?.maps) {
            geocoderRef.current = new google.maps.Geocoder();
        }
        if (geocoderRef.current) {
            geocoderRef.current.geocode({ address: mapSearch.trim() }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    map.panTo(results[0].geometry.location);
                    map.setZoom(16);
                } else {
                    alert('Location not found. Please try another address.');
                }
            });
        }
    };

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
                    const stateStartTime = d.state_start_time ? new Date(d.state_start_time) : lastUpdate;
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
                        stateStartTime,
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

                // Update daily distance & maxSpeed incrementally in real-time
                if (data.lat && data.lng) {
                    const deltaKm = speed >= 5 ? haversineKm(existing.lat, existing.lng, data.lat, data.lng) : 0;
                    setDailyStats(prevStats => {
                        const cur = prevStats[data.deviceId] || { distanceKm: 0, wasteMad: 0, maxSpeed: 0 };
                        return {
                            ...prevStats,
                            [data.deviceId]: {
                                ...cur,
                                distanceKm: Math.round((cur.distanceKm + (deltaKm < 5 ? deltaKm : 0)) * 10) / 10,
                                maxSpeed: speed < 220 ? Math.max(cur.maxSpeed, Math.round(speed)) : cur.maxSpeed,
                            }
                        };
                    });
                }

                const stateStartTime = data.stateStartTime
                    ? new Date(data.stateStartTime)
                    : existing.state !== state
                        ? lastUpdate
                        : existing.stateStartTime;

                const updated: Vehicle = {
                    ...existing,
                    lat: data.lat,
                    lng: data.lng,
                    speed,
                    course: data.course || 0,
                    state,
                    stateStartTime,
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
    const handleSelectVehicle = (id: string, toggleLabel = false) => {
        setSelectedId(id);
        setTelemetryOpen(true);
        if (toggleLabel) {
            setShowMapLabels(prev => selectedId === id ? !prev : true);
        }
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

    // Reusable Fleet List (Desktop + Mobile Drawer)
    const renderFleetList = (isMobile = false) => (
        <div className="flex flex-col h-full bg-zinc-900">
            {/* Header & Fleet Stats */}
            <div className="p-3 md:p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        <h2 className="text-xs md:text-sm font-bold text-white tracking-wider uppercase">Live Fleet</h2>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
                            {vehicleList.length} Units
                        </span>
                        <button
                            onClick={() => setFleetOpen(false)}
                            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                            title="Hide Fleet Panel"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                </div>

                {/* Status Pill Badges */}
                <div className="grid grid-cols-4 gap-1 text-center text-[9px] md:text-[10px] font-semibold">
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
                <div className="mt-2.5 relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search IMEI, plate, client..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Vehicle List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50">
                {filtered.length === 0 && (
                    <div className="p-8 text-center text-zinc-500 text-xs">No matching vehicles found</div>
                )}
                {filtered.map(v => {
                    const stats = dailyStats[v.device_id];
                    const isOverspeed = v.speed > 100;
                    const idleMinutes = v.state === 'idling'
                        ? Math.floor((Date.now() - v.stateStartTime.getTime()) / 60000)
                        : 0;
                    const isLongIdle = v.state === 'idling' && idleMinutes >= 3;

                    const alertBorderClass = isOverspeed
                        ? 'border-l-4 border-l-red-500 bg-red-950/20 ring-1 ring-inset ring-red-500/60 animate-pulse'
                        : isLongIdle
                            ? 'border-l-4 border-l-amber-500 bg-amber-950/15 ring-1 ring-inset ring-amber-500/50 animate-pulse'
                            : selectedId === v.id
                                ? 'bg-zinc-800/80 border-l-4 border-l-blue-500'
                                : 'hover:bg-zinc-800/40';

                    return (
                        <div
                            key={v.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectVehicle(v.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') handleSelectVehicle(v.id);
                            }}
                            className={`w-full text-left p-3 transition-colors relative cursor-pointer ${alertBorderClass}`}
                        >
                            {/* Option 22: Blinking Visual Alert Banner (Overspeed > 100 km/h or Idling >= 3 min) */}
                            {isOverspeed && (
                                <div className="mb-1.5 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-300 text-[9px] font-bold flex items-center justify-between animate-pulse">
                                    <span className="flex items-center gap-1">
                                        <AlertTriangle size={10} className="text-red-400 shrink-0" />
                                        EXCÈS DE VITESSE (&gt; 100 km/h)
                                    </span>
                                    <span className="font-mono">{v.speed.toFixed(0)} km/h</span>
                                </div>
                            )}
                            {!isOverspeed && isLongIdle && (
                                <div className="mb-1.5 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[9px] font-bold flex items-center justify-between animate-pulse">
                                    <span className="flex items-center gap-1">
                                        <AlertTriangle size={10} className="text-amber-400 shrink-0" />
                                        RALENTI PROLONGÉ
                                    </span>
                                    <span className="font-mono">{idleMinutes} min</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stateColor(v.state) }} />
                                    <span className="font-semibold text-white text-xs md:text-sm truncate max-w-[140px] md:max-w-[160px]">{v.name}</span>
                                </div>
                                <span
                                    className="text-[9px] md:text-[10px] font-bold px-1.5 py-0.2 rounded"
                                    style={{ color: stateColor(v.state), backgroundColor: `${stateColor(v.state)}15` }}
                                >
                                    {stateLabel(v.state)}
                                </span>
                            </div>

                            {/* Physical Street Address */}
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 truncate my-1">
                                <MapPin size={11} className="text-red-400 shrink-0" />
                                <span className="truncate" title={addresses[v.device_id] || `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`}>
                                    {addresses[v.device_id] || `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`}
                                </span>
                            </div>

                            {/* Compact Telemetry Grid (Row 1: Live Speed | State Duration [Option 1] | Engine) + (Row 2: Today Km [Option 2] | Waste MAD [Option 3] | Max Speed [Option 6]) */}
                            <div className="bg-zinc-950/40 p-1.5 rounded border border-zinc-800/60 mt-1.5 space-y-1.5">
                                <div className="grid grid-cols-3 gap-1 text-[10px] text-zinc-400">
                                    <div className="flex items-center gap-1">
                                        <Gauge size={11} className="text-blue-400 shrink-0" />
                                        <span className="font-mono text-zinc-200">{v.speed.toFixed(0)} <span className="text-[8px] text-zinc-500">km/h</span></span>
                                    </div>

                                    {/* Option 1: Durée de l'état actuel (replaces 100% battery) */}
                                    <div className="flex items-center gap-1" title="Durée dans l'état actuel">
                                        <Clock size={11} className="shrink-0" style={{ color: stateColor(v.state) }} />
                                        <span className="font-mono text-zinc-200 truncate">{formatStateDuration(v.stateStartTime)}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Key size={11} className={v.acc_status ? 'text-emerald-400 shrink-0' : 'text-zinc-600 shrink-0'} />
                                        <span className={`text-[9px] ${v.acc_status ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            {v.acc_status ? 'ENG ON' : 'ENG OFF'}
                                        </span>
                                    </div>
                                </div>

                                {/* Row 2: Daily Metrics (Option 2: Distance km | Option 3: Fuel Waste MAD | Option 6: Max Speed) */}
                                <div className="grid grid-cols-3 gap-1 text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/50">
                                    <div className="flex items-center gap-1" title="Distance parcourue aujourd'hui">
                                        <Route size={11} className="text-sky-400 shrink-0" />
                                        <span className="font-mono text-zinc-200 truncate">
                                            {(stats?.distanceKm ?? 0).toFixed(1)} <span className="text-[8px] text-zinc-500">km</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1" title="Gaspillage / Ralenti aujourd'hui (MAD)">
                                        <Fuel size={11} className="text-amber-400 shrink-0" />
                                        <span className="font-mono text-amber-300 truncate">
                                            {stats?.wasteMad ?? 0} <span className="text-[8px] text-amber-500/80">MAD</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1" title="Vitesse maximale aujourd'hui">
                                        <TrendingUp size={11} className="text-purple-400 shrink-0" />
                                        <span className="font-mono text-zinc-200 truncate">
                                            <span className="text-[8px] text-zinc-500 mr-0.5">Max</span>
                                            {Math.round(Math.max(stats?.maxSpeed ?? 0, v.speed < 220 ? v.speed : 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Row: Last Update | Option 14: Replay Button */}
                            <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-1.5 px-0.5">
                                <div className="flex items-center gap-2">
                                    {v.plate_number && (
                                        <span className="font-mono text-zinc-400">{v.plate_number}</span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Clock size={9} />
                                        {timeSince(v.lastUpdate)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/dashboard/history?device=${encodeURIComponent(v.device_id)}`);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-semibold text-[9px] transition-colors"
                                    title="Ouvrir le Replay / Historique du jour"
                                >
                                    <History size={10} />
                                    <span>Replay</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

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
            {/* ── Left Fleet Sidebar (Collapsible on Desktop & Mobile) ── */}
            {fleetOpen && (
                <>
                    {/* Desktop Sidebar */}
                    <div className="hidden md:flex md:w-80 h-full border-r border-zinc-800 flex-col z-10 shrink-0 shadow-2xl transition-all duration-300">
                        {renderFleetList()}
                    </div>
                    {/* Mobile Slide-Over Drawer */}
                    <div className="fixed inset-0 z-[600] flex md:hidden animate-in fade-in duration-200">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setFleetOpen(false)} />
                        <div className="relative w-80 max-w-[85vw] h-full z-10 flex flex-col shadow-2xl border-r border-zinc-800 animate-in slide-in-from-left duration-200">
                            {renderFleetList()}
                        </div>
                    </div>
                </>
            )}

            {/* ── Main Google Maps Area ── */}
            <div className="relative flex-1 h-full">
                {/* Floating Fleet Reopen Trigger Button (When Fleet Menu is Hidden) */}
                {!fleetOpen && (
                    <button
                        onClick={() => setFleetOpen(true)}
                        className="absolute top-3 left-3 z-[400] bg-zinc-900/95 border border-zinc-700 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur hover:bg-zinc-800 transition-colors"
                        title="Show Fleet List"
                    >
                        <Car size={13} className="text-blue-400" />
                        <span>Fleet</span>
                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">{vehicleList.length}</span>
                        <ChevronRight size={13} className="text-zinc-400" />
                    </button>
                )}

                {/* Map Controls Header Overlay (Responsive) */}
                <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 max-w-[calc(100vw-110px)] overflow-x-auto no-scrollbar">
                    {/* Google Address Search Form */}
                    <form onSubmit={handleSearchAddress} className="relative hidden lg:block">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search any address..."
                            value={mapSearch}
                            onChange={e => setMapSearch(e.target.value)}
                            className="bg-zinc-900/95 border border-zinc-700 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-44 shadow-xl backdrop-blur"
                        />
                    </form>

                    {/* Satellite On / Off Toggle */}
                    <button
                        onClick={() => setMapType(prev => prev === 'hybrid' ? 'roadmap' : 'hybrid')}
                        className={`px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg border shadow-xl flex items-center gap-1.5 transition-colors ${
                            mapType === 'hybrid'
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                        }`}
                        title={mapType === 'hybrid' ? 'Satellite: ON (Click to switch to Map)' : 'Satellite: OFF (Click to switch to Satellite)'}
                    >
                        <Layers size={12} />
                        <span>Satellite</span>
                    </button>

                    {/* Traffic Layer Toggle */}
                    <button
                        onClick={() => setShowTraffic(prev => !prev)}
                        className={`px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg border shadow-xl flex items-center gap-1.5 transition-colors ${
                            showTraffic
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-900/30'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                        }`}
                        title={showTraffic ? 'Trafic en direct : ACTIVÉ (Cliquer pour masquer)' : 'Trafic en direct : DÉSACTIVÉ (Cliquer pour afficher)'}
                    >
                        <div className="flex items-center gap-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${showTraffic ? 'bg-red-400 animate-pulse' : 'bg-zinc-500'}`} />
                            <span className={`w-1.5 h-1.5 rounded-full ${showTraffic ? 'bg-amber-400' : 'bg-zinc-500'}`} />
                            <span className={`w-1.5 h-1.5 rounded-full ${showTraffic ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                        </div>
                        <span>Trafic</span>
                    </button>

                    {/* Follow Mode Toggle */}
                    {selectedId && (
                        <button
                            onClick={() => setFollowMode(f => !f)}
                            className={`px-2 md:px-3 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg border shadow-xl flex items-center gap-1 transition-colors ${
                                followMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                            }`}
                            title="Follow Vehicle"
                        >
                            <Navigation size={12} className={followMode ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline">{followMode ? 'Following' : 'Follow'}</span>
                        </button>
                    )}

                    {/* Provider Switcher */}
                    {onSwitchToLeaflet && (
                        <button
                            onClick={onSwitchToLeaflet}
                            className="px-2 md:px-3 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-xl flex items-center gap-1"
                            title="Switch to OpenStreetMap"
                        >
                            <Globe size={12} className="text-blue-400" />
                            <span className="hidden sm:inline">OSM</span>
                        </button>
                    )}

                    {/* Toggle Vehicle Labels */}
                    <button
                        onClick={() => setShowMapLabels(prev => !prev)}
                        className={`px-2 md:px-2.5 py-1.5 text-[11px] md:text-xs font-semibold rounded-lg border shadow-xl flex items-center gap-1 transition-colors ${
                            showMapLabels ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                        }`}
                        title="Toggle vehicle label on map"
                    >
                        <Tag size={12} />
                        <span className="hidden sm:inline">Labels</span>
                    </button>
                </div>

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
                        styles: GOOGLE_MAP_STYLES
                    }}
                >
                    {/* Real-time Google Traffic Layer */}
                    {showTraffic && <TrafficLayer />}

                    {/* Render Real Directional Vehicle Markers with Fixed Labels & Small State Icon */}
                    {Object.values(vehicles).filter(v => v.lat && v.lng).map(v => (
                        <Marker
                            key={v.id}
                            position={{ lat: v.lat, lng: v.lng }}
                            onClick={() => handleSelectVehicle(v.id, false)}
                            icon={getGoogleVehicleIcon(v.name || v.device_id, v.state, v.course, v.id === selectedId)}
                        />
                    ))}

                    {/* Compact Dark InfoWindow for Selected Vehicle */}
                    {selectedVehicle && showMapLabels && (
                        <InfoWindow
                            position={{ lat: selectedVehicle.lat, lng: selectedVehicle.lng }}
                            onCloseClick={() => setShowMapLabels(false)}
                            options={{
                                pixelOffset: new google.maps.Size(0, -22),
                                disableAutoPan: true
                            }}
                        >
                            <div className="text-white text-xs font-sans min-w-[130px] max-w-[200px]">
                                <div className="flex items-center justify-between gap-1 pb-1 border-b border-zinc-800">
                                    <span className="font-bold text-white text-xs truncate">{selectedVehicle.name}</span>
                                    <span
                                        className="text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0"
                                        style={{ color: stateColor(selectedVehicle.state), backgroundColor: `${stateColor(selectedVehicle.state)}20` }}
                                    >
                                        {stateLabel(selectedVehicle.state)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-1 text-[11px]">
                                    <span className="text-blue-400 font-mono font-bold">{selectedVehicle.speed.toFixed(0)} km/h</span>
                                    <span className={selectedVehicle.acc_status ? 'text-emerald-400 text-[10px] font-semibold' : 'text-zinc-500 text-[10px]'}>
                                        {selectedVehicle.acc_status ? 'ENG ON' : 'ENG OFF'}
                                    </span>
                                </div>
                                {addresses[selectedVehicle.device_id] && (
                                    <div className="text-[9px] text-zinc-400 truncate pt-1 flex items-center gap-1">
                                        <MapPin size={9} className="text-red-400 shrink-0" />
                                        <span className="truncate">{addresses[selectedVehicle.device_id]}</span>
                                    </div>
                                )}
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>

                {/* Custom Map Zoom Controls (Desktop only, mobile has pinch-to-zoom) */}
                <div className="hidden md:flex absolute bottom-8 right-4 z-[400] flex-col gap-1">
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

                {/* ── Bottom Telemetry & 2-Way Command Deck (Fully Mobile Responsive) ── */}
                {selectedVehicle && (
                    <>
                        {/* Floating Reopen Pill when Telemetry is Hidden */}
                        {!telemetryOpen && (
                            <button
                                onClick={() => setTelemetryOpen(true)}
                                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] bg-zinc-900/95 border border-zinc-700 text-white px-3.5 py-1.5 rounded-full shadow-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur hover:bg-zinc-800 transition-colors animate-in fade-in"
                                title="Show vehicle telemetry"
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stateColor(selectedVehicle.state) }} />
                                <span>{selectedVehicle.name}</span>
                                <span className="text-[10px] text-blue-400 font-mono font-bold">{selectedVehicle.speed.toFixed(0)} km/h</span>
                                <ChevronUp size={14} className="text-zinc-400" />
                            </button>
                        )}

                        {/* Full Telemetry Card */}
                        <div className={`absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-16 z-[400] bg-zinc-900/95 border border-zinc-800 backdrop-blur rounded-2xl shadow-2xl p-3 md:p-4 transition-all duration-200 ${!telemetryOpen ? 'hidden' : 'block animate-in fade-in slide-in-from-bottom-2'}`}>
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
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/dashboard/history?device=${encodeURIComponent(selectedVehicle.device_id)}`)}
                                            className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold border border-blue-500/30"
                                            title="Ouvrir le Replay / Historique du jour"
                                        >
                                            <History size={13} />
                                            <span className="hidden sm:inline">Replay</span>
                                        </button>

                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${selectedVehicle.lat},${selectedVehicle.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors hidden sm:flex items-center gap-1 text-[11px] border border-zinc-800/80"
                                            title="Open vehicle location in Google Maps"
                                        >
                                            <ExternalLink size={13} className="text-blue-400" />
                                            <span className="hidden lg:inline text-zinc-300">Google Maps</span>
                                        </a>

                                        <div className="text-right">
                                            <span className="text-sm md:text-base font-bold font-mono text-blue-400 block leading-tight">
                                                {selectedVehicle.speed.toFixed(1)} <span className="text-[9px] text-zinc-500 font-normal">km/h</span>
                                            </span>
                                            <span className="text-[9px] text-zinc-400">{timeSince(selectedVehicle.lastUpdate)}</span>
                                        </div>

                                        {/* Minimize / Close Telemetry Buttons (Desktop & Mobile) */}
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
                            <div className="grid grid-cols-5 gap-1.5 text-center">
                                <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40">
                                    <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">Engine</span>
                                    <span className={`text-[11px] font-bold ${selectedVehicle.acc_status ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                        {selectedVehicle.acc_status ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                                <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40">
                                    <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">Durée État</span>
                                    <span className="text-[11px] font-bold font-mono" style={{ color: stateColor(selectedVehicle.state) }}>
                                        {formatStateDuration(selectedVehicle.stateStartTime)}
                                    </span>
                                </div>
                                <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40">
                                    <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">Distance (Jour)</span>
                                    <span className="text-[11px] font-bold font-mono text-sky-400">
                                        {(dailyStats[selectedVehicle.device_id]?.distanceKm ?? 0).toFixed(1)} km
                                    </span>
                                </div>
                                <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40">
                                    <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">Ralenti (MAD)</span>
                                    <span className="text-[11px] font-bold font-mono text-amber-400">
                                        {dailyStats[selectedVehicle.device_id]?.wasteMad ?? 0} MAD
                                    </span>
                                </div>
                                <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/40">
                                    <span className="text-[8px] md:text-[9px] text-zinc-500 uppercase block font-semibold">Vitesse Max</span>
                                    <span className="text-[11px] font-bold font-mono text-purple-400">
                                        {Math.round(Math.max(dailyStats[selectedVehicle.device_id]?.maxSpeed ?? 0, selectedVehicle.speed < 220 ? selectedVehicle.speed : 0))} km/h
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
