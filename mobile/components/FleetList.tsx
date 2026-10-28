import React, { useState, useEffect, memo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Navigation, CircleParking, MapPin, Signal, Wifi, Key, Power } from 'lucide-react-native';
import { GOOGLE_MAPS_API_KEY } from '../constants/Config';

interface Vehicle {
    id: string;
    name: string;
    lat: number;
    lng: number;
    speed: number;
    course?: number;
    alarm?: string;
    accStatus?: boolean;
    lastUpdate: Date | string;
    status: string;
    current_state?: 'moving' | 'idling' | 'parked' | 'offline';
    state_start_time?: string | Date;
    trip_distance?: number;
    internetStatus?: boolean;
    gpsStatus?: boolean;
}

interface FleetListProps {
    vehicles: { [key: string]: Vehicle };
    onVehiclePress: (vehicle: Vehicle) => void;
}

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
    if (state === 'moving') return '#22C55E';
    if (state === 'idling') return '#F59E0B';
    if (state === 'parked') return '#3B82F6';
    return '#64748B';
}

function getVehicleStateLabel(state: string) {
    if (state === 'moving') return 'En route';
    if (state === 'idling') return 'Au ralenti';
    if (state === 'parked') return 'Stationné';
    return 'Hors ligne';
}

// Memoized Item Component to handle individual address fetching
const FleetItem = memo(({ item, onPress }: { item: Vehicle, onPress: (v: Vehicle) => void }) => {
    const [address, setAddress] = useState<string>('Localisation...');
    const [lastFetchCoords, setLastFetchCoords] = useState<{ lat: number, lng: number } | null>(null);

    const state = getVehicleState(item);
    const stateColor = getVehicleStateColor(state);
    const stateLabel = getVehicleStateLabel(state);

    // Duration & Online Status Logic
    const [durationStr, setDurationStr] = useState('');
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const updateStatus = () => {
            const now = Date.now();

            // Network Status Logic (30s timeout)
            const lastUpdate = new Date(item.lastUpdate).getTime();
            setIsOnline(now - lastUpdate < 30000);

            // Duration Logic
            if (!item.state_start_time) {
                setDurationStr('');
                return;
            }
            const start = new Date(item.state_start_time).getTime();
            const lastUpdateTs = item.lastUpdate ? new Date(item.lastUpdate).getTime() : now;

            const diffMs = Math.max(0, Math.max(now - start, lastUpdateTs - start));
            const totalSeconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) setDurationStr(`${days}j ${hours % 24}h`);
            else if (hours > 0) setDurationStr(`${hours}h ${minutes % 60}m`);
            else setDurationStr(`${minutes}m ${totalSeconds % 60}s`);
        };

        updateStatus();
        const interval = setInterval(updateStatus, 1000);
        return () => clearInterval(interval);
    }, [item.state_start_time, item.lastUpdate]);

    // Geocoding with simple caching
    useEffect(() => {
        const fetchAddress = async () => {
            if (lastFetchCoords) {
                const diffLat = Math.abs(item.lat - lastFetchCoords.lat);
                const diffLng = Math.abs(item.lng - lastFetchCoords.lng);
                if (diffLat < 0.0005 && diffLng < 0.0005) return;
            }

            try {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${item.lat},${item.lng}&key=${GOOGLE_MAPS_API_KEY}&region=MA`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.results?.[0]) {
                    setAddress(data.results[0].formatted_address.replace(', Maroc', ''));
                    setLastFetchCoords({ lat: item.lat, lng: item.lng });
                } else {
                    setAddress('Adresse inconnue');
                }
            } catch {
                setAddress('Adresse indisponible');
            }
        };

        fetchAddress();
    }, [item.lat, item.lng, lastFetchCoords]);

    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: `${stateColor}15` }]}>
                {state === 'moving' ? (
                    <Navigation
                        size={20}
                        color={stateColor}
                        fill={stateColor}
                        style={item.course ? { transform: [{ rotate: `${item.course}deg` }] } : {}}
                    />
                ) : state === 'idling' ? (
                    <Key size={18} color={stateColor} />
                ) : state === 'parked' ? (
                    <Text style={{ fontSize: 16, fontWeight: '900', color: stateColor }}>P</Text>
                ) : (
                    <Power size={18} color={stateColor} />
                )}
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                        <View style={[styles.badge, { backgroundColor: `${stateColor}18`, borderColor: stateColor }]}>
                            <View style={[styles.badgeDot, { backgroundColor: stateColor }]} />
                            <Text style={[styles.badgeText, { color: stateColor }]}>{stateLabel}</Text>
                        </View>
                        {item.alarm && (
                            <View style={styles.alarmBadge}>
                                <Text style={styles.alarmText}>{item.alarm}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.lastUpdateText}>
                        {new Date(item.lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>

                {/* Address */}
                <View style={styles.row}>
                    <MapPin size={11} color="#9CA3AF" style={{ marginRight: 4 }} />
                    <Text style={styles.addressText} numberOfLines={1}>{address}</Text>
                </View>

                {/* Status Metrics */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                        <View style={[styles.statusDot, { backgroundColor: stateColor }]} />
                        <Text style={styles.metricText}>
                            {state === 'moving' ? `${Math.round(item.speed)} km/h` : stateLabel}
                        </Text>
                    </View>

                    {durationStr ? (
                        <View style={styles.metricItem}>
                            <Text style={styles.metricText}>{durationStr}</Text>
                        </View>
                    ) : null}

                    {/* ACC Status */}
                    <View style={styles.metricItem}>
                        <Text style={[styles.metricText, { color: item.accStatus ? '#22C55E' : '#94A3B8' }]}>
                            {item.accStatus ? 'ACC ON' : 'ACC OFF'}
                        </Text>
                    </View>

                    {/* Network Status */}
                    <View style={styles.metricItem}>
                        <Wifi size={12} color={isOnline ? '#22C55E' : '#94A3B8'} />
                    </View>

                    {/* GPS Status */}
                    <View style={styles.metricItem}>
                        <Signal size={12} color={item.gpsStatus ? '#22C55E' : '#94A3B8'} />
                    </View>
                </View>
            </View>

            <Navigation size={14} color="#CBD5E1" />
        </TouchableOpacity>
    );
});
FleetItem.displayName = 'FleetItem';

export default function FleetList({ vehicles, onVehiclePress }: FleetListProps) {
    const vehicleList = Object.values(vehicles);

    if (vehicleList.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun véhicule trouvé</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={vehicleList}
            renderItem={({ item }) => <FleetItem item={item} onPress={onVehiclePress} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
        />
    );
}

const styles = StyleSheet.create({
    listContent: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000', // Strong Black
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6, // Slightly more space
        flexWrap: 'wrap', // Allow wrap if needed
    },
    statusText: {
        fontSize: 14,
        fontWeight: '700', // Bolder
    },
    dot: {
        marginHorizontal: 6,
        color: '#9CA3AF',
    },
    speed: {
        fontSize: 14,
        color: '#2563EB', // Blue for contrast
        fontWeight: '600',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
        paddingRight: 8,
    },
    addressText: {
        fontSize: 13,
        color: '#374151', // Darker gray for visibility
        flex: 1,
        fontWeight: '500',
    },
    lastSeen: {
        fontSize: 12,
        color: '#4B5563', // Darker gray than before
        marginTop: 2,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
    },
    alarmBadge: {
        backgroundColor: '#EF4444',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
        marginBottom: 4,
    },
    alarmText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    metricText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    lastUpdateText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        marginLeft: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        gap: 4
    },
    badgeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700'
    }
});
