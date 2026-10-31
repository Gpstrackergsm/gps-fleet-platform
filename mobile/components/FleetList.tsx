import React, { useState, useEffect, memo, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Navigation, CircleParking, MapPin, Signal, Wifi, Key, Power, Search, X, SlidersHorizontal, Car } from 'lucide-react-native';
import { GOOGLE_MAPS_API_KEY } from '../constants/Config';

export interface Vehicle {
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

type FilterState = 'all' | 'moving' | 'idling' | 'parked' | 'offline';

export function getVehicleState(v: Vehicle): 'moving' | 'idling' | 'parked' | 'offline' {
    if (v.current_state) return v.current_state;
    const lastTime = new Date(v.lastUpdate).getTime();
    const ageMs = Date.now() - lastTime;
    if (ageMs > 3 * 60 * 1000) return 'offline';
    if (!v.accStatus && v.speed <= 3) return 'parked';
    if (v.accStatus && v.speed <= 3) return 'idling';
    return 'moving';
}

export function getVehicleStateColor(state: string) {
    if (state === 'moving') return '#22C55E';
    if (state === 'idling') return '#F59E0B';
    if (state === 'parked') return '#3B82F6';
    return '#64748B';
}

export function getVehicleStateLabel(state: string) {
    if (state === 'moving') return 'En route';
    if (state === 'idling') return 'Au ralenti';
    if (state === 'parked') return 'Stationné';
    return 'Hors ligne';
}

// Global in-memory cache for coordinates to avoid redundant network calls
const addressCache = new Map<string, string>();

function cleanBilingual(txt: string): string {
    if (!txt) return '';
    return txt.replace(/\s+[\u0600-\u06FF\u2D30-\u2D7F]+.*$/, '').trim();
}

async function getFormattedAddress(lat: number, lng: number): Promise<string> {
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        return 'Position en attente';
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (addressCache.has(cacheKey)) {
        return addressCache.get(cacheKey)!;
    }

    // 1. Try Photon Komoot reverse geocode (specialized in street, lotissement, and building level)
    try {
        const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            const props = data.features?.[0]?.properties;
            if (props) {
                const street = cleanBilingual(props.street || '');
                const houseNumber = props.housenumber || '';
                const name = cleanBilingual(props.name || '');
                const locality = cleanBilingual(props.locality || props.quarter || props.district || '');
                const city = cleanBilingual(props.city || 'Marrakech');

                let streetPart = '';
                if (street) {
                    streetPart = houseNumber ? `${houseNumber} ${street}` : street;
                } else if (name && name !== city && name !== locality) {
                    streetPart = name;
                }

                const parts = [];
                if (streetPart) parts.push(streetPart);
                if (locality && locality !== streetPart && locality !== city) parts.push(locality);
                if (city) parts.push(city);

                if (parts.length >= 1) {
                    const result = parts.join(', ');
                    addressCache.set(cacheKey, result);
                    return result;
                }
            }
        }
    } catch {
        // Fallback to next provider
    }

