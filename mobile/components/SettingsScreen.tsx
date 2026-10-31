import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Map, Globe, LogOut, CheckCircle2, Key } from 'lucide-react-native';

interface SettingsScreenProps {
    onLogout: () => void;
    mapType: 'hybrid' | 'standard';
    onToggleMapType: (type: 'hybrid' | 'standard') => void;
    onTestEngineAlert?: (state: 'on' | 'off') => void;
}

export default function SettingsScreen({ onLogout, mapType, onToggleMapType, onTestEngineAlert }: SettingsScreenProps) {
    const confirmLogout = () => {
        Alert.alert(
            'Déconnexion',
            'Êtes-vous sûr de vouloir vous déconnecter ?',
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Se déconnecter', style: 'destructive', onPress: onLogout },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Section: Affichage Carte */}
            <Text style={styles.sectionHeader}>AFFICHAGE CARTE</Text>
            <View style={styles.sectionCard}>
                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => onToggleMapType('hybrid')}
                    activeOpacity={0.7}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                            <Map size={18} color="#2563EB" />
                        </View>
                        <View>
                            <Text style={styles.settingLabel}>Vue Satellite</Text>
                            <Text style={styles.settingSub}>Carte satellite avec noms de rues</Text>
                        </View>
                    </View>
                    {mapType === 'hybrid' && <CheckCircle2 size={20} color="#2563EB" />}
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => onToggleMapType('standard')}
                    activeOpacity={0.7}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                            <Globe size={18} color="#64748B" />
                        </View>
                        <View>
                            <Text style={styles.settingLabel}>Carte Standard</Text>
                            <Text style={styles.settingSub}>Plan avec rues uniquement</Text>
                        </View>
                    </View>
                    {mapType === 'standard' && <CheckCircle2 size={20} color="#2563EB" />}
                </TouchableOpacity>
            </View>

            {/* Section: Test Notifications Moteur ON / OFF */}
            {onTestEngineAlert && (
                <>
                    <Text style={styles.sectionHeader}>TEST DES NOTIFICATIONS</Text>
                    <View style={styles.sectionCard}>
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => onTestEngineAlert('on')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                                    <Key size={18} color="#16A34A" />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Tester Alerte Moteur ALLUMÉ</Text>
                                    <Text style={styles.settingSub}>Simuler contact mis (Moteur ON)</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => onTestEngineAlert('off')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                                    <Key size={18} color="#D97706" />
                                </View>
                                <View>
                                    <Text style={styles.settingLabel}>Tester Alerte Moteur ÉTEINT</Text>
                                    <Text style={styles.settingSub}>Simuler coupure contact (Moteur OFF)</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* Logout */}
            <TouchableOpacity style={styles.logoutCard} onPress={confirmLogout} activeOpacity={0.7}>
                <LogOut size={20} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        padding: 16,
        paddingTop: 24,
        paddingBottom: 110,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.8,
        marginBottom: 8,
        marginLeft: 4,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    settingSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 64,
    },
    logoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#EF4444',
    },
});
