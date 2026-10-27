"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { MapContainer, TileLayer, Polyline as LeafletPolyline, CircleMarker, Marker as LeafletMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, Globe, Navigation, Clock, Gauge, Play } from 'lucide-react';

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

function makeLeafletCarIcon(course: number) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <g transform="rotate(${course}, 14, 14)">
        <circle cx="14" cy="14" r="12" fill="#3b82f6" fill-opacity="0.3" stroke="#3b82f6" stroke-width="1.5"/>
        <polygon points="14,3 19,21 14,17 9,21" fill="#3b82f6" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
      </g>
    </svg>`;
    return L.divIcon({ html: svg, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
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
    const [googleMapType, setGoogleMapType] = useState<google.maps.MapTypeId | 'hybrid' | 'roadmap' | 'satellite'>('hybrid');
    const [leafletTileLayer, setLeafletTileLayer] = useState<'street' | 'satellite'>('street');
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<Position | null>(null);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCnQRiDe3A6Rs9kKAOYJmA4OrOqz8_y7kM",
        region: "MA",
        libraries: GOOGLE_MAPS_LIBRARIES
    });

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
                    <div className="flex bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                        <button
                            onClick={() => setGoogleMapType('hybrid')}
                            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                googleMapType === 'hybrid' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Layers size={13} /> Hybrid
                        </button>
                        <button
                            onClick={() => setGoogleMapType('roadmap')}
                            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                googleMapType === 'roadmap' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Layers size={13} /> Road
                        </button>
                        <button
                            onClick={() => setGoogleMapType('satellite')}
                            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                googleMapType === 'satellite' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Layers size={13} /> Satellite
                        </button>
                    </div>
                )}

                {engine === 'leaflet' && (
                    <div className="flex bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                        <button
                            onClick={() => setLeafletTileLayer('street')}
                            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                leafletTileLayer === 'street' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Layers size={13} /> Street
                        </button>
                        <button
                            onClick={() => setLeafletTileLayer('satellite')}
                            className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                leafletTileLayer === 'satellite' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Layers size={13} /> Satellite
                        </button>
                    </div>
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

                            {/* Moving Playback Marker (Aerodynamic Directional Arrow) */}
                            {current && playIndex > 0 && (
                                <Marker
                                    position={{ lat: current.lat, lng: current.lng }}
                                    onClick={() => setSelectedPoint(current)}
                                    zIndex={100}
                                    icon={{
                                        path: "M 0,-18 L 12,14 L 0,8 L -12,14 Z",
                                        scale: 1.4,
                                        fillColor: "#3b82f6",
                                        fillOpacity: 1,
                                        strokeColor: "#ffffff",
                                        strokeWeight: 2.2,
                                        rotation: current.course || 0,
                                        anchor: new google.maps.Point(0, 0)
                                    }}
                                />
                            )}

                            {/* Point Info Window */}
                            {selectedPoint && (
                                <InfoWindow
                                    position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
                                    onCloseClick={() => setSelectedPoint(null)}
                                    options={{ pixelOffset: new google.maps.Size(0, -20) }}
                                >
                                    <div className="bg-zinc-900 text-white rounded-lg p-2.5 min-w-[180px] border border-zinc-800 shadow-xl font-sans">
                                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-zinc-800">
                                            <span className="font-bold text-xs text-white">Route Point</span>
                                            <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedPoint.speed.toFixed(1)} km/h</span>
                                        </div>
                                        <div className="text-[11px] text-zinc-300 space-y-0.5">
                                            <div>Time: {new Date(selectedPoint.timestamp).toLocaleTimeString()}</div>
                                            <div>Date: {new Date(selectedPoint.timestamp).toLocaleDateString()}</div>
                                            <div className="text-zinc-500 font-mono text-[10px]">{selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}</div>
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
                        <CircleMarker center={[start.lat, start.lng]} radius={8} color="#22c55e" fillColor="#22c55e" fillOpacity={1} weight={2}>
                            <Popup>
                                <div className="text-xs text-black font-semibold">
                                    🟢 Start<br />{new Date(start.timestamp).toLocaleString()}
                                </div>
                            </Popup>
                        </CircleMarker>
                    )}

                    {end && end !== start && (
                        <CircleMarker center={[end.lat, end.lng]} radius={8} color="#ef4444" fillColor="#ef4444" fillOpacity={1} weight={2}>
                            <Popup>
                                <div className="text-xs text-black font-semibold">
                                    🔴 End<br />{new Date(end.timestamp).toLocaleString()}
                                </div>
                            </Popup>
                        </CircleMarker>
                    )}

                    {current && playIndex > 0 && (
                        <LeafletMarker position={[current.lat, current.lng]} icon={makeLeafletCarIcon(current.course || 0)}>
                            <Popup>
                                <div className="text-xs text-black">
                                    <strong>{new Date(current.timestamp).toLocaleTimeString()}</strong><br />
                                    Speed: {current.speed.toFixed(1)} km/h
                                </div>
                            </Popup>
                        </LeafletMarker>
                    )}
                </MapContainer>
            )}
        </div>
    );
}
