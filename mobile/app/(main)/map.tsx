import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from '../../components/SafeMap';
import { Navigation, CircleParking } from 'lucide-react-native';
import { useSocket } from '../../hooks/useSocket';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../constants/Config';

interface Vehicle {
    id: string;
    name: string;
    lat: number;
    lng: number;
    speed: number;
    course?: number;
    status: string;
    current_state?: 'moving' | 'idling' | 'parked' | 'offline';
    lastUpdate: Date | string;
}

export default function MapScreen() {
    const socket = useSocket();
    const mapRef = useRef<MapView>(null);
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const [loading, setLoading] = useState(true);

    // Initial Fetch
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
                        course: d.course,
                        status: d.status || 'offline',
                        current_state: d.current_state,
                        lastUpdate: d.last_update ? new Date(d.last_update) : new Date(),
                    };
                });
                setVehicles(vehicleMap);
                setLoading(false);

                // Fit to elements if vehicles exist
                if (Object.keys(vehicleMap).length > 0 && mapRef.current) {
                    // Optional: auto-fit logic here
                }

            } catch (err) {
                console.error('Failed to fetch devices:', err);
                setLoading(false);
            }
        };

        fetchDevices();
    }, []);

    // Socket Updates
    useEffect(() => {
        if (!socket) return;

        socket.on('position', (data: any) => {
            setVehicles(prev => {
                const deviceId = data.deviceId;
                const existing = prev[deviceId];

                return {
                    ...prev,
                    [deviceId]: {
                        id: deviceId,
                        name: existing?.name || `Vehicle ${deviceId.slice(-4)}`,
                        lat: data.lat,
                        lng: data.lng,
                        speed: data.speed,
                        course: data.course,
                        status: 'online',
                        current_state: data.state,
                        lastUpdate: new Date(),
                    }
                };
            });
        });

        return () => {
            socket.off('position');
        };
    }, [socket]);

    const DEFAULT_REGION = {
        latitude: 33.5731,
        longitude: -7.5898,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={DEFAULT_REGION}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {Object.values(vehicles).map(vehicle => (
                    <Marker
                        key={vehicle.id}
                        coordinate={{ latitude: vehicle.lat, longitude: vehicle.lng }}
                        title={vehicle.name}
                        description={`Speed: ${Math.round(vehicle.speed)} km/h`}
                    >
                        <View style={styles.markerContainer}>
                            <View style={styles.markerBubble}>
                                <Text style={styles.markerText}>{vehicle.name}</Text>
                            </View>
                            {vehicle.speed > 0 ? (
                                <Navigation
                                    size={24}
                                    color="#10B981"
                                    fill="#10B981"
                                    style={{ transform: [{ rotate: `${vehicle.course || 0}deg` }] }}
                                />
                            ) : (
                                <CircleParking size={24} color="#F59E0B" fill="#F59E0B" />
                            )}
                        </View>
                    </Marker>
                ))}
            </MapView>

            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                <View style={styles.header}>
                    <Text style={styles.headerText}>Carte Globale</Text>
                    <Text style={styles.subText}>{Object.keys(vehicles).length} véhicle(s) actif(s)</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
        padding: 16,
    },
    header: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    subText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerBubble: {
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    markerText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#374151',
    },
});
