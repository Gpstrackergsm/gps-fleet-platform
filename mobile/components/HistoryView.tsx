import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Play, Pause, RotateCcw, Calendar, Clock, Gauge, Route, Car, Navigation } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/Config';
import { Vehicle, getVehicleStateColor } from './FleetList';

interface HistoryPoint {
    latitude: number;
    longitude: number;
    timestamp: string;
    speed: number;
    id: string;
}

interface HistoryViewProps {
    vehicles: Record<string, Vehicle>;
    initialVehicle?: Vehicle | null;
    mapType?: 'hybrid' | 'standard';
    onSelectVehicle?: (vehicle: Vehicle) => void;
}

type PeriodType = '6h' | '12h' | 'today' | 'yesterday' | 'week';

export default function HistoryView({ vehicles, initialVehicle, mapType = 'hybrid', onSelectVehicle }: HistoryViewProps) {
    const vehicleList = useMemo(() => Object.values(vehicles), [vehicles]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
        initialVehicle?.id || (vehicleList.length > 0 ? vehicleList[0].id : '')
    );
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
    const [historyPath, setHistoryPath] = useState<HistoryPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);

    const mapRef = useRef<any>(null);
    const prevInitialVehicleId = useRef(initialVehicle?.id);

    // Only sync if initialVehicle explicitly changes to a different vehicle
    useEffect(() => {
        if (initialVehicle?.id && initialVehicle.id !== prevInitialVehicleId.current) {
            prevInitialVehicleId.current = initialVehicle.id;
            setSelectedVehicleId(initialVehicle.id);
        }
    }, [initialVehicle?.id]);

    // Fallback if no vehicle was selected initially and vehicles finish loading
    useEffect(() => {
        if (!selectedVehicleId && vehicleList.length > 0) {
            setSelectedVehicleId(vehicleList[0].id);
        }
    }, [selectedVehicleId, vehicleList.length]);

    const handleVehicleChange = (v: Vehicle) => {
        if (Platform.OS === 'ios') {
            try { Haptics.selectionAsync(); } catch {}
        }
        prevInitialVehicleId.current = v.id;
        setSelectedVehicleId(v.id);
        if (onSelectVehicle) {
            onSelectVehicle(v);
        }
        if (mapRef.current && v.lat && v.lng) {
            mapRef.current.animateToRegion({
                latitude: v.lat,
                longitude: v.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 500);
        }
    };

    // Fetch history for selected vehicle & period
    const loadHistory = async (deviceId: string, period: PeriodType) => {
        if (!deviceId) return;
        setLoading(true);
        setIsPlaying(false);
        setPlaybackIndex(0);

        try {
            const now = new Date();
            let start = new Date();

            if (period === '6h') {
                start = new Date(now.getTime() - 6 * 3600 * 1000);
            } else if (period === '12h') {
                start = new Date(now.getTime() - 12 * 3600 * 1000);
            } else if (period === 'today') {
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            } else if (period === 'yesterday') {
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
                now.setHours(23, 59, 59, 999);
            } else if (period === 'week') {
                start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
            }

            let token;
            if (Platform.OS !== 'web') {
                token = await SecureStore.getItemAsync('auth_token');
            } else {
                token = localStorage.getItem('auth_token');
            }

            const res = await axios.get(`${API_URL}/api/devices/${deviceId}/history`, {
                params: {
                    start: start.toISOString(),
                    end: now.toISOString(),
                },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                timeout: 10000,
            });

            if (Array.isArray(res.data)) {
                // Filter out invalid coordinates and all points with speed < 5 km/h (stops/stationary drift)
                const points: HistoryPoint[] = res.data
                    .map((p: any, idx: number) => ({
                        latitude: Number(p.latitude || p.lat),
                        longitude: Number(p.longitude || p.lng),
                        timestamp: p.timestamp || p.created_at,
                        speed: Number(p.speed) || 0,
                        id: String(p.id || idx),
                    }))
                    .filter(p => !isNaN(p.latitude) && !isNaN(p.longitude) && p.speed >= 5);

                setHistoryPath(points);

                if (points.length > 0 && mapRef.current) {
                    setTimeout(() => {
                        mapRef.current?.fitToCoordinates(
                            points.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
                            { edgePadding: { top: 80, right: 40, bottom: 120, left: 40 }, animated: true }
                        );
                    }, 300);
                }
            } else {
                setHistoryPath([]);
            }
        } catch (err) {
            console.warn('Failed to load history:', err);
            setHistoryPath([]);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch on vehicle or period change
    useEffect(() => {
        if (selectedVehicleId) {
            loadHistory(selectedVehicleId, selectedPeriod);
        }
    }, [selectedVehicleId, selectedPeriod]);

    // Playback loop
    useEffect(() => {
        if (!isPlaying || historyPath.length === 0) return;

        const intervalMs = Math.max(50, 400 / playbackSpeed);
        const timer = setInterval(() => {
            setPlaybackIndex(prev => {
                const next = prev + 1;
                if (next >= historyPath.length) {
                    setIsPlaying(false);
                    return 0;
                }
                const pt = historyPath[next];
                if (pt && mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude: pt.latitude,
                        longitude: pt.longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                    }, intervalMs);
                }
                return next;
            });
        }, intervalMs);

        return () => clearInterval(timer);
    }, [isPlaying, historyPath, playbackSpeed]);

    // Calculate trip stats
    const stats = React.useMemo(() => {
        if (historyPath.length === 0) return { distance: '0.0', maxSpeed: 0, duration: '--' };

        let totalDist = 0;
        let maxSpd = 0;

        for (let i = 1; i < historyPath.length; i++) {
            const p1 = historyPath[i - 1];
            const p2 = historyPath[i];

            // Haversine
            const R = 6371;
            const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
            const dLon = (p2.longitude - p1.longitude) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(p1.latitude * Math.PI / 180) * Math.cos(p2.latitude * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            totalDist += R * c;

            if (p2.speed > maxSpd) maxSpd = p2.speed;
        }

        const startTs = new Date(historyPath[0].timestamp).getTime();
        const endTs = new Date(historyPath[historyPath.length - 1].timestamp).getTime();
        const diffSec = Math.max(0, Math.floor((endTs - startTs) / 1000));
        const hours = Math.floor(diffSec / 3600);
        const mins = Math.floor((diffSec % 3600) / 60);

        return {
            distance: totalDist.toFixed(1),
            maxSpeed: Math.round(maxSpd),
            duration: hours > 0 ? `${hours}h ${mins}m` : `${mins} min`,
        };
    }, [historyPath]);

    const periods: { key: PeriodType; label: string }[] = [
        { key: 'today', label: "Aujourd'hui" },
        { key: 'yesterday', label: 'Hier' },
        { key: '6h', label: '6h' },
        { key: '12h', label: '12h' },
        { key: 'week', label: '7 jours' },
    ];

    const currentPoint = historyPath[playbackIndex];

    return (
        <View style={styles.container}>
            {/* Top Control Bar: Vehicle Selector */}
            <View style={styles.topBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScroll}>
                    {vehicleList.map(v => {
                        const isSelected = v.id === selectedVehicleId;
                        const stateColor = getVehicleStateColor(v.current_state || 'parked');
                        return (
                            <TouchableOpacity
                                key={v.id}
                                style={[styles.vehicleChip, isSelected && styles.vehicleChipActive]}
                                onPress={() => handleVehicleChange(v)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.vehicleDot, { backgroundColor: stateColor }]} />
                                <Text style={[styles.vehicleChipText, isSelected && styles.vehicleChipTextActive]}>
                                    {v.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Period Chips */}
                <View style={styles.periodRow}>
                    {periods.map(p => {
                        const isSelected = selectedPeriod === p.key;
                        return (
                            <TouchableOpacity
                                key={p.key}
                                style={[styles.periodBtn, isSelected && styles.periodBtnActive]}
                                onPress={() => {
                                    if (Platform.OS === 'ios') {
                                        try { Haptics.selectionAsync(); } catch {}
                                    }
                                    setSelectedPeriod(p.key);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.periodText, isSelected && styles.periodTextActive]}>
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Map View */}
            <View style={styles.mapContainer}>
                <MapView
                    provider={PROVIDER_GOOGLE}
                    ref={mapRef}
                    style={styles.map}
                    mapType={mapType}
                    initialRegion={{
                        latitude: initialVehicle?.lat || 31.6650,
                        longitude: initialVehicle?.lng || -8.0500,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    {/* Polyline Trajectory */}
                    {historyPath.length > 0 && (
                        <Polyline
                            coordinates={historyPath.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
                            strokeColor="#2563EB"
                            strokeWidth={4}
                        />
                    )}

                    {/* Start & End Markers */}
                    {historyPath.length > 0 && (
                        <>
                            <Marker
                                coordinate={{ latitude: historyPath[0].latitude, longitude: historyPath[0].longitude }}
                                title="Départ"
                            >
                                <View style={[styles.endpointMarker, { backgroundColor: '#16A34A' }]}>
                                    <Text style={styles.endpointText}>D</Text>
                                </View>
                            </Marker>
                            <Marker
                                coordinate={{
                                    latitude: historyPath[historyPath.length - 1].latitude,
                                    longitude: historyPath[historyPath.length - 1].longitude,
                                }}
                                title="Arrivée"
                            >
                                <View style={[styles.endpointMarker, { backgroundColor: '#DC2626' }]}>
                                    <Text style={styles.endpointText}>A</Text>
                                </View>
                            </Marker>
                        </>
                    )}

                    {/* Animated Moving Marker — only shown during or after playback */}
                    {currentPoint && (isPlaying || playbackIndex > 0) && (
                        <Marker
                            coordinate={{ latitude: currentPoint.latitude, longitude: currentPoint.longitude }}
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View style={styles.movingMarker}>
                                <Navigation size={20} color="#FFFFFF" fill="#FFFFFF" />
                            </View>
                        </Marker>
                    )}
                </MapView>

                {loading && (
                    <View style={styles.loaderOverlay}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={styles.loaderText}>Chargement du parcours...</Text>
                    </View>
                )}
            </View>

            {/* Bottom Floating Stats & Player Card */}
            <View style={styles.bottomCard}>
                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Route size={16} color="#2563EB" />
                        <Text style={styles.statLabel}>Distance</Text>
                        <Text style={styles.statValue}>{stats.distance} km</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Gauge size={16} color="#16A34A" />
                        <Text style={styles.statLabel}>Vitesse Max</Text>
                        <Text style={styles.statValue}>{stats.maxSpeed} km/h</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Clock size={16} color="#8B5CF6" />
                        <Text style={styles.statLabel}>Durée</Text>
                        <Text style={styles.statValue}>{stats.duration}</Text>
                    </View>
                </View>

                {/* Playback Controls */}
                {historyPath.length > 0 ? (
                    <View style={styles.playerRow}>
                        <TouchableOpacity
                            style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                            onPress={() => setIsPlaying(!isPlaying)}
                            activeOpacity={0.8}
                        >
                            {isPlaying ? (
                                <Pause size={18} color="#FFFFFF" fill="#FFFFFF" />
                            ) : (
                                <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                            )}
                        </TouchableOpacity>

                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${((playbackIndex + 1) / historyPath.length) * 100}%` },
                                    ]}
                                />
                            </View>
                            <View style={styles.progressTextRow}>
                                <Text style={styles.progressText}>
                                    {currentPoint
                                        ? new Date(currentPoint.timestamp).toLocaleTimeString('fr-FR', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : '--:--'}
                                </Text>
                                <Text style={styles.speedLiveText}>
                                    {currentPoint ? `${Math.round(currentPoint.speed)} km/h` : '0 km/h'}
                                </Text>
                            </View>
                        </View>

                        {/* Speed Toggle */}
                        <TouchableOpacity
                            style={styles.speedBtn}
                            onPress={() => setPlaybackSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                        >
                            <Text style={styles.speedBtnText}>{playbackSpeed}x</Text>
                        </TouchableOpacity>

                        {/* Reset */}
                        <TouchableOpacity
                            style={styles.resetBtn}
                            onPress={() => {
                                setIsPlaying(false);
                                setPlaybackIndex(0);
                            }}
                        >
                            <RotateCcw size={16} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.noDataRow}>
                        <Text style={styles.noDataText}>Aucun déplacement (&gt; 5 km/h) sur cette période</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    topBar: {
        backgroundColor: '#FFFFFF',
        paddingTop: 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    vehicleScroll: {
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 8,
    },
    vehicleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    vehicleChipActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    vehicleDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    vehicleChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    vehicleChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    periodRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 6,
    },
    periodBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    periodBtnActive: {
        backgroundColor: '#0F172A',
        borderColor: '#0F172A',
    },
    periodText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    periodTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    mapContainer: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 10,
        fontSize: 13,
        fontWeight: '600',
        color: '#2563EB',
    },
    endpointMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    endpointText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
    movingMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 5,
    },
    bottomCard: {
        position: 'absolute',
        bottom: 74, // Above BottomNav
        left: 12,
        right: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 2,
    },
    statValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 1,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#F1F5F9',
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        gap: 10,
    },
    playBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playBtnActive: {
        backgroundColor: '#EF4444',
    },
    progressContainer: {
        flex: 1,
    },
    progressBarBg: {
        height: 5,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#2563EB',
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    progressText: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
    },
    speedLiveText: {
        fontSize: 10,
        color: '#16A34A',
        fontWeight: '700',
    },
    speedBtn: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
    },
    speedBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0F172A',
    },
    resetBtn: {
        padding: 6,
    },
    noDataRow: {
        paddingTop: 10,
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 12,
        color: '#94A3B8',
        fontStyle: 'italic',
    },
});