    // 2. Try OpenStreetMap Nominatim with zoom=18 for high-detail road/residential/quarter
    try {
        const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=fr`;
        const res = await fetch(osmUrl, {
            headers: { 'User-Agent': 'GPSEU-App/1.0' }
        });
        if (res.ok) {
            const data = await res.json();
            const addr = data.address;
            if (addr) {
                const road = cleanBilingual(addr.road || addr.pedestrian || addr.footway || addr.street || '');
                const quarter = cleanBilingual(addr.quarter || addr.residential || addr.neighbourhood || addr.suburb || '');
                const city = cleanBilingual(addr.city || addr.town || addr.village || 'Marrakech');

                const parts = [];
                if (road) parts.push(road);
                if (quarter && !parts.includes(quarter)) parts.push(quarter);
                if (city && !parts.includes(city)) parts.push(city);

                const result = parts.join(', ');
                if (result) {
                    addressCache.set(cacheKey, result);
                    return result;
                }
            }
        }
    } catch {
        // Fallback to next provider
    }

    // 3. Fallback to BigDataCloud
    try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=fr`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            const city = data.city || data.locality || '';
            const adminList = data.localityInfo?.administrative || [];
            const suburbObj = adminList
                .filter((a: any) => a.adminLevel && a.adminLevel >= 8)
                .sort((a: any, b: any) => b.adminLevel - a.adminLevel)[0];
            const suburb = suburbObj?.name || '';

            let result = '';
            if (suburb && city && suburb !== city) {
                result = `${suburb}, ${city}`;
            } else if (city) {
                result = city;
            }

            if (result) {
                addressCache.set(cacheKey, result);
                return result;
            }
        }
    } catch {
        // Fallback to coordinates
    }

    // 4. Coordinates fallback
    const fallback = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    addressCache.set(cacheKey, fallback);
    return fallback;
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

    // Geocoding with automatic provider fallback
    useEffect(() => {
        let isMounted = true;
        const fetchAddress = async () => {
            if (lastFetchCoords) {
                const diffLat = Math.abs(item.lat - lastFetchCoords.lat);
                const diffLng = Math.abs(item.lng - lastFetchCoords.lng);
                if (diffLat < 0.0005 && diffLng < 0.0005) return;
            }

            const addr = await getFormattedAddress(item.lat, item.lng);
            if (isMounted) {
                setAddress(addr);
                setLastFetchCoords({ lat: item.lat, lng: item.lng });
            }
        };

        fetchAddress();
        return () => { isMounted = false; };
    }, [item.lat, item.lng, lastFetchCoords]);

    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: `${stateColor}15` }]}>
                {state === 'moving' ? (
                    <Navigation
                        size={22}
                        color={stateColor}
                        fill={stateColor}
                        style={item.course ? { transform: [{ rotate: `${item.course}deg` }] } : {}}
                    />
                ) : state === 'idling' ? (
                    <Key size={20} color={stateColor} />
                ) : state === 'parked' ? (
                    <Text style={{ fontSize: 18, fontWeight: '900', color: stateColor }}>P</Text>
                ) : (
                    <Power size={20} color={stateColor} />
                )}
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                    <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<FilterState>('all');

    const vehicleList = useMemo(() => Object.values(vehicles), [vehicles]);

    // Calculate state counts
    const counts = useMemo(() => {
        let moving = 0;
        let idling = 0;
        let parked = 0;
        let offline = 0;

        vehicleList.forEach(v => {
            const state = getVehicleState(v);
            if (state === 'moving') moving++;
            else if (state === 'idling') idling++;
            else if (state === 'parked') parked++;
            else offline++;
        });

        return {
            all: vehicleList.length,
            moving,
            idling,
            parked,
            offline,
        };
    }, [vehicleList]);

    // Filter vehicles by search query & status filter
    const filteredVehicles = useMemo(() => {
        return vehicleList.filter(v => {
            // Filter by status
            if (selectedFilter !== 'all') {
                const state = getVehicleState(v);
                if (state !== selectedFilter) return false;
            }

            // Filter by search query
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const matchName = v.name.toLowerCase().includes(query);
                const matchId = v.id.toLowerCase().includes(query);
                return matchName || matchId;
            }

            return true;
        });
    }, [vehicleList, selectedFilter, searchQuery]);

    const filterOptions: { key: FilterState; label: string; count: number; color: string }[] = [
        { key: 'all', label: 'Tous', count: counts.all, color: '#0F172A' },
        { key: 'moving', label: 'En route', count: counts.moving, color: '#22C55E' },
        { key: 'idling', label: 'Au ralenti', count: counts.idling, color: '#F59E0B' },
        { key: 'parked', label: 'Stationné', count: counts.parked, color: '#3B82F6' },
        { key: 'offline', label: 'Hors ligne', count: counts.offline, color: '#64748B' },
    ];

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher un véhicule..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <X size={16} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.filtersWrapper}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={filterOptions}
                    keyExtractor={item => item.key}
                    contentContainerStyle={styles.filterList}
                    renderItem={({ item }) => {
                        const isSelected = selectedFilter === item.key;
                        return (
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    isSelected && { backgroundColor: item.color, borderColor: item.color }
                                ]}
                                onPress={() => setSelectedFilter(item.key)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        styles.filterDot,
                                        { backgroundColor: isSelected ? '#FFFFFF' : item.color }
                                    ]}
                                />
                                <Text style={[
                                    styles.filterChipText,
                                    isSelected && styles.filterChipTextActive
                                ]}>
                                    {item.label}
                                </Text>
                                <View style={[
                                    styles.countBadge,
                                    isSelected ? styles.countBadgeActive : { backgroundColor: `${item.color}15` }
                                ]}>
                                    <Text style={[
                                        styles.countBadgeText,
                                        isSelected ? styles.countBadgeTextActive : { color: item.color }
                                    ]}>
                                        {item.count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* Vehicle List */}
            {filteredVehicles.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Car size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyTitle}>Aucun véhicule trouvé</Text>
                    <Text style={styles.emptySubtitle}>
                        {searchQuery
                            ? `Aucun résultat pour "${searchQuery}"`
                            : `Aucun véhicule avec le statut "${filterOptions.find(f => f.key === selectedFilter)?.label}"`}
                    </Text>
                    {(searchQuery !== '' || selectedFilter !== 'all') && (
                        <TouchableOpacity
                            style={styles.resetBtn}
                            onPress={() => {
                                setSearchQuery('');
                                setSelectedFilter('all');
                            }}
                        >
                            <Text style={styles.resetBtnText}>Réinitialiser les filtres</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filteredVehicles}
                    renderItem={({ item }) => <FleetItem item={item} onPress={onVehiclePress} />}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: '#FFFFFF',
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0F172A',
        paddingVertical: 0,
    },
    filtersWrapper: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 10,
    },
    filterList: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    filterDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    countBadge: {
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    countBadgeActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    countBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    countBadgeTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100, // Extra padding for bottom bar
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    addressText: {
        fontSize: 12,
        color: '#64748B',
        flex: 1,
        fontWeight: '500',
    },
    alarmBadge: {
        backgroundColor: '#EF4444',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
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
        gap: 6,
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 5,
    },
    metricText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
    },
    lastUpdateText: {
        fontSize: 11,
        color: '#94A3B8',
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
        gap: 4,
    },
    badgeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        marginTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 16,
    },
    resetBtn: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    resetBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
