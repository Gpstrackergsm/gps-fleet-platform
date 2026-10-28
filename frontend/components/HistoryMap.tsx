"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { MapContainer, TileLayer, Polyline as LeafletPolyline, CircleMarker, Marker as LeafletMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, Globe, Navigation, Clock, Gauge, Play, MapPin, ExternalLink, Search } from 'lucide-react';

interface Position {
    id: number;
    lat: number;
    lng: number;
    speed: number;
    course: number;
    timestamp: string;
}

interface HistoryMapProps {
    history: Position[];
    playIndex: number;
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

export default function HistoryMap({ history, playIndex }: HistoryMapProps) {
    // Default engine: Google Maps
    const [engine, setEngine] = useState<'google' | 'leaflet'>('google');
    const [googleMapType, setGoogleMapType] = useState<google.maps.MapTypeId | 'hybrid' | 'roadmap' | 'satellite' | 'terrain'>('hybrid');
    const [leafletTileLayer, setLeafletTileLayer] = useState<'street' | 'satellite'>('street');
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<Position | null>(null);

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

    // Auto resolve address when selectedPoint changes
    useEffect(() => {
        if (selectedPoint) {
            resolvePointAddress(selectedPoint.lat, selectedPoint.lng);
        } else {
            setPointAddress(null);
        }
    }, [selectedPoint, resolvePointAddress]);

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

    // Convert history for Google Maps path
    const googlePath = useMemo(() => {
        return history.map(p => ({ lat: p.lat, lng: p.lng }));
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

    const leafletPositions = useMemo(() => {
        return history.map(p => [p.lat, p.lng] as [number, number]);
    }, [history]);

    const leafletTileUrl = leafletTileLayer === 'street'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    return (
        <div className="flex-1 relative min-h-0 h-full w-full bg-zinc-950 font-sans overflow-hidden">
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
                            {/* Full Route Polyline (Crisp Blue GPS Route) */}
                            {googlePath.length > 1 && (
                                <Polyline
                                    path={googlePath}
                                    options={{
                                        strokeColor: "#2563eb",
                                        strokeOpacity: 0.85,
                                        strokeWeight: 4,
                                    }}
                                />
                            )}

                            {/* Start Pin (Green) */}
                            {start && (
                                <Marker
                                    position={{ lat: start.lat, lng: start.lng }}
                                    title="Trip Start"
                                    onClick={() => setSelectedPoint(start)}
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
                                    onClick={() => setSelectedPoint(end)}
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

                            {/* Moving Playback Marker (Dynamic Directional Arrow or Parked Badge) */}
                            {current && playIndex > 0 && (
                                <Marker
                                    position={{ lat: current.lat, lng: current.lng }}
                                    onClick={() => setSelectedPoint(current)}
                                    zIndex={100}
                                    icon={getGoogleVehicleIcon(
                                        current.speed > 3 ? 'moving' : 'parked',
                                        current.course || 0,
                                        true
                                    )}
                                />
                            )}

                            {/* Point Info Window */}
                            {selectedPoint && (
                                <InfoWindow
                                    position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
                                    onCloseClick={() => setSelectedPoint(null)}
                                    options={{ pixelOffset: new google.maps.Size(0, -20) }}
                                >
                                    <div className="bg-zinc-900 text-white rounded-lg p-2.5 min-w-[200px] max-w-[280px] border border-zinc-800 shadow-xl font-sans">
                                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-zinc-800">
                                            <span className="font-bold text-xs text-white">
                                                {selectedPoint === start ? '🟢 Trip Start' : (selectedPoint === end && end !== start ? '🔴 Trip End' : (selectedPoint === current ? '🚗 Replay Position' : '📍 Route Point'))}
                                            </span>
                                            <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedPoint.speed.toFixed(1)} km/h</span>
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

                    {leafletPositions.length > 1 && (
                        <LeafletPolyline positions={leafletPositions} color="#2563eb" weight={4} opacity={0.85} />
                    )}

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
