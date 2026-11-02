"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { MapContainer, TileLayer, Polyline as LeafletPolyline, CircleMarker, Marker as LeafletMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, Globe, Navigation, Clock, Gauge, Play, MapPin, ExternalLink, Search, X } from 'lucide-react';

interface Position {
    id: number;
    lat: number;
    lng: number;
    speed: number;
    course: number;
    timestamp: string;
}

interface RouteSegment {
    passLevel: number;
    color: string;
    weight: number;
    zIndex: number;
    googlePath: { lat: number; lng: number }[];
    leafletPath: [number, number][];
}

const PASS_STYLES: { color: string; weight: number; zIndex: number; label: string }[] = [
    { color: '#2563eb', weight: 6, zIndex: 10, label: 'Aller (1er passage)' },
    { color: '#f97316', weight: 4, zIndex: 20, label: 'Retour (2e passage)' },
    { color: '#a855f7', weight: 3.5, zIndex: 30, label: '3e passage' },
    { color: '#ec4899', weight: 3, zIndex: 40, label: '4e passage+' },
];

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildColoredRouteSegments(history: Position[]): { segments: RouteSegment[]; maxPassLevel: number } {
    if (history.length < 2) return { segments: [], maxPassLevel: 0 };

    const n = history.length;
    const cumDist = new Float64Array(n);
    for (let i = 1; i < n; i++) {
        cumDist[i] = cumDist[i - 1] + haversineMeters(
            history[i - 1].lat,
            history[i - 1].lng,
            history[i].lat,
            history[i].lng
        );
    }

    // Detect how many times each segment [i-1 -> i] overlaps an earlier corridor (>= 220m of driving earlier, within 95m radius)
    const rawPass = new Int8Array(n);
    for (let i = 1; i < n; i++) {
        let passes = 0;
        let lastMatchedDist = -1000;
        const pLat = (history[i - 1].lat + history[i].lat) / 2;
        const pLng = (history[i - 1].lng + history[i].lng) / 2;

        for (let j = 0; j < i; j++) {
            if (cumDist[i] - cumDist[j] < 220) break;
            if (cumDist[j] - lastMatchedDist < 220) continue;
            const d = haversineMeters(pLat, pLng, history[j].lat, history[j].lng);
            if (d <= 95) {
                passes++;
                lastMatchedDist = cumDist[j];
                if (passes >= 3) break;
            }
        }
        rawPass[i] = Math.min(3, passes);
    }

    // Smooth short gaps (< 180m) so a return trip doesn't flicker at intersections
    const smoothedPass = new Int8Array(n);
    let activePass = 0;
    let holdUntilDist = -1;
    for (let i = 1; i < n; i++) {
        if (rawPass[i] > 0) {
            activePass = rawPass[i];
            holdUntilDist = cumDist[i] + 180;
            smoothedPass[i] = activePass;
        } else if (cumDist[i] <= holdUntilDist) {
            smoothedPass[i] = activePass;
        } else {
            activePass = 0;
            smoothedPass[i] = 0;
        }
    }

    // Group contiguous segments with the same passLevel
    const segments: RouteSegment[] = [];
    let maxPassLevel = 0;
    let curLevel = smoothedPass[1];
    let curPoints: Position[] = [history[0], history[1]];
    if (curLevel > maxPassLevel) maxPassLevel = curLevel;

    for (let i = 2; i < n; i++) {
        const lvl = smoothedPass[i];
        if (lvl > maxPassLevel) maxPassLevel = lvl;
        if (lvl === curLevel) {
            curPoints.push(history[i]);
        } else {
            const style = PASS_STYLES[Math.min(curLevel, PASS_STYLES.length - 1)];
            segments.push({
                passLevel: curLevel,
                color: style.color,
                weight: style.weight,
                zIndex: style.zIndex,
                googlePath: curPoints.map(p => ({ lat: p.lat, lng: p.lng })),
                leafletPath: curPoints.map(p => [p.lat, p.lng] as [number, number]),
            });
            curLevel = lvl;
            curPoints = [history[i - 1], history[i]];
        }
    }

    if (curPoints.length >= 2) {
        const style = PASS_STYLES[Math.min(curLevel, PASS_STYLES.length - 1)];
        segments.push({
            passLevel: curLevel,
            color: style.color,
            weight: style.weight,
            zIndex: style.zIndex,
            googlePath: curPoints.map(p => ({ lat: p.lat, lng: p.lng })),
            leafletPath: curPoints.map(p => [p.lat, p.lng] as [number, number]),
        });
    }

    return { segments, maxPassLevel };
}

