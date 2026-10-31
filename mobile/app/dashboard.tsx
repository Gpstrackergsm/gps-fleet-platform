import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Navigation, Key, LocateFixed, Layers, X, Car } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSocket } from '../hooks/useSocket';
import axios from 'axios';
import { API_URL } from '../constants/Config';
import FleetList, { Vehicle, getVehicleState, getVehicleStateColor, getVehicleStateLabel } from '../components/FleetList';
import BottomNav, { TabType } from '../components/BottomNav';
import HistoryView from '../components/HistoryView';
import AlertsList from '../components/AlertsList';
import AlertBanner, { BannerAlert } from '../components/AlertBanner';
import SettingsScreen from '../components/SettingsScreen';

// Clean Google Satellite Map: only street/road names visible, all POI icons hidden
const CUSTOM_MAP_STYLE = [
    // Hide ALL points of interest and their icons
    { featureType: 'poi',                  elementType: 'all',    stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.business',         elementType: 'all',    stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.attraction',       elementType: 'all',    stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.government',       elementType: 'all',    stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.medical',          elementType: 'all',    stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park',             elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.place_of_worship', elementType: 'all',    stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.school',           elementType: 'all',    stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.sports_complex',   elementType: 'all',    stylers: [{ visibility: 'off' }] },
    // Hide all transit stations
    { featureType: 'transit',              elementType: 'all',    stylers: [{ visibility: 'off' }] },
    // Keep road/street labels clearly visible
    { featureType: 'road',                 elementType: 'labels', stylers: [{ visibility: 'on' }] },
    { featureType: 'road.arterial',        elementType: 'labels', stylers: [{ visibility: 'on' }] },
    { featureType: 'road.local',           elementType: 'labels', stylers: [{ visibility: 'on' }] },
];

// Real Fleet Position (Centered around the actual vehicles in Marrakech)
const DEFAULT_REGION = {
    latitude: 31.6650,
    longitude: -8.0500,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
};

