import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Map, Car, Clock, Bell, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export type TabType = 'map' | 'vehicles' | 'history' | 'alerts' | 'settings';

interface BottomNavProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    vehicleCount?: number;
    alertCount?: number;
}

export default function BottomNav({ activeTab, onTabChange, vehicleCount = 0, alertCount = 0 }: BottomNavProps) {
    const handlePress = (tab: TabType) => {
        if (Platform.OS === 'ios') {
            try {
                Haptics.selectionAsync();
            } catch {
                // Ignore haptics error if unsupported
            }
        }
        onTabChange(tab);
    };

    const tabs: { key: TabType; label: string; icon: any; badge?: number }[] = [
        { key: 'map', label: 'Carte', icon: Map },
        { key: 'vehicles', label: 'Véhicules', icon: Car, badge: vehicleCount },
        { key: 'history', label: 'Historique', icon: Clock },
        { key: 'alerts', label: 'Alertes', icon: Bell, badge: alertCount },
        { key: 'settings', label: 'Paramètres', icon: Settings },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.navBar}>
                {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.key;

                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tabBtn}
                            onPress={() => handlePress(tab.key)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconWrapper}>
                                <IconComponent
                                    size={22}
                                    color={isActive ? '#2563EB' : '#94A3B8'}
                                    strokeWidth={isActive ? 2.4 : 1.8}
                                />
                                {tab.badge !== undefined && tab.badge > 0 && (
                                    <View style={[styles.badge, tab.key === 'alerts' && styles.alertBadge]}>
                                        <Text style={styles.badgeText}>
                                            {tab.badge > 99 ? '99+' : tab.badge}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                {tab.label}
                            </Text>
                            {isActive && <View style={styles.activeIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        paddingTop: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 10,
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    tabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: 4,
        position: 'relative',
    },
    iconWrapper: {
        position: 'relative',
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#64748B',
        marginTop: 3,
    },
    tabLabelActive: {
        color: '#2563EB',
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        top: -8,
        width: 32,
        height: 3,
        backgroundColor: '#2563EB',
        borderRadius: 2,
    },
    badge: {
        position: 'absolute',
        top: -3,
        right: -8,
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    alertBadge: {
        backgroundColor: '#EF4444',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
    },
});