export interface ParkingStop {
    index: number;
    lat: number;
    lng: number;
    startTime: string;
    endTime: string;
    durationSec: number;
    durationText: string;
    positionIndex: number;
}

interface HistoryMapProps {
    history: Position[];
    playIndex: number;
    parkings?: ParkingStop[];
    focusedParking?: ParkingStop | null;
}

const containerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 31.626829,
    lng: -8.003744
};

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["geometry"];

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

function generateParkingBadgeSvg(index: number, durationText: string, isSelected: boolean): { svg: string; width: number; height: number } {
    const pLabel = `P${index}`;
    const durLabel = durationText;
    const pWidth = Math.max(20, pLabel.length * 7 + 8);
    const durWidth = Math.max(30, durLabel.length * 6.5 + 12);
    const totalW = Math.round(pWidth + durWidth);
    const pillH = 20;
    const totalH = pillH + 7;
    const borderCol = isSelected ? '#38bdf8' : '#3b82f6';

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
      <rect x="0.5" y="0.5" width="${totalW - 1}" height="${pillH - 1}" rx="5" fill="#0f172a" fill-opacity="0.95" stroke="${borderCol}" stroke-width="${isSelected ? 1.8 : 1.2}"/>
      <rect x="1" y="1" width="${pWidth}" height="${pillH - 2}" rx="4" fill="#2563eb"/>
      <text x="${Math.round(pWidth / 2) + 1}" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">${pLabel}</text>
      <text x="${Math.round(pWidth + durWidth / 2)}" y="13.8" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="700" fill="#f8fafc" text-anchor="middle">${durLabel}</text>
      <path d="M ${Math.round(totalW / 2) - 4},${pillH} L ${Math.round(totalW / 2) + 4},${pillH} L ${Math.round(totalW / 2)},${totalH - 1} Z" fill="${borderCol}"/>
    </svg>`.trim();

    return { svg, width: totalW, height: totalH };
}

function getGoogleParkingIcon(index: number, durationText: string, isSelected: boolean): google.maps.Icon {
    const { svg, width, height } = generateParkingBadgeSvg(index, durationText, isSelected);
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: typeof google !== 'undefined' && google.maps?.Size ? new google.maps.Size(width, height) : undefined,
        anchor: typeof google !== 'undefined' && google.maps?.Point ? new google.maps.Point(Math.round(width / 2), height - 1) : undefined,
    };
}

function makeLeafletParkingIcon(index: number, durationText: string, isSelected = false) {
    const { svg, width, height } = generateParkingBadgeSvg(index, durationText, isSelected);
    return L.divIcon({ html: svg, className: '', iconSize: [width, height], iconAnchor: [Math.round(width / 2), height - 1] });
}

function generateVehicleMarkerSvg(state: string, course: number, isSelected: boolean): string {
    const selectedHalo = isSelected
        ? `<circle cx="18" cy="18" r="17" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-dasharray="3,2" opacity="0.95"/>`
        : '';

    if (state === 'moving') {
        return `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          ${selectedHalo}
          <g transform="rotate(${course || 0}, 18, 18)">
            <path d="M 18,5 L 28.5,31 L 18,25 L 7.5,31 Z" fill="#000000" fill-opacity="0.38"/>
            <circle cx="18" cy="18" r="15" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-width="1.2" stroke-dasharray="2,2"/>
            <path d="M 18,3.5 L 28,29.5 L 18,23.5 L 8,29.5 Z" fill="#22c55e" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
          </g>
        </svg>`.trim();
    }

    if (state === 'parked') {
        return `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          ${selectedHalo}
          <circle cx="18" cy="19.5" r="14" fill="#000000" fill-opacity="0.35"/>
          <circle cx="18" cy="18" r="14" fill="#1d4ed8" stroke="#ffffff" stroke-width="2.2"/>
          <circle cx="18" cy="18" r="11" fill="#2563eb"/>
          <text x="18" y="23" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">P</text>
        </svg>`.trim();
    }

    if (state === 'idling') {
        return `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          ${selectedHalo}
          <circle cx="18" cy="19.5" r="14" fill="#000000" fill-opacity="0.35"/>
          <circle cx="18" cy="18" r="14" fill="#b45309" stroke="#ffffff" stroke-width="2.2"/>
          <circle cx="18" cy="18" r="11" fill="#f59e0b"/>
          <g transform="translate(18, 18) scale(0.62) translate(-18, -18)">
            <circle cx="13" cy="13" r="4.5" fill="none" stroke="#ffffff" stroke-width="2.6"/>
            <path d="M16.5 16.5 L26 26 M22.5 22.5 L25 25 M20 25 L22.5 27.5" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none"/>
          </g>
        </svg>`.trim();
    }

    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      ${selectedHalo}
      <circle cx="18" cy="19.5" r="13" fill="#000000" fill-opacity="0.3"/>
      <circle cx="18" cy="18" r="13" fill="#334155" stroke="#ffffff" stroke-width="2"/>
      <circle cx="18" cy="18" r="10" fill="#64748b"/>
      <circle cx="18" cy="18" r="3" fill="#ffffff"/>
    </svg>`.trim();
}

