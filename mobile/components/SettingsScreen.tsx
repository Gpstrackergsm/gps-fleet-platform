import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Switch,
    TextInput,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Map, Globe, LogOut, CheckCircle2, Key, Gauge, WifiOff, Lock, ChevronDown, ChevronUp } from 'lucide-react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/Config';

export interface NotificationPrefs {
    engine: boolean;
    speed: boolean;
    offline: boolean;
}

interface SettingsScreenProps {
    onLogout: () => void;
    mapType: 'hybrid' | 'standard';
    onToggleMapType: (type: 'hybrid' | 'standard') => void;
    notifPrefs: NotificationPrefs;
    onChangeNotifPrefs: (prefs: NotificationPrefs) => void;
}

export default function SettingsScreen({
    onLogout,
    mapType,
    onToggleMapType,
    notifPrefs,
    onChangeNotifPrefs,
}: SettingsScreenProps) {
    const [showPwdForm, setShowPwdForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

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

    const togglePref = (key: keyof NotificationPrefs) => {
        onChangeNotifPrefs({
            ...notifPrefs,
            [key]: !notifPrefs[key],
        });
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Champs requis', 'Veuillez remplir tous les champs de mot de passe.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Mot de passe trop court', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas.');
            return;
        }

        setPwdLoading(true);
        try {
            const token =
                Platform.OS !== 'web'
                    ? await SecureStore.getItemAsync('auth_token')
                    : localStorage.getItem('auth_token');

            await axios.post(
                `${API_URL}/api/auth/change-password`,
                { currentPassword, newPassword },
                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPwdForm(false);
            Alert.alert('Succès', 'Votre mot de passe a été modifié avec succès !');
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Impossible de modifier le mot de passe.';
            Alert.alert('Erreur', msg);
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

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

            {/* Section: Notifications en temps réel */}
            <Text style={styles.sectionHeader}>NOTIFICATIONS EN TEMPS RÉEL</Text>
            <View style={styles.sectionCard}>
                <View style={styles.settingRow}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                            <Key size={18} color="#16A34A" />
                        </View>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.settingLabel}>Contact Moteur (ON / OFF)</Text>
                            <Text style={styles.settingSub}>Alerte réelle dès l'allumage ou l'arrêt du moteur</Text>
                        </View>
                    </View>
                    <Switch
                        value={notifPrefs.engine}
                        onValueChange={() => togglePref('engine')}
                        trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
                    />
                </View>

                <View style={styles.divider} />

                <View style={styles.settingRow}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                            <Gauge size={18} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.settingLabel}>Excès de Vitesse ({'>'} 100 km/h)</Text>
                            <Text style={styles.settingSub}>Alerte réelle en cas de dépassement de limite</Text>
                        </View>
                    </View>
                    <Switch
                        value={notifPrefs.speed}
                        onValueChange={() => togglePref('speed')}
                        trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
                    />
                </View>

                <View style={styles.divider} />

                <View style={styles.settingRow}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                            <WifiOff size={18} color="#D97706" />
                        </View>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.settingLabel}>Perte de Signal GPS</Text>
                            <Text style={styles.settingSub}>Alerte réelle si un véhicule passe hors ligne</Text>
                        </View>
                    </View>
                    <Switch
                        value={notifPrefs.offline}
                        onValueChange={() => togglePref('offline')}
                        trackColor={{ false: '#CBD5E1', true: '#D97706' }}
                    />
                </View>
                <View style={styles.divider} />
                <TouchableOpacity
                    style={[styles.settingRow, { backgroundColor: '#F0FDF4', paddingVertical: 14 }]}
                    activeOpacity={0.7}
                    onPress={async () => {
                        const { scheduleLocalNotification } = require('../services/NotificationService');
                        await scheduleLocalNotification(
                            '🚨 Alerte Geofence : Véhicule V4',
                            'Sortie de zone autorisée détectée (Vitesse : 78 km/h)',
                            { test: true },
                            4
                        );
                        Alert.alert(
                            '🔔 Test d\'arrière-plan programmé !',
                            'Quittez immédiatement l\'application et revenez sur votre écran d\'accueil. Une notification avec son et bannière apparaîtra dans 4 secondes !'
                        );
                    }}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                            <CheckCircle2 size={18} color="#16A34A" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.settingLabel, { color: '#16A34A' }]}>Tester la notification d'arrière-plan</Text>
                            <Text style={styles.settingSub}>Déclenche une alerte 4s après être retourné à l'accueil</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Section: Sécurité & Mot de passe */}
            <Text style={styles.sectionHeader}>SÉCURITÉ DU COMPTE</Text>
            <View style={styles.sectionCard}>
                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => setShowPwdForm(v => !v)}
                    activeOpacity={0.7}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                            <Lock size={18} color="#2563EB" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.settingLabel}>Changer le mot de passe</Text>
                            <Text style={styles.settingSub}>Mettre à jour votre mot de passe de connexion</Text>
                        </View>
                    </View>
                    {showPwdForm ? (
                        <ChevronUp size={18} color="#64748B" />
                    ) : (
                        <ChevronDown size={18} color="#64748B" />
                    )}
                </TouchableOpacity>

                {showPwdForm && (
                    <View style={styles.pwdFormContainer}>
                        <Text style={styles.inputLabel}>Mot de passe actuel</Text>
                        <TextInput
                            style={styles.textInput}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Votre mot de passe actuel"
                            placeholderTextColor="#94A3B8"
                            secureTextEntry
                        />

                        <Text style={styles.inputLabel}>Nouveau mot de passe (min. 6 caractères)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Nouveau mot de passe"
                            placeholderTextColor="#94A3B8"
                            secureTextEntry
                        />

                        <Text style={styles.inputLabel}>Confirmer le nouveau mot de passe</Text>
                        <TextInput
                            style={styles.textInput}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Répétez le nouveau mot de passe"
                            placeholderTextColor="#94A3B8"
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={[styles.savePwdBtn, pwdLoading && { opacity: 0.7 }]}
                            onPress={handleChangePassword}
                            disabled={pwdLoading}
                            activeOpacity={0.8}
                        >
                            {pwdLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.savePwdBtnText}>Enregistrer le nouveau mot de passe</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutCard} onPress={confirmLogout} activeOpacity={0.7}>
                <LogOut size={20} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>

            {/* App Info Footer */}
            <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>Geofence GPS v1.0.0</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Service Client : 0661176946</Text>
            </View>
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
    pwdFormContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        marginTop: 10,
        marginBottom: 5,
    },
    textInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0F172A',
    },
    savePwdBtn: {
        marginTop: 16,
        backgroundColor: '#2563EB',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    savePwdBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
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
