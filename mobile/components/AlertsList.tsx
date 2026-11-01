import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { ShieldAlert, AlertTriangle, Bell, BellOff, Zap, MapPin, Gauge, CheckCircle, RefreshCw, Clock } from 'lucide-react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/Config';
import { useSocket } from '../hooks/useSocket';

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

interface AlertsListProps {
    onSelectVehicle?: (deviceId: string) => void;
    snoozeUntil?: number | null;
    onSnoozeChange?: (until: number | null) => void;
}

const SNOOZE_OPTIONS: { label: string; ms: number }[] = [
    { label: '30 min', ms: 30 * 60 * 1000 },
    { label: '1 h', ms: 60 * 60 * 1000 },
    { label: '8 h', ms: 8 * 60 * 60 * 1000 },
    { label: '24 h', ms: 24 * 60 * 60 * 1000 },
];

export default function AlertsList({
    onSelectVehicle,
    snoozeUntil = null,
    onSnoozeChange,
}: AlertsListProps) {
    const socket = useSocket();
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [now, setNow] = useState(Date.now());

    // Update countdown every 15s while snoozed
    useEffect(() => {
        if (!snoozeUntil || snoozeUntil <= Date.now()) return;
        const id = setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (snoozeUntil && current >= snoozeUntil && onSnoozeChange) {
                onSnoozeChange(null);
            }
        }, 15000);
        return () => clearInterval(id);
    }, [snoozeUntil, onSnoozeChange]);

    const isSnoozed = Boolean(snoozeUntil && snoozeUntil > now);

    const getRemainingLabel = () => {
        if (!snoozeUntil || snoozeUntil <= now) return '';
        const diffMin = Math.ceil((snoozeUntil - now) / 60000);
        if (diffMin >= 60) {
            const h = Math.floor(diffMin / 60);
            const m = diffMin % 60;
            return m > 0 ? `${h} h ${m} min restantes` : `${h} h restantes`;
        }
        return `${diffMin} min restantes`;
    };

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

    useEffect(() => {
        if (!socket) return;
        const onAlert = (data: any) => {
            if (!data) return;
            const item: AlertItem = {
                id: data.id || `live-${Date.now()}`,
                device_id: data.deviceId || data.device_id || '',
                vehicle_name: data.vehicle_name,
                type: data.type || 'alert',
                severity: data.severity || 'medium',
                message: data.message,
                timestamp: data.timestamp || new Date().toISOString(),
                status: data.status || 'unacknowledged',
            };
            setAlerts(prev => [item, ...prev.filter(a => String(a.id) !== String(item.id))]);
        };
        socket.on('alert', onAlert);
        return () => {
            socket.off('alert', onAlert);
        };
    }, [socket]);

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

    const renderSnoozeBar = () => (
        <View style={[styles.snoozeCard, isSnoozed && styles.snoozeCardActive]}>
            <View style={styles.snoozeHeader}>
                <View style={styles.snoozeLeft}>
                    <View style={[styles.snoozeIconBox, isSnoozed && styles.snoozeIconBoxActive]}>
                        {isSnoozed ? (
                            <BellOff size={18} color="#D97706" />
                        ) : (
                            <Bell size={18} color="#2563EB" />
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.snoozeTitle}>
                            {isSnoozed ? 'Notifications en pause (Snooze)' : 'Notifications actives'}
                        </Text>
                        <Text style={styles.snoozeSub}>
                            {isSnoozed
                                ? `Bannières désactivées · ${getRemainingLabel()}`
                                : 'Suspendez temporairement les alertes à l’écran :'}
                        </Text>
                    </View>
                </View>

                {isSnoozed && (
                    <TouchableOpacity
                        style={styles.resumeBtn}
                        onPress={() => onSnoozeChange && onSnoozeChange(null)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.resumeBtnText}>Réactiver</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.snoozePillsRow}>
                {SNOOZE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.label}
                        style={styles.snoozePill}
                        onPress={() => {
                            const until = Date.now() + opt.ms;
                            setNow(Date.now());
                            onSnoozeChange && onSnoozeChange(until);
                        }}
                        activeOpacity={0.75}
                    >
                        <Clock size={12} color="#475569" />
                        <Text style={styles.snoozePillText}>{opt.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

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
                ListHeaderComponent={renderSnoozeBar}
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
    snoozeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    snoozeCardActive: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    snoozeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    snoozeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    snoozeIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    snoozeIconBoxActive: {
        backgroundColor: '#FEF3C7',
    },
    snoozeTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    snoozeSub: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 1,
    },
    resumeBtn: {
        backgroundColor: '#D97706',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        marginLeft: 8,
    },
    resumeBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    snoozePillsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    snoozePill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 8,
        borderRadius: 10,
    },
    snoozePillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
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
        marginTop: 30,
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