function getGoogleVehicleIcon(state: string, course: number, isSelected: boolean): google.maps.Icon {
    const svg = generateVehicleMarkerSvg(state, course, isSelected);
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: typeof google !== 'undefined' && google.maps?.Size ? new google.maps.Size(36, 36) : undefined,
        anchor: typeof google !== 'undefined' && google.maps?.Point ? new google.maps.Point(18, 18) : undefined,
    };
}

function makeLeafletCarIcon(course: number, isMoving: boolean = true) {
    const state = isMoving ? 'moving' : 'parked';
    const svg = generateVehicleMarkerSvg(state, course, true);
    return L.divIcon({ html: svg, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
}

function LeafletFitRoute({ positions }: { positions: Position[] }) {
    const map = useMap();
    const prevLen = useRef(0);
    useEffect(() => {
        if (positions.length > 1 && positions.length !== prevLen.current) {
            prevLen.current = positions.length;
            map.fitBounds(positions.map(p => [p.lat, p.lng] as [number, number]), { padding: [40, 40] });
        }
    }, [positions, map]);
    return null;
}

export default function HistoryMap({ history, playIndex, parkings = [], focusedParking = null }: HistoryMapProps) {
    // Default engine: Google Maps
    const [engine, setEngine] = useState<'google' | 'leaflet'>('google');
    const [googleMapType, setGoogleMapType] = useState<google.maps.MapTypeId | 'hybrid' | 'roadmap' | 'satellite' | 'terrain'>('hybrid');
    const [leafletTileLayer, setLeafletTileLayer] = useState<'street' | 'satellite'>('street');
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<Position | null>(null);
    const [selectedParking, setSelectedParking] = useState<ParkingStop | null>(null);

    // Reverse Geocoded Address State
    const [pointAddress, setPointAddress] = useState<string | null>(null);
    const [addressLoading, setAddressLoading] = useState(false);
    const addressCache = useRef<Record<string, string>>({});
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const [mapSearch, setMapSearch] = useState('');

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCnQRiDe3A6Rs9kKAOYJmA4OrOqz8_y7kM",
        region: "MA",
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    const resolvePointAddress = useCallback((lat: number, lng: number) => {
        const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (addressCache.current[cacheKey]) {
            setPointAddress(addressCache.current[cacheKey]);
            return;
        }

        if (engine === 'google' && isLoaded && window.google?.maps) {
            if (!geocoderRef.current) {
                geocoderRef.current = new google.maps.Geocoder();
            }
            setAddressLoading(true);
            geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
                setAddressLoading(false);
                if (status === 'OK' && results && results.length > 0) {
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
                    setPointAddress(cleanAddress);
                } else {
                    setPointAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                }
            });
        } else {
            // Leaflet fallback reverse geocoding via OpenStreetMap
            setAddressLoading(true);
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
                .then(res => res.json())
                .then(data => {
                    setAddressLoading(false);
                    if (data && data.display_name) {
                        addressCache.current[cacheKey] = data.display_name;
                        setPointAddress(data.display_name);
                    } else {
                        setPointAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                    }
                })
                .catch(() => {
                    setAddressLoading(false);
                    setPointAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                });
        }
    }, [engine, isLoaded]);

    // Auto resolve address when selectedPoint or selectedParking changes
    useEffect(() => {
        if (selectedParking) {
            resolvePointAddress(selectedParking.lat, selectedParking.lng);
        } else if (selectedPoint) {
            resolvePointAddress(selectedPoint.lat, selectedPoint.lng);
        } else {
            setPointAddress(null);
        }
    }, [selectedPoint, selectedParking, resolvePointAddress]);

    // When focusedParking is clicked from the sidebar list, pan & zoom to it and open its InfoWindow
    useEffect(() => {
        if (focusedParking) {
            setSelectedPoint(null);
            setSelectedParking(focusedParking);
            if (map) {
                map.panTo({ lat: focusedParking.lat, lng: focusedParking.lng });
                map.setZoom(17);
            }
        }
    }, [focusedParking, map]);

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

    const current = history[playIndex] || null;
    const start = history[0] || null;
    const end = history.length > 1 ? history[history.length - 1] : null;

    // Build multi-color route segments (Aller = Blue, Retour / duplicate pass = Orange, 3rd pass = Purple)
    const { segments: coloredSegments, maxPassLevel } = useMemo(() => {
        return buildColoredRouteSegments(history);
    }, [history]);


    // Fit Google Maps bounds when history changes
    useEffect(() => {
        if (map && history.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            history.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
            if (history.length === 1) {
                map.setCenter({ lat: history[0].lat, lng: history[0].lng });
                map.setZoom(16);
            } else {
                map.fitBounds(bounds, 50);
            }
        }
    }, [map, history]);

    // When current playing point moves, pan Google Map if near edge
    useEffect(() => {
        if (map && current && playIndex > 0) {
            // Keep map smoothly focused on current playback point
            map.panTo({ lat: current.lat, lng: current.lng });
        }
    }, [map, current, playIndex]);

    const onLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    const leafletTileUrl = leafletTileLayer === 'street'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    return (
        <div className="flex-1 relative min-h-0 h-full w-full bg-zinc-950 font-sans overflow-hidden">
            {/* ── Route Pass & Parking Color Legend (shown when route has points) ── */}
            {history.length > 1 && (
                <div className="absolute bottom-3 left-3 z-[400] bg-zinc-900/95 border border-zinc-700/80 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur flex flex-wrap items-center gap-3 text-[11px] text-zinc-200 pointer-events-none">
                    <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-3.5 h-1.5 rounded-full bg-[#2563eb]" />
                        <span>Aller</span>
                    </span>
                    {maxPassLevel >= 1 && (
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-3.5 h-1.5 rounded-full bg-[#f97316]" />
                            <span>Retour</span>
                        </span>
                    )}
                    {maxPassLevel >= 2 && (
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-3.5 h-1.5 rounded-full bg-[#a855f7]" />
                            <span>3e passage</span>
                        </span>
                    )}
                    {maxPassLevel >= 3 && (
                        <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-3.5 h-1.5 rounded-full bg-[#ec4899]" />
                            <span>4e+</span>
                        </span>
                    )}
                    {parkings.length > 0 && (
                        <span className="flex items-center gap-1.5 font-medium pl-1 border-l border-zinc-700">
                            <span className="px-1 py-0.2 rounded bg-blue-600 text-white text-[9px] font-black leading-none">P</span>
                            <span>Parkings ({parkings.length})</span>
                        </span>
                    )}
                </div>
            )}

            {/* ── Top Header Controls Overlay ── */}
            <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
                {engine === 'google' && isLoaded && (
                    <>
                        {/* Search Location Bar */}
                        <form onSubmit={handleSearchAddress} className="relative hidden md:block">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search location..."
                                value={mapSearch}
                                onChange={e => setMapSearch(e.target.value)}
                                className="bg-zinc-900/95 border border-zinc-700 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-36 shadow-xl backdrop-blur"
                            />
                        </form>

                        {/* Satellite On / Off Toggle (Google) */}
                        <button
                            onClick={() => setGoogleMapType(prev => prev === 'hybrid' ? 'roadmap' : 'hybrid')}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-xl flex items-center gap-1.5 transition-colors ${
                                googleMapType === 'hybrid'
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                            }`}
                            title={googleMapType === 'hybrid' ? 'Satellite: ON (Click to switch to Map)' : 'Satellite: OFF (Click to switch to Satellite)'}
                        >
                            <Layers size={13} />
                            <span>Satellite</span>
                        </button>
                    </>
                )}

                {engine === 'leaflet' && (
                    <button
                        onClick={() => setLeafletTileLayer(prev => prev === 'satellite' ? 'street' : 'satellite')}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-xl flex items-center gap-1.5 transition-colors ${
                            leafletTileLayer === 'satellite'
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
                        }`}
                        title={leafletTileLayer === 'satellite' ? 'Satellite: ON (Click to switch to Street)' : 'Satellite: OFF (Click to switch to Satellite)'}
                    >
                        <Layers size={13} />
                        <span>Satellite</span>
                    </button>
                )}

                {/* Engine Switcher */}
                <button
                    onClick={() => setEngine(e => e === 'google' ? 'leaflet' : 'google')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-xl flex items-center gap-1.5"
                    title={engine === 'google' ? 'Switch to OpenStreetMap' : 'Switch to Google Maps'}
                >
                    <Globe size={13} className={engine === 'google' ? 'text-red-400' : 'text-blue-400'} />
                    {engine === 'google' ? 'Google Maps' : 'OpenStreetMap'}
                </button>
            </div>

            {/* Empty State Banner */}
            {history.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-20 pointer-events-none backdrop-blur-xs">
                    <div className="text-center text-zinc-400 p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl">
                        <div className="text-4xl mb-3">🗺️</div>
                        <h3 className="font-bold text-white text-sm mb-1">No Route Selected</h3>
                        <p className="text-xs text-zinc-400">Select a vehicle and date range on the left, then click Fetch History</p>
                    </div>
                </div>
            )}

            {/* ── Google Maps Engine ── */}
            {engine === 'google' && (
                <>
                    {loadError ? (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950 text-red-400 p-6">
                            <p className="font-semibold mb-2">Google Maps failed to load</p>
                            <button
                                onClick={() => setEngine('leaflet')}
                                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
                            >
                                Switch to OpenStreetMap
                            </button>
                        </div>
                    ) : !isLoaded ? (
                        <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-400">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs">Loading Google Maps...</span>
                            </div>
                        </div>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={defaultCenter}
                            zoom={13}
                            onLoad={onLoad}
                            onUnmount={onUnmount}
                            mapTypeId={googleMapType}
                            options={{
                                disableDefaultUI: true,
                                zoomControl: true,
                                mapTypeControl: false,
                                streetViewControl: false,
                                fullscreenControl: false,
                                styles: GOOGLE_MAP_STYLES
                            }}
                        >
                            {/* Multi-Color Route Polylines (Blue = Aller, Orange = Retour/Duplicate, Purple = 3rd Pass) */}
                            {coloredSegments.map((seg, idx) => (
                                <Polyline
                                    key={`g-seg-${idx}`}
                                    path={seg.googlePath}
                                    options={{
                                        strokeColor: seg.color,
                                        strokeOpacity: seg.passLevel === 0 ? 0.88 : 0.95,
                                        strokeWeight: seg.weight,
                                        zIndex: seg.zIndex,
                                        icons: typeof google !== 'undefined' && google.maps?.SymbolPath ? [
                                            {
                                                icon: {
                                                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                                    scale: 2,
                                                    strokeColor: '#ffffff',
                                                    strokeWeight: 0.8,
                                                    fillColor: seg.color,
                                                    fillOpacity: 1,
                                                },
                                                offset: '60px',
                                                repeat: '160px',
                                            }
                                        ] : undefined,
                                    }}
                                />
                            ))}

                            {/* Start Pin (Green) */}
                            {start && (
                                <Marker
                                    position={{ lat: start.lat, lng: start.lng }}
                                    title="Trip Start"
                                    onClick={() => { setSelectedParking(null); setSelectedPoint(start); }}
                                    icon={{
                                        path: google.maps.SymbolPath.CIRCLE,
                                        scale: 9,
                                        fillColor: "#22c55e",
                                        fillOpacity: 1,
                                        strokeColor: "#ffffff",
                                        strokeWeight: 2.5
                                    }}
                                />
                            )}

                            {/* End Pin (Red) */}
                            {end && end !== start && (
                                <Marker
                                    position={{ lat: end.lat, lng: end.lng }}
                                    title="Trip End"
                                    onClick={() => { setSelectedParking(null); setSelectedPoint(end); }}
                                    icon={{
                                        path: google.maps.SymbolPath.CIRCLE,
                                        scale: 9,
                                        fillColor: "#ef4444",
                                        fillOpacity: 1,
                                        strokeColor: "#ffffff",
                                        strokeWeight: 2.5
                                    }}
                                />
                            )}

                            {/* Parking Stop Markers with Duration Pill (P1 25m, P2 1h 10m...) */}
                            {parkings.map(pStop => (
                                <Marker
                                    key={`g-park-${pStop.index}`}
                                    position={{ lat: pStop.lat, lng: pStop.lng }}
                                    title={`Parking #${pStop.index} (${pStop.durationText})`}
                                    zIndex={80 + pStop.index}
                                    onClick={() => {
                                        setSelectedPoint(null);
                                        setSelectedParking(pStop);
                                    }}
                                    icon={getGoogleParkingIcon(pStop.index, pStop.durationText, selectedParking?.index === pStop.index)}
                                />
                            ))}

                            {/* Moving Playback Marker (Dynamic Directional Arrow or Parked Badge) */}
                            {current && playIndex > 0 && (
                                <Marker
                                    position={{ lat: current.lat, lng: current.lng }}
                                    onClick={() => { setSelectedParking(null); setSelectedPoint(current); }}
                                    zIndex={120}
                                    icon={getGoogleVehicleIcon(
                                        current.speed > 3 ? 'moving' : 'parked',
                                        current.course || 0,
                                        true
                                    )}
                                />
                            )}

                            {/* Parking Stop InfoWindow */}
                            {selectedParking && (
                                <InfoWindow
                                    position={{ lat: selectedParking.lat, lng: selectedParking.lng }}
                                    onCloseClick={() => setSelectedParking(null)}
                                    options={{ pixelOffset: new google.maps.Size(0, -24) }}
                                >
                                    <div className="bg-zinc-900 text-white rounded-lg p-2.5 min-w-[210px] max-w-[280px] border border-zinc-800 shadow-xl font-sans">
                                        <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-zinc-800">
                                            <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-black">P{selectedParking.index}</span>
                                                <span>Parking #{selectedParking.index}</span>
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold">
                                                    {selectedParking.durationText}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedParking(null)}
                                                    className="p-0.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                                                    title="Fermer"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Physical Street Address */}
                                        <div className="flex items-start gap-1 text-[10px] text-zinc-300 pb-1.5 mb-1.5 border-b border-zinc-800">
                                            <MapPin size={11} className="text-red-400 shrink-0 mt-0.5" />
                                            <span className="leading-tight text-white font-medium">
                                                {addressLoading && !pointAddress ? "Resolving street address..." : (pointAddress || `${selectedParking.lat.toFixed(5)}, ${selectedParking.lng.toFixed(5)}`)}
                                            </span>
                                        </div>

                                        <div className="text-[11px] text-zinc-300 space-y-0.5">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Arrivée :</span>
                                                <span className="font-mono text-zinc-200">{new Date(selectedParking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Départ :</span>
                                                <span className="font-mono text-zinc-200">{new Date(selectedParking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Durée totale :</span>
                                                <span className="font-mono text-blue-400 font-bold">{selectedParking.durationText}</span>
                                            </div>
                                        </div>

                                        {/* Direct Google Maps Link */}
                                        <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-end">
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${selectedParking.lat},${selectedParking.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold transition-colors"
                                            >
                                                <span>Open in Google Maps</span>
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    </div>
                                </InfoWindow>
                            )}

                            {/* Point Info Window */}
                            {selectedPoint && !selectedParking && (
                                <InfoWindow
                                    position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
                                    onCloseClick={() => setSelectedPoint(null)}
                                    options={{ pixelOffset: new google.maps.Size(0, -20) }}
                                >
                                    <div className="bg-zinc-900 text-white rounded-lg p-2.5 min-w-[200px] max-w-[280px] border border-zinc-800 shadow-xl font-sans">
                                        <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-zinc-800">
                                            <span className="font-bold text-xs text-white">
                                                {selectedPoint === start ? '🟢 Trip Start' : (selectedPoint === end && end !== start ? '🔴 Trip End' : (selectedPoint === current ? '🚗 Replay Position' : '📍 Route Point'))}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedPoint.speed.toFixed(1)} km/h</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedPoint(null)}
                                                    className="p-0.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                                                    title="Fermer"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Physical Street Address */}
                                        <div className="flex items-start gap-1 text-[10px] text-zinc-300 pb-1.5 mb-1.5 border-b border-zinc-800">
                                            <MapPin size={11} className="text-red-400 shrink-0 mt-0.5" />
                                            <span className="leading-tight text-white font-medium">
                                                {addressLoading && !pointAddress ? "Resolving street address..." : (pointAddress || `${selectedPoint.lat.toFixed(5)}, ${selectedPoint.lng.toFixed(5)}`)}
                                            </span>
                                        </div>

                                        <div className="text-[11px] text-zinc-300 space-y-0.5">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Time:</span>
                                                <span className="font-mono text-zinc-200">{new Date(selectedPoint.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Date:</span>
                                                <span className="text-zinc-200">{new Date(selectedPoint.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Coordinates:</span>
                                                <span className="text-zinc-400 font-mono text-[10px]">{selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}</span>
                                            </div>
                                        </div>

                                        {/* Direct Google Maps Link */}
                                        <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-end">
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${selectedPoint.lat},${selectedPoint.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold transition-colors"
                                            >
                                                <span>Open in Google Maps</span>
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    </div>
                                </InfoWindow>
                            )}
                        </GoogleMap>
                    )}
                </>
            )}

            {/* ── Leaflet OpenStreetMap Engine ── */}
            {engine === 'leaflet' && (
                <MapContainer
                    center={[31.6268, -8.0037]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                >
                    <TileLayer
                        url={leafletTileUrl}
                        attribution='&copy; OpenStreetMap contributors / Esri'
                    />
                    <LeafletFitRoute positions={history} />

                    {coloredSegments.map((seg, idx) => (
                        <LeafletPolyline
                            key={`l-seg-${idx}`}
                            positions={seg.leafletPath}
                            color={seg.color}
                            weight={seg.weight}
                            opacity={seg.passLevel === 0 ? 0.88 : 0.95}
                        />
                    ))}

                    {parkings.map(pStop => (
                        <LeafletMarker
                            key={`l-park-${pStop.index}`}
                            position={[pStop.lat, pStop.lng]}
                            icon={makeLeafletParkingIcon(pStop.index, pStop.durationText, selectedParking?.index === pStop.index)}
                            eventHandlers={{
                                click: () => {
                                    setSelectedPoint(null);
                                    setSelectedParking(pStop);
                                }
                            }}
                        >
                            <Popup>
                                <div className="text-xs text-zinc-900 font-sans min-w-[175px]">
                                    <div className="font-bold text-blue-600 mb-0.5">🅿️ Parking #{pStop.index} — {pStop.durationText}</div>
                                    <div className="text-[10px] text-zinc-600 mb-1 leading-tight">
                                        {pointAddress || `${pStop.lat.toFixed(5)}, ${pStop.lng.toFixed(5)}`}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">
                                        {new Date(pStop.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {new Date(pStop.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="mt-1.5 pt-1 border-t border-zinc-200">
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${pStop.lat},${pStop.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 font-semibold flex items-center gap-1"
                                        >
                                            <span>Open in Google Maps</span>
                                            <ExternalLink size={9} />
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </LeafletMarker>
                    ))}

                    {start && (
                        <CircleMarker
                            center={[start.lat, start.lng]}
                            radius={8}
                            color="#22c55e"
                            fillColor="#22c55e"
                            fillOpacity={1}
                            weight={2}
                            eventHandlers={{ click: () => setSelectedPoint(start) }}
                        >
                            <Popup>
                                <div className="text-xs text-zinc-900 font-sans min-w-[170px]">
                                    <div className="font-bold text-emerald-600 mb-0.5">🟢 Trip Start</div>
                                    <div className="text-[10px] text-zinc-600 mb-1 leading-tight">
                                        {pointAddress || `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}`}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">{new Date(start.timestamp).toLocaleString()}</div>
                                    <div className="mt-1.5 pt-1 border-t border-zinc-200">
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${start.lat},${start.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 font-semibold flex items-center gap-1"
                                        >
                                            <span>Open in Google Maps</span>
                                            <ExternalLink size={9} />
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    )}

                    {end && end !== start && (
                        <CircleMarker
                            center={[end.lat, end.lng]}
                            radius={8}
                            color="#ef4444"
                            fillColor="#ef4444"
                            fillOpacity={1}
                            weight={2}
                            eventHandlers={{ click: () => setSelectedPoint(end) }}
                        >
                            <Popup>
                                <div className="text-xs text-zinc-900 font-sans min-w-[170px]">
                                    <div className="font-bold text-red-600 mb-0.5">🔴 Trip End</div>
                                    <div className="text-[10px] text-zinc-600 mb-1 leading-tight">
                                        {pointAddress || `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}`}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">{new Date(end.timestamp).toLocaleString()}</div>
                                    <div className="mt-1.5 pt-1 border-t border-zinc-200">
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${end.lat},${end.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 font-semibold flex items-center gap-1"
                                        >
                                            <span>Open in Google Maps</span>
                                            <ExternalLink size={9} />
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    )}

                    {current && playIndex > 0 && (
                        <LeafletMarker
                            position={[current.lat, current.lng]}
                            icon={makeLeafletCarIcon(current.course || 0, current.speed > 3)}
                            eventHandlers={{ click: () => setSelectedPoint(current) }}
                        >
                            <Popup>
                                <div className="text-xs text-zinc-900 font-sans min-w-[170px]">
                                    <div className="font-bold text-blue-600 mb-0.5">🚗 Replay Position</div>
                                    <div className="text-[10px] text-zinc-600 mb-1 leading-tight">
                                        {pointAddress || `${current.lat.toFixed(5)}, ${current.lng.toFixed(5)}`}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">{new Date(current.timestamp).toLocaleTimeString()} · {current.speed.toFixed(1)} km/h</div>
                                    <div className="mt-1.5 pt-1 border-t border-zinc-200">
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${current.lat},${current.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 font-semibold flex items-center gap-1"
                                        >
                                            <span>Open in Google Maps</span>
                                            <ExternalLink size={9} />
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </LeafletMarker>
                    )}
                </MapContainer>
            )}
        </div>
    );
}
