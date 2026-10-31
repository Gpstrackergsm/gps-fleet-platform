import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { ShieldAlert, AlertTriangle, Bell, Zap, MapPin, Gauge, CheckCircle, RefreshCw } from 'lucide-react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/Config';

interface AlertItem {
    id: string | number;
    device_id: string;
    vehicle_name?: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'warning' | 'info';
    message?: string;
    timestamp: string;
    status?: string;
}

export default function AlertsList({ onSelectVehicle }: { onSelectVehicle?: (deviceId: string) => void }) {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAlerts = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const res = await axios.get(`${API_URL}/api/alerts?limit=50`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                timeout: 8000,
            });

            if (Array.isArray(res.data)) {
                setAlerts(res.data);
            }
        } catch (err) {
            console.warn('Failed to fetch alerts:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAlerts();
    };

    const getAlertIcon = (type: string, severity: string) => {
        const lowerType = (type || '').toLowerCase();
        if (lowerType.includes('speed') || lowerType.includes('vitesse')) {
            return <Gauge size={20} color="#EF4444" />;
        }
        if (lowerType.includes('geofence') || lowerType.includes('zone')) {
            return <MapPin size={20} color="#F59E0B" />;
        }
        if (lowerType.includes('power') || lowerType.includes('engine') || lowerType.includes('moteur')) {
            return <Zap size={20} color="#8B5CF6" />;
        }
        if (severity === 'critical' || severity === 'high') {
            return <ShieldAlert size={20} color="#EF4444" />;
        }
        return <AlertTriangle size={20} color="#F59E0B" />;
    };

    const getSeverityBadgeColor = (severity: string) => {
        switch (severity) {
            case 'critical':
            case 'high':
                return { bg: '#FEE2E2', text: '#DC2626' };
            case 'medium':
            case 'warning':
                return { bg: '#FEF3C7', text: '#D97706' };
            default:
                return { bg: '#E0F2FE', text: '#0284C7' };
        }
    };

    const renderItem = ({ item }: { item: AlertItem }) => {
        const badgeColors = getSeverityBadgeColor(item.severity);
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });

        return (
            <TouchableOpacity
                style={styles.alertCard}
                activeOpacity={0.7}
                onPress={() => onSelectVehicle && onSelectVehicle(item.device_id)}
            >
                <View style={styles.iconCircle}>
                    {getAlertIcon(item.type, item.severity)}
                </View>

                <View style={styles.alertInfo}>
                    <View style={styles.alertHeaderRow}>
                        <Text style={styles.vehicleName} numberOfLines={1}>
                            {item.vehicle_name || item.device_id}
                        </Text>
                        <View style={[styles.severityBadge, { backgroundColor: badgeColors.bg }]}>
                            <Text style={[styles.severityText, { color: badgeColors.text }]}>
                                {item.severity?.toUpperCase() || 'ALERTE'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.alertMessage} numberOfLines={2}>
                        {item.message || item.type || 'Alerte détectée'}
                    </Text>

                    <Text style={styles.alertTimestamp}>{formattedDate}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Chargement des alertes...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={alerts}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Bell size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyTitle}>Aucune alerte récente</Text>
                        <Text style={styles.emptySubtitle}>
                            Toutes vos alertes de vitesse, de geofence et de sécurité apparaîtront ici.
                        </Text>
                        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                            <RefreshCw size={14} color="#2563EB" style={{ marginRight: 6 }} />
                            <Text style={styles.refreshBtnText}>Actualiser</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    alertInfo: {
        flex: 1,
    },
    alertHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    vehicleName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
        marginRight: 8,
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    severityText: {
        fontSize: 10,
        fontWeight: '700',
    },
    alertMessage: {
        fontSize: 13,
        color: '#334155',
        lineHeight: 18,
        marginBottom: 6,
    },
    alertTimestamp: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
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
        marginBottom: 20,
        lineHeight: 20,
    },
    refreshBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    refreshBtnText: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '600',
    },
});
