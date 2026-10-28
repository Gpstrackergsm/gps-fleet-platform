import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform, Dimensions, Alert, Modal, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Map as MapIcon, List, LogOut, Navigation, CircleParking, Calendar, Clock, ChevronRight, Activity, MapPin, Trash2, SlidersHorizontal, Play, Pause, Key, Power, ShieldAlert, CheckCircle2, X, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSocket } from '../hooks/useSocket';
import axios from 'axios';
import { API_URL } from '../constants/Config';
import FleetList from '../components/FleetList';

interface Vehicle {
    id: string;
    name: string;
    lat: number;
    lng: number;
    speed: number;
    trip_distance?: number;
    course?: number;
    alarm?: string;
    accStatus?: boolean;
    lastUpdate: Date | string;
    status: string;
    last_update?: string; // API uses this
    current_state?: 'moving' | 'idling' | 'parked' | 'offline';
    state_start_time?: string | Date;
    internetStatus?: boolean;
    gpsStatus?: boolean;
}

interface HistoryPoint {
    latitude: number;
    longitude: number;
    timestamp: string;
    speed: number;
    id: string;
}

// Clean Google Satellite Map: Hides commercial POIs, keeping streets and road names visible
const CUSTOM_MAP_STYLE = [
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

function getVehicleState(v: Vehicle): 'moving' | 'idling' | 'parked' | 'offline' {
    if (v.current_state) return v.current_state;
    const lastTime = new Date(v.lastUpdate).getTime();
    const ageMs = Date.now() - lastTime;
    if (ageMs > 3 * 60 * 1000) return 'offline';
    if (!v.accStatus && v.speed <= 3) return 'parked';
    if (v.accStatus && v.speed <= 3) return 'idling';
    return 'moving';
}

function getVehicleStateColor(state: string) {
    if (state === 'moving') return '#22c55e'; // Green
    if (state === 'idling') return '#f59e0b'; // Amber
    if (state === 'parked') return '#3b82f6'; // Blue
    return '#64748b'; // Gray
}

function getVehicleStateLabel(state: string) {
    if (state === 'moving') return 'EN ROUTE';
    if (state === 'idling') return 'AU RALENTI';
    if (state === 'parked') return 'STATIONNÉ';
    return 'HORS LIGNE';
}

export default function Dashboard() {
    const router = useRouter();
    const socket = useSocket();
    const mapRef = useRef<any>(null);
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const lastTrackedVehicleId = useRef<string | null>(null);
    const [durationStr, setDurationStr] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('map'); // Default to clean Google Satellite Map
    const [commandLoading, setCommandLoading] = useState(false);
    const [showHistoryPanel, setShowHistoryPanel] = useState(false);
    const hasAutoFitted = useRef(false);

    // Duration Timer Logic for Selected Vehicle
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (selectedVehicle && vehicles[selectedVehicle.id]) {
            const v = vehicles[selectedVehicle.id];
            const startTime = v.state_start_time ? new Date(v.state_start_time).getTime() : Date.now();

            const updateDuration = () => {
                const now = Date.now();
                const diff = Math.max(0, now - startTime);

                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);

                if (hours > 0) {
                    setDurationStr(`${hours}h ${minutes}m`);
                } else if (minutes > 0) {
                    setDurationStr(`${minutes}m ${seconds}s`);
                } else {
                    setDurationStr(`${seconds}s`);
                }
            };

            updateDuration();
            interval = setInterval(updateDuration, 1000);
        } else {
            setDurationStr('');
        }

        return () => clearInterval(interval);
    }, [selectedVehicle, vehicles]);

    // Fetch initial devices
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                let token;
                if (Platform.OS !== 'web') {
                    token = await SecureStore.getItemAsync('auth_token');
                } else {
                    token = localStorage.getItem('auth_token');
                }
                if (!token) return;

                const res = await axios.get(`${API_URL}/api/devices`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const vehicleMap: Record<string, Vehicle> = {};
                res.data.forEach((d: any) => {
                    vehicleMap[d.device_id] = {
                        id: d.device_id,
                        name: d.name || `Vehicle ${d.device_id.slice(-4)}`,
                        lat: d.lat || 33.5731,
                        lng: d.lng || -7.5898,
                        speed: d.speed || 0,
                        trip_distance: d.trip_distance,
                        course: d.course,
                        accStatus: d.acc_status,
                        status: d.status || 'offline',
                        lastUpdate: d.last_update ? new Date(d.last_update) : new Date(),
                        last_update: d.last_update,
                        current_state: d.current_state,
                        state_start_time: d.state_start_time,
                        internetStatus: d.internet_status === 1 || d.internet_status === true,
                        gpsStatus: d.gps_status === 1 || d.gps_status === true
                    };
                });
                setVehicles(vehicleMap);
            } catch (err) {
                console.error('Failed to fetch devices:', err);
            }
        };

        fetchDevices();
        const interval: ReturnType<typeof setInterval> = setInterval(fetchDevices, 30000); // Poll every 30s as fallback
        return () => clearInterval(interval);
    }, []);

    // Auto-fit bounds on initial load to show all fleet vehicles
    useEffect(() => {
        const validVehicles = Object.values(vehicles).filter(v => v.lat && v.lng);
        if (!hasAutoFitted.current && validVehicles.length > 0 && mapRef.current) {
            hasAutoFitted.current = true;
            if (validVehicles.length === 1) {
                mapRef.current.animateToRegion({
                    latitude: validVehicles[0].lat,
                    longitude: validVehicles[0].lng,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }, 1000);
            } else {
                mapRef.current.fitToCoordinates(
                    validVehicles.map(v => ({ latitude: v.lat, longitude: v.lng })),
                    {
                        edgePadding: { top: 120, right: 60, bottom: 120, left: 60 },
                        animated: true,
                    }
                );
            }
        }
    }, [vehicles]);

    const handleSendCommand = (commandType: string) => {
        if (!selectedVehicle) return;

        const actionName = commandType === 'stop_engine' ? 'couper le moteur' : 'restaurer le moteur';

        Alert.alert(
            'Confirmation commande',
            `Êtes-vous sûr de vouloir ${actionName} pour ${selectedVehicle.name} ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    style: commandType === 'stop_engine' ? 'destructive' : 'default',
                    onPress: async () => {
                        setCommandLoading(true);
                        try {
                            let token;
                            if (Platform.OS !== 'web') {
                                token = await SecureStore.getItemAsync('auth_token');
                            } else {
                                token = localStorage.getItem('auth_token');
                            }

                            const res = await axios.post(
                                `${API_URL}/api/devices/${selectedVehicle.id}/command`,
                                { commandType },
                                { headers: { Authorization: `Bearer ${token}` } }
                            );

                            Alert.alert(
                                res.data.success ? 'Succès' : 'Info',
                                res.data.message || 'Commande traitée'
                            );
                        } catch (err: any) {
                            const msg = err.response?.data?.error || 'Erreur lors de l\'envoi de la commande';
                            Alert.alert('Erreur', msg);
                        } finally {
                            setCommandLoading(false);
                        }
                    }
                }
            ]
        );
    };



    // Socket updates
    useEffect(() => {
        if (!socket) return;

        socket.on('position', (data: any) => {
            console.log('Mobile Socket Data:', data);

            setVehicles(prev => {
                const deviceId = data.deviceId;
                const existing = prev[deviceId];

                // Only update state_start_time if state actually changed
                const stateChanged = existing?.current_state !== data.state;
                const newStateStartTime = stateChanged ? data.stateStartTime : (existing?.state_start_time || data.stateStartTime);

                const updatedVehicle: Vehicle = {
                    id: deviceId,
                    name: existing?.name || `Vehicle ${deviceId.slice(-4)}`,
                    lat: data.lat,
                    lng: data.lng,
                    speed: data.speed,
                    trip_distance: data.tripDistance,
                    course: data.course,
                    alarm: data.alarm,

                    accStatus: data.accStatus,
                    lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : new Date(),
                    status: 'online',
                    last_update: data.lastUpdate ? new Date(data.lastUpdate).toISOString() : new Date().toISOString(),
                    current_state: data.state, // Socket uses 'state'
                    state_start_time: newStateStartTime, // Only update if state changed!
                    internetStatus: data.internetStatus,
                    gpsStatus: data.gpsStatus
                };

                return {
                    ...prev,
                    [deviceId]: updatedVehicle
                };
            });
        });

        return () => {
            socket.off('position');
        };
    }, [socket]);

    const handleLogout = async () => {
        if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync('auth_token');
        } else {
            localStorage.removeItem('auth_token');
        }
        router.replace('/');
    };

    const [historyPath, setHistoryPath] = useState<HistoryPoint[]>([]);
    const [historySegments, setHistorySegments] = useState<HistoryPoint[][]>([]);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [selectedPoints, setSelectedPoints] = useState<HistoryPoint[]>([]);

    // Play Trajectory State
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x


    const fetchHistoryDirect = async (vehicleId: string, start: Date, end: Date) => {
        try {
            let token;
            if (Platform.OS !== 'web') {
                token = await SecureStore.getItemAsync('auth_token');
            } else {
                token = localStorage.getItem('auth_token');
            }
            if (!token) return;

            const startISO = start.toISOString();
            const endISO = end.toISOString();

            console.log(`Fetching history for ${vehicleId} from ${startISO} to ${endISO}`);
            const res = await axios.get(`${API_URL}/api/devices/${vehicleId}/history`, {
                params: { start: startISO, end: endISO },
                headers: { Authorization: `Bearer ${token}` }
            });

            const path: HistoryPoint[] = res.data.map((p: any) => ({
                latitude: p.lat,
                longitude: p.lng,
                timestamp: p.timestamp,
                speed: p.speed,
                id: p.id || Math.random().toString()
            }));

            setHistoryPath(path);

            // PROCESS SCATTERED SEGMENTS (Split on time gap > 5min or distance > 1km)
            const segments: HistoryPoint[][] = [];
            let currentSegment: HistoryPoint[] = [];

            path.forEach((p, i) => {
                if (i === 0) {
                    currentSegment.push(p);
                    return;
                }

                const prev = path[i - 1];
                const timeDiff = new Date(p.timestamp).getTime() - new Date(prev.timestamp).getTime();

                // Calculate distance for jump detection (Haversine simpler version)
                const R = 6371;
                const dLat = (p.latitude - prev.latitude) * Math.PI / 180;
                const dLon = (p.longitude - prev.longitude) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(prev.latitude * Math.PI / 180) * Math.cos(p.latitude * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const districtKm = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;

                // Split if gap > 5 mins OR distance > 1km (Teleportation check)
                if (timeDiff > 5 * 60 * 1000 || districtKm > 1.0) {
                    if (currentSegment.length > 0) segments.push(currentSegment);
                    currentSegment = [p];
                } else {
                    currentSegment.push(p);
                }
            });
            if (currentSegment.length > 0) segments.push(currentSegment);
            setHistorySegments(segments);

            setSelectedPoints([]); // Reset selection on new fetch

            if (path.length > 0 && mapRef.current) {
                mapRef.current.fitToCoordinates(path, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true
                });
            } else {
                Alert.alert('Info', 'Aucun historique trouvé pour cette période.');
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
            Alert.alert('Erreur', 'Impossible de récupérer l\'historique.');
        }
    }

    const fetchHistory = async (vehicleId: string, period: string) => {
        try {
            const now = new Date();
            let start = new Date();

            if (period === 'custom') {
                setDatePickerVisible(true);
                return;
            }

            switch (period) {
                case 'today':
                    start.setHours(0, 0, 0, 0);
                    break;
                case '12h':
                    start.setHours(now.getHours() - 12);
                    break;
                case '6h':
                    start.setHours(now.getHours() - 6);
                    break;
            }

            // Add buffer to end time (e.g. +1 hour) to handle potential device/server clock skew
            const endBuffer = new Date(now.getTime() + 60 * 60 * 1000);
            fetchHistoryDirect(vehicleId, start, endBuffer);

        } catch (error) {
            console.error('Failed to prepare history fetch:', error);
        }
    };

    // Play Trajectory Animation
    useEffect(() => {
        if (!isPlaying || historyPath.length === 0) return;

        const interval: ReturnType<typeof setInterval> = setInterval(() => {
            setPlaybackIndex(prevIndex => {
                const nextIndex = prevIndex + 1;
                if (nextIndex >= historyPath.length) {
                    setIsPlaying(false);
                    return 0; // Reset to start
                }

                // Animate map to follow playback marker
                const point = historyPath[nextIndex];
                if (mapRef.current && point) {
                    mapRef.current.animateToRegion({
                        latitude: point.latitude,
                        longitude: point.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01
                    }, 300);
                }

                return nextIndex;
            });
        }, 500 / playbackSpeed); // Faster interval with higher speed

        return () => clearInterval(interval);
    }, [isPlaying, historyPath, playbackSpeed]);

    const handleVehiclePress = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setHistoryPath([]); // Clear previous history when selecting new vehicle
        setIsPlaying(false); // Stop any playing animation
        setPlaybackIndex(0);
        setViewMode('map');
    };

    // Format time duration for playback display
    const formatPlaybackTime = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Calculate playback times
    const getPlaybackTimes = () => {
        if (historyPath.length === 0) return { elapsed: '00:00', total: '00:00' };

        const startTime = new Date(historyPath[0].timestamp).getTime();
        const endTime = new Date(historyPath[historyPath.length - 1].timestamp).getTime();
        const currentTime = playbackIndex < historyPath.length
            ? new Date(historyPath[playbackIndex].timestamp).getTime()
            : endTime;

        const elapsedMs = currentTime - startTime;
        const totalMs = endTime - startTime;

        return {
            elapsed: formatPlaybackTime(elapsedMs),
            total: formatPlaybackTime(totalMs)
        };
    };


    // Effect to handle map animation when switching views or when vehicle position updates
    useEffect(() => {
        if (viewMode === 'map' && selectedVehicle && mapRef.current && vehicles[selectedVehicle.id]) {
            const latestVehicleData = vehicles[selectedVehicle.id];

            if (latestVehicleData) {
                // Determine if we should animate (either new selection OR position changed significantly)
                const isNewSelection = selectedVehicle.id !== lastTrackedVehicleId.current;

                // For position updates, we only auto-follow if we are NOT in history mode
                if (historyPath.length === 0) {
                    mapRef.current.animateToRegion({
                        latitude: latestVehicleData.lat,
                        longitude: latestVehicleData.lng,
                        latitudeDelta: isNewSelection ? 0.02 : 0.01,
                        longitudeDelta: isNewSelection ? 0.02 : 0.01
                    }, 1000);
                }

                if (isNewSelection) {
                    lastTrackedVehicleId.current = selectedVehicle.id;
                }
            }
        }
    }, [viewMode, selectedVehicle, vehicles, historyPath]);

    const handlePointPress = (point: HistoryPoint) => {
        setSelectedPoints(prev => {
            const exists = prev.find(p => p.id === point.id);
            if (exists) return prev.filter(p => p.id !== point.id);
            if (prev.length >= 2) return [prev[1], point]; // Keep last two
            return [...prev, point];
        });
    };

    const calculateDistance = () => {
        if (selectedPoints.length !== 2) return null;
        const p1 = selectedPoints[0];
        const p2 = selectedPoints[1];

        const dist = getDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        const timeDiff = Math.abs(new Date(p1.timestamp).getTime() - new Date(p2.timestamp).getTime());
        const totalSeconds = Math.floor(timeDiff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return {
            dist: dist.toFixed(2),
            time: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
        };
    };

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const DEFAULT_REGION = {
        latitude: 33.5731,
        longitude: -7.5898,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    const distanceData = calculateDistance();

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>
                            {viewMode === 'list' ? 'Suivi de Flotte' : (selectedVehicle ? selectedVehicle.name : 'Carte')}
                        </Text>



                        {viewMode === 'map' && selectedVehicle && vehicles[selectedVehicle.id] && (
                            <View style={{ marginTop: 2 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 6, height: 6, borderRadius: 3,
                                            backgroundColor: vehicles[selectedVehicle.id].speed > 0 ? '#10B981' : '#F59E0B',
                                            marginRight: 4
                                        }} />
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#111' }}>
                                            {vehicles[selectedVehicle.id].speed > 0 ? `${Math.round(vehicles[selectedVehicle.id].speed)} km/h` : 'Stop'}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 12, color: '#ccc' }}>|</Text>
                                    <Text style={{
                                        fontSize: 11, fontWeight: '600',
                                        color: vehicles[selectedVehicle.id].accStatus ? '#10B981' : '#9CA3AF'
                                    }}>
                                        {vehicles[selectedVehicle.id].accStatus ? 'ACC ON' : 'ACC OFF'}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                                    {vehicles[selectedVehicle.id].trip_distance !== undefined && (
                                        <Text style={{ fontSize: 11, color: '#6B7280' }}>
                                            Trip: <Text style={{ color: '#7C3AED', fontWeight: 'bold' }}>{vehicles[selectedVehicle.id].trip_distance?.toFixed(1)}km</Text>
                                        </Text>
                                    )}
                                    {durationStr ? (
                                        <Text style={{ fontSize: 11, color: '#6B7280' }}>
                                            ({durationStr})
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.toggleButton}
                            onPress={() => {
                                if (viewMode === 'list') {
                                    setSelectedVehicle(null);
                                    setHistoryPath([]);
                                    setSelectedPoints([]);
                                }
                                setViewMode(m => m === 'list' ? 'map' : 'list');
                            }}
                        >
                            {viewMode === 'list' ? <MapIcon size={20} color="#111" /> : <List size={20} color="#111" />}
                        </TouchableOpacity>
                        {viewMode === 'list' && (
                            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                                <LogOut size={20} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </SafeAreaView>

            <View style={styles.contentContainer}>
                {viewMode === 'list' ? (
                    <View style={{ paddingTop: 80, flex: 1 }}>
                        <FleetList
                            vehicles={vehicles}
                            onVehiclePress={handleVehiclePress}
                        />
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={DEFAULT_REGION}
                            showsUserLocation={true}
                            showsMyLocationButton={true}
                            mapType="hybrid"
                            customMapStyle={CUSTOM_MAP_STYLE}
                        >
                            {Object.values(vehicles).map(vehicle => {
                                const state = getVehicleState(vehicle);
                                const color = getVehicleStateColor(state);
                                const isSelected = selectedVehicle?.id === vehicle.id;

                                return (
                                    <Marker
                                        key={vehicle.id}
                                        coordinate={{ latitude: vehicle.lat, longitude: vehicle.lng }}
                                        anchor={{ x: 0.5, y: 0.8 }}
                                        onPress={() => {
                                            setSelectedVehicle(vehicle);
                                            mapRef.current?.animateToRegion({
                                                latitude: vehicle.lat,
                                                longitude: vehicle.lng,
                                                latitudeDelta: 0.01,
                                                longitudeDelta: 0.01,
                                            }, 500);
                                        }}
                                    >
                                        <View style={styles.markerContainer}>
                                            {/* Fixed Label Pill */}
                                            <View style={[styles.markerPill, isSelected && styles.markerPillSelected]}>
                                                <View style={[styles.markerStatusDot, { backgroundColor: color }]} />
                                                <Text style={styles.markerPillText} numberOfLines={1}>{vehicle.name}</Text>
                                            </View>

                                            {/* State Icon Badge */}
                                            <View style={[styles.stateIconCircle, { backgroundColor: color }]}>
                                                {state === 'moving' ? (
                                                    <Navigation
                                                        size={13}
                                                        color="#FFFFFF"
                                                        fill="#FFFFFF"
                                                        style={{ transform: [{ rotate: `${vehicle.course || 0}deg` }] }}
                                                    />
                                                ) : state === 'idling' ? (
                                                    <Key size={12} color="#FFFFFF" />
                                                ) : state === 'parked' ? (
                                                    <Text style={styles.stateParkedText}>P</Text>
                                                ) : (
                                                    <View style={styles.stateOfflineDot} />
                                                )}
                                            </View>
                                        </View>
                                    </Marker>
                                );
                            })}

                            {historyPath.length > 0 && (
                                <>
                                    {historySegments.map((segment, index) => (
                                        <Polyline
                                            key={`poly-${index}`}
                                            coordinates={segment.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
                                            strokeColor="#3B82F6"
                                            strokeWidth={4}
                                        />
                                    ))}
                                    {historyPath.filter((_, i) => i % 10 === 0 || i === 0 || i === historyPath.length - 1).map((point, index) => {
                                        const isSelected = selectedPoints.some(p => p.id === point.id);
                                        return (
                                            <Marker
                                                key={`hist-${index}`}
                                                coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                                                anchor={{ x: 0.5, y: 0.5 }}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handlePointPress(point);
                                                }}
                                            >
                                                <View style={{
                                                    width: isSelected ? 16 : 8,
                                                    height: isSelected ? 16 : 8,
                                                    borderRadius: isSelected ? 8 : 4,
                                                    backgroundColor: isSelected ? '#EF4444' : 'rgba(59, 130, 246, 0.8)',
                                                    borderWidth: 1,
                                                    borderColor: 'white'
                                                }} />
                                            </Marker>
                                        );
                                    })}
                                </>
                            )}

                            {/* Playback Marker - shows current position during playback */}
                            {isPlaying && historyPath[playbackIndex] && (
                                <Marker
                                    coordinate={{
                                        latitude: historyPath[playbackIndex].latitude,
                                        longitude: historyPath[playbackIndex].longitude
                                    }}
                                    anchor={{ x: 0.5, y: 0.5 }}
                                >
                                    <View style={styles.playbackMarker}>
                                        <Navigation size={22} color="#22C55E" fill="#22C55E" />
                                    </View>
                                </Marker>
                            )}
                        </MapView>

                        {/* Selected Vehicle Telemetry & Remote Control Drawer */}
                        {selectedVehicle && vehicles[selectedVehicle.id] && (() => {
                            const v = vehicles[selectedVehicle.id];
                            const state = getVehicleState(v);
                            const stateColor = getVehicleStateColor(state);
                            const stateLabel = getVehicleStateLabel(state);

                            return (
                                <View style={styles.overlayContainer}>
                                    <View style={styles.telemetryCard}>
                                        {/* Drawer Header */}
                                        <View style={styles.drawerHeader}>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Text style={styles.drawerTitle} numberOfLines={1}>{v.name}</Text>
                                                    <View style={[styles.stateBadge, { backgroundColor: `${stateColor}22`, borderColor: stateColor }]}>
                                                        <View style={[styles.stateBadgeDot, { backgroundColor: stateColor }]} />
                                                        <Text style={[styles.stateBadgeText, { color: stateColor }]}>{stateLabel}</Text>
                                                    </View>
                                                </View>
                                                {v.last_update && (
                                                    <Text style={styles.drawerSub}>
                                                        Mis à jour: {new Date(v.last_update).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <TouchableOpacity
                                                    style={[styles.iconBtn, showHistoryPanel && styles.iconBtnActive]}
                                                    onPress={() => setShowHistoryPanel(!showHistoryPanel)}
                                                >
                                                    <Activity size={18} color={showHistoryPanel ? '#3B82F6' : '#94A3B8'} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.iconBtn}
                                                    onPress={() => {
                                                        setSelectedVehicle(null);
                                                        setHistoryPath([]);
                                                        setSelectedPoints([]);
                                                        setShowHistoryPanel(false);
                                                    }}
                                                >
                                                    <X size={18} color="#94A3B8" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Telemetry Stats Grid */}
                                        <View style={styles.telemetryGrid}>
                                            <View style={styles.telemetryBox}>
                                                <Text style={styles.telemetryLabel}>VITESSE</Text>
                                                <Text style={[styles.telemetryValue, { color: v.speed > 0 ? '#22C55E' : '#94A3B8' }]}>
                                                    {Math.round(v.speed)} <Text style={{ fontSize: 10, fontWeight: 'normal' }}>km/h</Text>
                                                </Text>
                                            </View>

                                            <View style={styles.telemetryBox}>
                                                <Text style={styles.telemetryLabel}>MOTEUR</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Key size={13} color={v.accStatus ? '#22C55E' : '#64748B'} />
                                                    <Text style={[styles.telemetryValue, { color: v.accStatus ? '#22C55E' : '#64748B' }]}>
                                                        {v.accStatus ? 'ON' : 'OFF'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.telemetryBox}>
                                                <Text style={styles.telemetryLabel}>TRAJET</Text>
                                                <Text style={styles.telemetryValue}>
                                                    {v.trip_distance !== undefined ? `${v.trip_distance.toFixed(1)} km` : '--'}
                                                </Text>
                                            </View>

                                            <View style={styles.telemetryBox}>
                                                <Text style={styles.telemetryLabel}>DURÉE</Text>
                                                <Text style={styles.telemetryValue}>
                                                    {durationStr || '--'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* 2-Way Remote Engine Commands */}
                                        <View style={styles.commandRow}>
                                            <TouchableOpacity
                                                style={[styles.commandBtn, styles.stopEngineBtn]}
                                                disabled={commandLoading}
                                                onPress={() => handleSendCommand('stop_engine')}
                                            >
                                                {commandLoading ? (
                                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                                ) : (
                                                    <>
                                                        <Power size={14} color="#FFFFFF" />
                                                        <Text style={styles.commandBtnText}>Couper Moteur</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.commandBtn, styles.resumeEngineBtn]}
                                                disabled={commandLoading}
                                                onPress={() => handleSendCommand('resume_engine')}
                                            >
                                                {commandLoading ? (
                                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                                ) : (
                                                    <>
                                                        <RefreshCw size={14} color="#FFFFFF" />
                                                        <Text style={styles.commandBtnText}>Rétablir Moteur</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>

                                        {/* Collapsible History & Playback Panel */}
                                        {showHistoryPanel && (
                                            <View style={styles.historyDrawerSection}>
                                                <View style={styles.historyHeader}>
                                                    <Activity size={14} color="#3B82F6" />
                                                    <Text style={styles.historyTitle}>Historique & Trajets</Text>
                                                    {historyPath.length > 0 && (
                                                        <TouchableOpacity onPress={() => { setHistoryPath([]); setSelectedPoints([]); }}>
                                                            <Trash2 size={15} color="#94A3B8" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>

                                                <View style={styles.periodRow}>
                                                    <TouchableOpacity style={styles.periodBtn} onPress={() => fetchHistory(v.id, '6h')}>
                                                        <Text style={styles.periodText}>6h</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={styles.periodBtn} onPress={() => fetchHistory(v.id, '12h')}>
                                                        <Text style={styles.periodText}>12h</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={styles.periodBtn} onPress={() => fetchHistory(v.id, 'today')}>
                                                        <Text style={styles.periodText}>Aujourd'hui</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={[styles.periodBtn, styles.customBtn]} onPress={() => fetchHistory(v.id, 'custom')}>
                                                        <Calendar size={13} color="#FFF" />
                                                    </TouchableOpacity>
                                                </View>

                                                {/* Playback Controls */}
                                                {historyPath.length > 0 && (
                                                    <View style={styles.playbackControls}>
                                                        <TouchableOpacity
                                                            style={styles.playBtn}
                                                            onPress={() => setIsPlaying(!isPlaying)}
                                                        >
                                                            {isPlaying ? (
                                                                <Pause size={15} color="#FFF" fill="#FFF" />
                                                            ) : (
                                                                <Play size={15} color="#FFF" fill="#FFF" />
                                                            )}
                                                        </TouchableOpacity>

                                                        <View style={styles.playbackInfo}>
                                                            <Text style={styles.playbackText}>
                                                                {getPlaybackTimes().elapsed} / {getPlaybackTimes().total}
                                                            </Text>
                                                        </View>

                                                        <TouchableOpacity
                                                            style={styles.speedBtn}
                                                            onPress={() => {
                                                                setPlaybackSpeed(prev => prev === 1 ? 2 : prev === 2 ? 4 : 1);
                                                            }}
                                                        >
                                                            <Text style={styles.speedText}>{playbackSpeed}x</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}

                                                {distanceData && (
                                                    <View style={styles.analysisBox}>
                                                        <View style={styles.analysisItem}>
                                                            <MapPin size={13} color="#EF4444" />
                                                            <Text style={styles.analysisText}>{distanceData.dist} km</Text>
                                                        </View>
                                                        <View style={styles.analysisItem}>
                                                            <Clock size={13} color="#94A3B8" />
                                                            <Text style={styles.analysisText}>{distanceData.time}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Custom Date Picker Modal */}
                        <Modal visible={datePickerVisible} transparent animationType="fade">
                            <View style={styles.modalBg}>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>Sélectionner une période</Text>

                                    <View style={styles.quickDatesContainer}>
                                        <TouchableOpacity
                                            style={styles.quickDateBtn}
                                            onPress={() => {
                                                if (selectedVehicle) {
                                                    const yesterday = new Date();
                                                    yesterday.setDate(yesterday.getDate() - 1);
                                                    yesterday.setHours(0, 0, 0, 0);
                                                    const endOfYesterday = new Date(yesterday);
                                                    endOfYesterday.setHours(23, 59, 59, 999);
                                                    setDatePickerVisible(false);
                                                    fetchHistoryDirect(selectedVehicle.id, yesterday, endOfYesterday);
                                                }
                                            }}
                                        >
                                            <Text style={styles.quickDateText}>Hier</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.quickDateBtn}
                                            onPress={() => {
                                                if (selectedVehicle) {
                                                    const week = new Date();
                                                    week.setDate(week.getDate() - 7);
                                                    week.setHours(0, 0, 0, 0);
                                                    const now = new Date();
                                                    setDatePickerVisible(false);
                                                    fetchHistoryDirect(selectedVehicle.id, week, now);
                                                }
                                            }}
                                        >
                                            <Text style={styles.quickDateText}>-7 jours</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.quickDateBtn}
                                            onPress={() => {
                                                if (selectedVehicle) {
                                                    const month = new Date();
                                                    month.setDate(month.getDate() - 30);
                                                    month.setHours(0, 0, 0, 0);
                                                    const now = new Date();
                                                    setDatePickerVisible(false);
                                                    fetchHistoryDirect(selectedVehicle.id, month, now);
                                                }
                                            }}
                                        >
                                            <Text style={styles.quickDateText}>-30 jours</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity style={styles.closeBtn} onPress={() => setDatePickerVisible(false)}>
                                        <Text style={styles.closeBtnText}>Annuler</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090D16' },
    header: {
        position: 'absolute', top: 0, left: 0, right: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        zIndex: 100, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)'
    },
    headerContent: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12
    },
    headerTextContainer: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
    headerActions: { flexDirection: 'row', gap: 8 },
    toggleButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255, 255, 255, 0.12)', justifyContent: 'center', alignItems: 'center' },
    logoutButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(239, 68, 68, 0.2)', justifyContent: 'center', alignItems: 'center' },
    contentContainer: { flex: 1 },
    map: { flex: 1 },

    // Vehicle Marker Styles (Fixed Label Pill + Small State Icon)
    markerContainer: { alignItems: 'center', justifyContent: 'center' },
    markerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 5,
        gap: 5
    },
    markerPillSelected: {
        borderColor: '#3B82F6',
        backgroundColor: '#1E293B',
        transform: [{ scale: 1.05 }]
    },
    markerStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    markerPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    stateIconCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 4
    },
    stateParkedText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFFFFF'
    },
    stateOfflineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF'
    },

    // Bottom Telemetry Drawer
    overlayContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 24 : 16,
        left: 14,
        right: 14
    },
    telemetryCard: {
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 8
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    drawerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        maxWidth: 160
    },
    drawerSub: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2
    },
    stateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        gap: 5
    },
    stateBadgeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5
    },
    stateBadgeText: {
        fontSize: 10,
        fontWeight: '800'
    },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    iconBtnActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.25)',
        borderWidth: 1,
        borderColor: '#3B82F6'
    },

    // Telemetry Grid
    telemetryGrid: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 14,
        padding: 10,
        justifyContent: 'space-between',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)'
    },
    telemetryBox: {
        flex: 1,
        alignItems: 'center'
    },
    telemetryLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
        marginBottom: 3
    },
    telemetryValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF'
    },

    // Remote Command Buttons
    commandRow: {
        flexDirection: 'row',
        gap: 10
    },
    commandBtn: {
        flex: 1,
        height: 40,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3
    },
    stopEngineBtn: {
        backgroundColor: '#DC2626'
    },
    resumeEngineBtn: {
        backgroundColor: '#16A34A'
    },
    commandBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },

    // Collapsible History Section
    historyDrawerSection: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)'
    },
    historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    historyTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#E2E8F0' },
    periodRow: { flexDirection: 'row', gap: 6 },
    periodBtn: {
        flex: 1, height: 32, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center', alignItems: 'center'
    },
    periodText: { fontSize: 11, fontWeight: '700', color: '#CBD5E1' },
    customBtn: { backgroundColor: '#3B82F6', flex: 0.5 },
    analysisBox: {
        marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)',
        flexDirection: 'row', justifyContent: 'space-around'
    },
    analysisItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    analysisText: { fontSize: 12, fontWeight: '600', color: '#E2E8F0' },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, width: '85%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    modalTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 16, color: '#FFFFFF' },
    quickDatesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 },
    quickDateBtn: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: '45%',
        alignItems: 'center'
    },
    quickDateText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    closeBtn: { marginTop: 12, padding: 10, alignItems: 'center' },
    closeBtnText: { color: '#94A3B8', fontWeight: '600' },

    // Playback Marker & Controls
    playbackMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 2,
        borderColor: '#22C55E'
    },
    playbackControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)'
    },
    playBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#22C55E',
        justifyContent: 'center',
        alignItems: 'center'
    },
    playbackInfo: {
        flex: 1,
        alignItems: 'center'
    },
    playbackText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8'
    },
    speedBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)'
    },
    speedText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#3B82F6'
    }
});