export default function Dashboard() {
    const router = useRouter();
    const socket = useSocket();
    const mapRef = useRef<any>(null);

    const [activeTab, setActiveTab] = useState<TabType>('map');
    const [mapType, setMapType] = useState<'hybrid' | 'standard'>('standard');
    const [showTraffic, setShowTraffic] = useState(false);
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const lastTrackedVehicleId = useRef<string | null>(null);
    const [durationStr, setDurationStr] = useState('');
    const hasAutoFitted = useRef(false);

    // Notification state
    const [activeBanner, setActiveBanner] = useState<BannerAlert | null>(null);
    const [unreadAlertCount, setUnreadAlertCount] = useState(0);
    const speedAlertSentRef = useRef<Record<string, number>>({}); // deviceId -> last alert timestamp
    const offlineAlertSentRef = useRef<Record<string, number>>({}); // deviceId -> last alert timestamp
    const SPEED_THRESHOLD = 100; // km/h
    const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    const showBanner = (banner: BannerAlert) => {
        setActiveBanner(banner);
        setUnreadAlertCount(prev => prev + 1);
    };

    const handleTestEngineAlert = (state: 'on' | 'off') => {
        const vehicleName = selectedVehicle?.name || (Object.values(vehicles)[0]?.name) || 'V1';
        showBanner({
            id: `test-engine-${Date.now()}`,
            type: 'engine',
            subType: state,
            vehicleName: vehicleName,
            message: state === 'on' ? 'Contact mis : Moteur allumé' : 'Contact coupé : Moteur arrêté',
            timestamp: Date.now(),
        });
    };

    // Demonstration test notifications for user testing (3s and 9s after launch)
    useEffect(() => {
        const timerOn = setTimeout(() => {
            const vName = (Object.values(vehicles)[0]?.name) || 'V1';
            showBanner({
                id: `demo-engine-on-${Date.now()}`,
                type: 'engine',
                subType: 'on',
                vehicleName: vName,
                message: 'Contact mis : Moteur allumé (Test)',
                timestamp: Date.now(),
            });
        }, 3000);

        const timerOff = setTimeout(() => {
            const vName = (Object.values(vehicles)[0]?.name) || 'V1';
            showBanner({
                id: `demo-engine-off-${Date.now()}`,
                type: 'engine',
                subType: 'off',
                vehicleName: vName,
                message: 'Contact coupé : Moteur arrêté (Test)',
                timestamp: Date.now(),
            });
        }, 9000);

        return () => {
            clearTimeout(timerOn);
            clearTimeout(timerOff);
        };
    }, []);


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

    // Initial Fetch of Devices
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
                        lat: Number(d.lat) || 31.6650,
                        lng: Number(d.lng) || -8.0500,
                        speed: d.speed || 0,
                        trip_distance: d.trip_distance,
                        course: d.course,
                        accStatus: d.acc_status === 1 || d.acc_status === true,
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

                // Auto-center map to the actual fleet if not already done
                const validList = Object.values(vehicleMap).filter(v => v.lat && v.lng);
                if (!hasAutoFitted.current && validList.length > 0 && mapRef.current) {
                    hasAutoFitted.current = true;
                    if (validList.length === 1) {
                        mapRef.current.animateToRegion({
                            latitude: validList[0].lat,
                            longitude: validList[0].lng,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        }, 500);
                    } else {
                        mapRef.current.fitToCoordinates(
                            validList.map(v => ({ latitude: v.lat, longitude: v.lng })),
                            { edgePadding: { top: 120, right: 60, bottom: 180, left: 60 }, animated: true }
                        );
                    }
                }
            } catch (err) {
                console.error('Failed to fetch devices:', err);
            }
        };

        fetchDevices();
        const interval: ReturnType<typeof setInterval> = setInterval(fetchDevices, 30000);
        return () => clearInterval(interval);
    }, []);

    // Auto-fit bounds on initial load
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
                        edgePadding: { top: 120, right: 60, bottom: 140, left: 60 },
                        animated: true,
                    }
                );
            }
        }
    }, [vehicles]);

    // Socket updates + speed alert detection
    useEffect(() => {
        if (!socket) return;

        socket.on('position', (data: any) => {
            const deviceId = data.deviceId;
            const speed = data.speed || 0;

            setVehicles(prev => {
                const existing = prev[deviceId];
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
                    accStatus: data.accStatus === 1 || data.accStatus === true,
                    lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : new Date(),
                    status: 'online',
                    last_update: data.lastUpdate ? new Date(data.lastUpdate).toISOString() : new Date().toISOString(),
                    current_state: data.state,
                    state_start_time: newStateStartTime,
                    internetStatus: data.internetStatus,
                    gpsStatus: data.gpsStatus
                };

                // Engine (ACC) ON / OFF alert detection
                if (existing && existing.accStatus !== undefined && data.accStatus !== undefined) {
                    const prevAcc = existing.accStatus === 1 || existing.accStatus === true;
                    const currAcc = data.accStatus === 1 || data.accStatus === true;

                    if (prevAcc !== currAcc) {
                        const now = Date.now();
                        showBanner({
                            id: `engine-${deviceId}-${now}`,
                            type: 'engine',
                            subType: currAcc ? 'on' : 'off',
                            vehicleName: updatedVehicle.name,
                            message: currAcc
                                ? 'Contact mis : Moteur allumé'
                                : 'Contact coupé : Moteur arrêté',
                            timestamp: now,
                        });
                    }
                }

                // Speed alert — max one notification per vehicle every 2 minutes
                if (speed >= SPEED_THRESHOLD) {
                    const lastSent = speedAlertSentRef.current[deviceId] || 0;
                    const now = Date.now();
                    if (now - lastSent > 2 * 60 * 1000) {
                        speedAlertSentRef.current[deviceId] = now;
                        showBanner({
                            id: `speed-${deviceId}-${now}`,
                            type: 'speed',
                            vehicleName: updatedVehicle.name,
                            message: `Vitesse excessive : ${Math.round(speed)} km/h — limite ${SPEED_THRESHOLD} km/h`,
                            timestamp: now,
                        });
                    }
                }

                return { ...prev, [deviceId]: updatedVehicle };
            });
        });

        return () => {
            socket.off('position');
        };
    }, [socket]);

    // Offline vehicle detection — check every 2 minutes
    useEffect(() => {
        const checkOffline = () => {
            const now = Date.now();
            setVehicles(current => {
                Object.values(current).forEach(v => {
                    const lastSeen = v.lastUpdate ? v.lastUpdate.getTime() : 0;
                    const isOffline = now - lastSeen > OFFLINE_THRESHOLD_MS;
                    const lastAlerted = offlineAlertSentRef.current[v.id] || 0;
                    // Alert once per 10 minutes per vehicle when offline
                    if (isOffline && now - lastAlerted > 10 * 60 * 1000) {
                        offlineAlertSentRef.current[v.id] = now;
                        const mins = Math.floor((now - lastSeen) / 60000);
                        showBanner({
                            id: `offline-${v.id}-${now}`,
                            type: 'offline',
                            vehicleName: v.name,
                            message: `Hors ligne depuis ${mins} min — aucune donnée GPS reçue`,
                            timestamp: now,
                        });
                    }
                });
                return current; // no state mutation needed
            });
        };

        const interval = setInterval(checkOffline, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);



    const handleLogout = async () => {
        if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync('auth_token');
        } else {
            localStorage.removeItem('auth_token');
        }
        router.replace('/');
    };

    const handleVehiclePress = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setActiveTab('map');
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: vehicle.lat,
                longitude: vehicle.lng,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
            }, 600);
        }
    };

    const handleFitAll = () => {
        const valid = Object.values(vehicles).filter(v => v.lat && v.lng);
        if (valid.length === 0 || !mapRef.current) return;
        if (valid.length === 1) {
            mapRef.current.animateToRegion({
                latitude: valid[0].lat,
                longitude: valid[0].lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 600);
        } else {
            mapRef.current.fitToCoordinates(
                valid.map(v => ({ latitude: v.lat, longitude: v.lng })),
                { edgePadding: { top: 120, right: 50, bottom: 180, left: 50 }, animated: true }
            );
        }
    };

    // Auto-follow selected vehicle on position update
    useEffect(() => {
        if (activeTab === 'map' && selectedVehicle && mapRef.current && vehicles[selectedVehicle.id]) {
            const v = vehicles[selectedVehicle.id];
            const isNew = selectedVehicle.id !== lastTrackedVehicleId.current;

            mapRef.current.animateToRegion({
                latitude: v.lat,
                longitude: v.lng,
                latitudeDelta: isNew ? 0.02 : 0.01,
                longitudeDelta: isNew ? 0.02 : 0.01
            }, 1000);

            if (isNew) {
                lastTrackedVehicleId.current = selectedVehicle.id;
            }
        }
    }, [activeTab, selectedVehicle, vehicles]);

    // Header title resolver
    const getHeaderTitle = () => {
        switch (activeTab) {
            case 'map':
                return selectedVehicle ? selectedVehicle.name : 'Carte de Suivi';
            case 'vehicles':
                return `Flotte (${Object.keys(vehicles).length})`;
            case 'history':
                return 'Historique & Replay';
            case 'alerts':
                return 'Alertes & Sécurité';
            case 'settings':
                return 'Paramètres';
        }
    };

    return (
        <View style={styles.container}>
            {/* Native iOS Header */}
            <SafeAreaView style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>

                        {activeTab === 'map' && selectedVehicle && vehicles[selectedVehicle.id] && (
                            <View style={styles.headerSubRow}>
                                <View style={styles.headerStatusItem}>
                                    <View style={[
                                        styles.headerStatusDot,
                                        { backgroundColor: vehicles[selectedVehicle.id].speed > 0 ? '#10B981' : '#F59E0B' }
                                    ]} />
                                    <Text style={styles.headerSpeedText}>
                                        {vehicles[selectedVehicle.id].speed > 0
                                            ? `${Math.round(vehicles[selectedVehicle.id].speed)} km/h`
                                            : 'Stop'}
                                    </Text>
                                </View>
                                <Text style={styles.headerSeparator}>|</Text>
                                <Text style={[
                                    styles.headerAccText,
                                    { color: vehicles[selectedVehicle.id].accStatus ? '#10B981' : '#94A3B8' }
                                ]}>
                                    {vehicles[selectedVehicle.id].accStatus ? 'ACC ON' : 'ACC OFF'}
                                </Text>
                                {durationStr ? (
                                    <>
                                        <Text style={styles.headerSeparator}>|</Text>
                                        <Text style={styles.headerDurationText}>{durationStr}</Text>
                                    </>
                                ) : null}
                            </View>
                        )}
                    </View>

                    {/* Quick Map Actions in Header */}
                    {activeTab === 'map' && (
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={[styles.headerActionBtn, showTraffic && { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}
                                onPress={() => setShowTraffic(t => !t)}
                                activeOpacity={0.7}
                            >
                                <Car size={18} color={showTraffic ? '#16A34A' : '#64748B'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerActionBtn}
                                onPress={() => setMapType(m => (m === 'hybrid' ? 'standard' : 'hybrid'))}
                                activeOpacity={0.7}
                            >
                                <Layers size={18} color="#2563EB" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.headerActionBtn}
                                onPress={handleFitAll}
                                activeOpacity={0.7}
                            >
                                <LocateFixed size={18} color="#2563EB" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </SafeAreaView>

            {/* Main Content Area */}
            <View style={styles.contentContainer}>
                {/* TAB 1: LIVE MAP */}
                {activeTab === 'map' && (
                    <View style={styles.mapWrapper}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={DEFAULT_REGION}
                            showsUserLocation={true}
                            showsMyLocationButton={false}
                            mapType={mapType}
                            customMapStyle={CUSTOM_MAP_STYLE}
                            showsTraffic={showTraffic}
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
                                        onPress={() => setSelectedVehicle(vehicle)}
                                    >
                                        <View style={styles.markerContainer}>
                                            <View style={[styles.markerPill, isSelected && styles.markerPillSelected]}>
                                                <View style={[styles.markerStatusDot, { backgroundColor: color }]} />
                                                <Text style={styles.markerPillText} numberOfLines={1}>
                                                    {vehicle.name}
                                                </Text>
                                            </View>

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
                        </MapView>

                        {/* Selected Vehicle Telemetry Card */}
                        {selectedVehicle && vehicles[selectedVehicle.id] && (() => {
                            const v = vehicles[selectedVehicle.id];
                            const state = getVehicleState(v);
                            const stateColor = getVehicleStateColor(state);
                            const stateLabel = getVehicleStateLabel(state);

                            return (
                                <View style={styles.overlayContainer}>
                                    <View style={styles.telemetryCard}>
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
                                                        Mis à jour: {new Date(v.last_update).toLocaleTimeString('fr-FR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit',
                                                        })}
                                                    </Text>
                                                )}
                                            </View>
                                            <TouchableOpacity
                                                style={styles.closeBtn}
                                                onPress={() => setSelectedVehicle(null)}
                                            >
                                                <X size={18} color="#64748B" />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Telemetry Stats Grid */}
                                        <View style={styles.telemetryGrid}>
                                            <View style={styles.telemetryBox}>
                                                <Text style={styles.telemetryLabel}>VITESSE</Text>
                                                <Text style={[styles.telemetryValue, { color: v.speed > 0 ? '#16A34A' : '#94A3B8' }]}>
                                                    {Math.round(v.speed)} <Text style={{ fontSize: 10, fontWeight: 'normal' }}>km/h</Text>
                                                </Text>
                                            </View>

                                            <View style={styles.telemetryBox}>
                                                <Text style={styles.telemetryLabel}>MOTEUR</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Key size={13} color={v.accStatus ? '#16A34A' : '#64748B'} />
                                                    <Text style={[styles.telemetryValue, { color: v.accStatus ? '#16A34A' : '#64748B' }]}>
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
                                    </View>
                                </View>
                            );
                        })()}
                    </View>
                )}

                {/* TAB 2: VÉHICULES (Fleet List with Search & Filters) */}
                {activeTab === 'vehicles' && (
                    <FleetList
                        vehicles={vehicles}
                        onVehiclePress={handleVehiclePress}
                    />
                )}

                {/* TAB 3: HISTORIQUE (Dedicated Replay Screen) */}
                {activeTab === 'history' && (
                    <HistoryView
                        vehicles={vehicles}
                        initialVehicle={selectedVehicle}
                        mapType={mapType}
                        onSelectVehicle={setSelectedVehicle}
                    />
                )}

                {/* TAB 4: ALERTES */}
                {activeTab === 'alerts' && (
                    <AlertsList
                        onSelectVehicle={(deviceId) => {
                            if (vehicles[deviceId]) {
                                handleVehiclePress(vehicles[deviceId]);
                            }
                        }}
                    />
                )}

                {/* TAB 5: PARAMÈTRES */}
                {activeTab === 'settings' && (
                    <SettingsScreen
                        onLogout={handleLogout}
                        mapType={mapType}
                        onToggleMapType={setMapType}
                        onTestEngineAlert={handleTestEngineAlert}
                    />
                )}
            </View>

            {/* Floating Alert Banner */}
            <AlertBanner
                alert={activeBanner}
                onDismiss={() => setActiveBanner(null)}
            />

            {/* Bottom Navigation Bar */}
            <BottomNav
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    if (tab === 'alerts') setUnreadAlertCount(0); // clear badge when opening tab
                }}
                vehicleCount={Object.keys(vehicles).length}
                alertCount={unreadAlertCount}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    headerSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 3,
    },
    headerStatusItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 5,
    },
    headerSpeedText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0F172A',
    },
    headerSeparator: {
        fontSize: 12,
        color: '#CBD5E1',
    },
    headerAccText: {
        fontSize: 11,
        fontWeight: '700',
    },
    headerDurationText: {
        fontSize: 11,
        color: '#64748B',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
        position: 'relative',
    },
    mapWrapper: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerContainer: {
        alignItems: 'center',
    },
    markerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginBottom: 3,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    markerPillSelected: {
        borderColor: '#2563EB',
        borderWidth: 2,
    },
    markerStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 5,
    },
    markerPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0F172A',
        maxWidth: 100,
    },
    stateIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    stateParkedText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
    },
    stateOfflineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    overlayContainer: {
        position: 'absolute',
        bottom: 74, // Above BottomNav
        left: 12,
        right: 12,
    },
    telemetryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    drawerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
        maxWidth: 180,
    },
    drawerSub: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        gap: 4,
    },
    stateBadgeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    stateBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    telemetryGrid: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 10,
        marginBottom: 0,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    telemetryBox: {
        flex: 1,
        alignItems: 'center',
    },
    telemetryLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    telemetryValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A',
    },
});
