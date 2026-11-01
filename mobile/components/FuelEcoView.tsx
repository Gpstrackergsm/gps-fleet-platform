import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Linking,
} from 'react-native';
import {
    Fuel,
    Clock,
    DollarSign,
    Award,
    Car,
    Leaf,
    MapPin,
    ChevronDown,
    ChevronRight,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Minus,
    Lightbulb,
    Gauge,
    RefreshCw,
} from 'lucide-react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/Config';

type Period = 'today' | '7d' | '30d' | 'month';
type VType = 'light' | 'van' | 'truck';
type Grade = 'A' | 'B' | 'C' | 'D' | 'E';

const RATES: Record<VType, number> = { light: 1.3, van: 1.8, truck: 3.0 };
const SPEED_EXTRA_L_PER_100KM = 2.2;
const CO2_PER_LITER = 2.64;

interface DayPoint {
    date: string;
    idleHours: number;
    km: number;
    speedingKm: number;
}
interface IdleEvent {
    start: string;
    end: string;
    minutes: number;
    lat: number;
    lng: number;
}
interface Totals {
    idleHours: number;
    km: number;
    speedingKm: number;
}
interface ApiDevice {
    device_id: string;
    name: string;
    current_state: string;
    speed: number;
    positionCount: number;
    idleSeconds: number;
    idleHours: number;
    movingHours: number;
    distanceKm: number;
    speedingKm: number;
    offHoursKm: number;
    avgSpeed: number;
    maxSpeed: number;
    idleEventCount: number;
    longestIdleMin: number;
    hourlyIdle: number[];
    daily: DayPoint[];
    events: IdleEvent[];
    prev: Totals;
}
interface ApiResponse {
    period: string;
    threshold: number;
    deviceCount: number;
    fleet?: { daily: DayPoint[]; hourlyIdle: number[]; prev: Totals };
    topEvents?: (IdleEvent & { device_id: string; name: string })[];
    devices: ApiDevice[];
}

const fmt = (n: number, d = 0) =>
    n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });

const fmtDur = (min: number) =>
    min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;

const fmtDateTime = (iso: string) => {
    try {
        return new Date(iso).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
};

const gradeOf = (s: number): Grade => (s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 65 ? 'C' : s >= 50 ? 'D' : 'E');
const gradeColors: Record<Grade, { bg: string; text: string; border: string }> = {
    A: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
    B: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
    C: { bg: '#FEFCE8', text: '#CA8A04', border: '#FEF08A' },
    D: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
    E: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
};

export default function FuelEcoView() {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<Period>('7d');
    const [fuelPrice, setFuelPrice] = useState<number>(16);
    const [speedThreshold] = useState<number>(100);
    const [targetReduction, setTargetReduction] = useState<number>(35);
    const [vehicleTypes, setVehicleTypes] = useState<Record<string, VType>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const res = await axios.get(
                `${API_URL}/api/fuel/analytics?period=${period}&threshold=${speedThreshold}`,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    timeout: 15000,
                }
            );
            if (res.data) {
                setData(res.data as ApiResponse);
            }
        } catch (err) {
            console.warn('Failed to fetch mobile fuel analytics:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period, speedThreshold]);

    useEffect(() => {
        setLoading(true);
        fetchAnalytics();
    }, [fetchAnalytics]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAnalytics();
    };

    const cycleVehicleType = (id: string) => {
        setVehicleTypes((prev) => {
            const curr = prev[id] || 'light';
            const next: VType = curr === 'light' ? 'van' : curr === 'van' ? 'truck' : 'light';
            return { ...prev, [id]: next };
        });
    };

    const vehicles = useMemo(() => {
        if (!data) return [];
        return data.devices.map((d) => {
            const vt = vehicleTypes[d.device_id] || 'light';
            const rate = RATES[vt];
            const idleL = d.idleHours * rate;
            const speedL = (d.speedingKm / 100) * SPEED_EXTRA_L_PER_100KM;
            const wasteL = idleL + speedL;
            const prevL = d.prev.idleHours * rate + (d.prev.speedingKm / 100) * SPEED_EXTRA_L_PER_100KM;

            const engineH = d.idleHours + d.movingHours;
            const idleRatio = engineH > 0 ? d.idleHours / engineH : 0;
            const speedRatio = d.distanceKm > 0 ? d.speedingKm / d.distanceKm : 0;
            const active = d.distanceKm > 0 || d.idleHours > 0;
            const score = active
                ? Math.max(20, Math.min(100, Math.round(100 - Math.min(50, idleRatio * 80) - Math.min(30, speedRatio * 150))))
                : null;

            const eventsCostSum =
                d.events && d.events.length > 0
                    ? d.events.reduce((s, e) => s + Math.round((e.minutes / 60) * rate * fuelPrice), 0)
                    : Math.round(idleL * fuelPrice);
            const speedCostRounded = Math.round(speedL * fuelPrice);

            return {
                ...d,
                vehicleType: vt,
                rate,
                idleL,
                speedL,
                wasteL,
                idleCost: eventsCostSum,
                speedCost: speedCostRounded,
                cost: eventsCostSum + speedCostRounded,
                prevCost: prevL * fuelPrice,
                co2: wasteL * CO2_PER_LITER,
                score,
                grade: score === null ? null : gradeOf(score),
                idleRatio,
            };
        });
    }, [data, vehicleTypes, fuelPrice]);

    const sortedVehicles = useMemo(
        () => [...vehicles].sort((a, b) => b.cost - a.cost),
        [vehicles]
    );

    const fleet = useMemo(() => {
        const sum = (f: (v: (typeof vehicles)[number]) => number) =>
            vehicles.reduce((s, v) => s + f(v), 0);
        const scored = vehicles.filter((v) => v.score !== null);
        const days = data?.fleet?.daily.length || 1;
        const idleCost = sum((v) => v.idleCost);
        const speedCost = sum((v) => v.speedCost);
        const cost = idleCost + speedCost;
        const prevCost = sum((v) => v.prevCost);
        const idleHours = sum((v) => v.idleHours);
        const movingHours = sum((v) => v.movingHours);
        return {
            days,
            cost,
            idleCost,
            speedCost,
            prevCost,
            wasteL: sum((v) => v.wasteL),
            idleL: sum((v) => v.idleL),
            speedL: sum((v) => v.speedL),
            idleHours,
            km: sum((v) => v.distanceKm),
            speedingKm: sum((v) => v.speedingKm),
            offHoursKm: sum((v) => v.offHoursKm),
            co2: sum((v) => v.co2),
            idleShare: idleHours + movingHours > 0 ? (idleHours / (idleHours + movingHours)) * 100 : 0,
            avgScore: scored.length
                ? Math.round(scored.reduce((s, v) => s + (v.score as number), 0) / scored.length)
                : 0,
            monthlyIdleCost: (idleCost / days) * 30,
        };
    }, [vehicles, data]);

    const dailyBars = useMemo(() => {
        if (!data?.fleet) return [];
        const slice = data.fleet.daily.slice(-7);
        const maxH = Math.max(0.1, ...slice.map((d) => d.idleHours));
        return slice.map((d) => ({
            label: `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`,
            idleHours: d.idleHours,
            cost: Math.round(d.idleHours * 1.3 * fuelPrice),
            pct: Math.round((d.idleHours / maxH) * 100),
        }));
    }, [data, fuelPrice]);

    const openMap = (lat: number, lng: number) => {
        Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`).catch(() => {});
    };

    const periods: { key: Period; label: string }[] = [
        { key: 'today', label: "Aujourd'hui" },
        { key: '7d', label: '7 Jours' },
        { key: '30d', label: '30 Jours' },
        { key: 'month', label: 'Ce Mois' },
    ];

    const prices = [13.5, 15, 16];
    const reductions = [25, 35, 50];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        >
            {/* Period Selector */}
            <View style={styles.periodBar}>
                {periods.map((p) => {
                    const active = period === p.key;
                    return (
                        <TouchableOpacity
                            key={p.key}
                            style={[styles.periodBtn, active && styles.periodBtnActive]}
                            onPress={() => setPeriod(p.key)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.periodText, active && styles.periodTextActive]}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Fuel Price Selector Strip */}
            <View style={styles.paramRow}>
                <View style={styles.paramLeft}>
                    <Fuel size={15} color="#D97706" />
                    <Text style={styles.paramLabel}>Prix Gasoil :</Text>
                </View>
                <View style={styles.pricePills}>
                    {prices.map((p) => {
                        const active = fuelPrice === p;
                        return (
                            <TouchableOpacity
                                key={p}
                                style={[styles.pricePill, active && styles.pricePillActive]}
                                onPress={() => setFuelPrice(p)}
                            >
                                <Text style={[styles.pricePillText, active && styles.pricePillTextActive]}>
                                    {p} MAD/L
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {loading && !data ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Analyse des données GPS en cours...</Text>
                </View>
            ) : (
                <>
                    {/* 4 KPI Cards Grid */}
                    <View style={styles.kpiGrid}>
                        {/* KPI 1: Waste MAD */}
                        <View style={[styles.kpiCard, styles.kpiRed]}>
                            <View style={styles.kpiTop}>
                                <Text style={styles.kpiTitleRed}>GASPILLAGE</Text>
                                <View style={styles.kpiIconRed}>
                                    <DollarSign size={14} color="#DC2626" />
                                </View>
                            </View>
                            <Text style={styles.kpiValue}>
                                {fmt(fleet.cost)} <Text style={styles.kpiUnitRed}>MAD</Text>
                            </Text>
                            <Text style={styles.kpiSubRed}>≈ {fmt(fleet.wasteL, 1)} L perdus</Text>
                        </View>

                        {/* KPI 2: Idle Hours */}
                        <View style={[styles.kpiCard, styles.kpiAmber]}>
                            <View style={styles.kpiTop}>
                                <Text style={styles.kpiTitleAmber}>RALENTI (≥ 3m)</Text>
                                <View style={styles.kpiIconAmber}>
                                    <Clock size={14} color="#D97706" />
                                </View>
                            </View>
                            <Text style={styles.kpiValue}>
                                {fmt(fleet.idleHours, 1)} <Text style={styles.kpiUnitAmber}>h</Text>
                            </Text>
                            <Text style={styles.kpiSubAmber}>
                                {fmt(fleet.idleShare)}% du temps moteur
                            </Text>
                        </View>

                        {/* KPI 3: Eco Score */}
                        <View style={[styles.kpiCard, styles.kpiGreen]}>
                            <View style={styles.kpiTop}>
                                <Text style={styles.kpiTitleGreen}>SCORE ÉCO</Text>
                                <View style={styles.kpiIconGreen}>
                                    <Award size={14} color="#059669" />
                                </View>
                            </View>
                            <Text style={[styles.kpiValue, { color: '#059669' }]}>
                                {fleet.avgScore} <Text style={styles.kpiUnitMuted}>/ 100</Text>
                            </Text>
                            <Text style={styles.kpiSubGreen}>
                                {fleet.avgScore >= 80 ? 'Bonne conduite' : 'À améliorer'}
                            </Text>
                        </View>

                        {/* KPI 4: Distance & CO2 */}
                        <View style={[styles.kpiCard, styles.kpiBlue]}>
                            <View style={styles.kpiTop}>
                                <Text style={styles.kpiTitleBlue}>DISTANCE</Text>
                                <View style={styles.kpiIconBlue}>
                                    <Car size={14} color="#2563EB" />
                                </View>
                            </View>
                            <Text style={styles.kpiValue}>
                                {fmt(fleet.km)} <Text style={styles.kpiUnitBlue}>km</Text>
                            </Text>
                            <Text style={styles.kpiSubBlue}>
                                {fmt(fleet.co2)} kg CO₂ évitables
                            </Text>
                        </View>
                    </View>

                    {/* Daily Bar Chart (last 7 days of period) */}
                    {dailyBars.length > 0 && (
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Évolution du ralenti par jour</Text>
                            <Text style={styles.sectionSub}>
                                Heures de ralenti prolongé (≥ 3 min) sur les derniers jours
                            </Text>
                            <View style={styles.barChartRow}>
                                {dailyBars.map((b, idx) => (
                                    <View key={idx} style={styles.barCol}>
                                        <Text style={styles.barTopLabel}>
                                            {b.idleHours > 0 ? `${fmt(b.idleHours, 1)}h` : ''}
                                        </Text>
                                        <View style={styles.barTrack}>
                                            <View
                                                style={[
                                                    styles.barFill,
                                                    { height: `${Math.max(b.idleHours > 0 ? 8 : 2, b.pct)}%` },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.barDateLabel}>{b.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ROI Savings Simulator */}
                    <View style={styles.roiCard}>
                        <View style={styles.roiHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Sparkles size={16} color="#059669" />
                                <Text style={styles.roiTitle}>Simulateur d'Économies (ROI)</Text>
                            </View>
                            <View style={styles.roiTargets}>
                                {reductions.map((r) => {
                                    const active = targetReduction === r;
                                    return (
                                        <TouchableOpacity
                                            key={r}
                                            style={[styles.roiPill, active && styles.roiPillActive]}
                                            onPress={() => setTargetReduction(r)}
                                        >
                                            <Text style={[styles.roiPillText, active && styles.roiPillTextActive]}>
                                                -{r}%
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                        <View style={styles.roiBoxes}>
                            <View style={styles.roiBox}>
                                <Text style={styles.roiBoxLabel}>Économie / mois</Text>
                                <Text style={styles.roiBoxVal}>
                                    + {fmt((fleet.monthlyIdleCost * targetReduction) / 100)} MAD
                                </Text>
                            </View>
                            <View style={styles.roiBox}>
                                <Text style={styles.roiBoxLabel}>Économie / an</Text>
                                <Text style={styles.roiBoxVal}>
                                    + {fmt((fleet.monthlyIdleCost * targetReduction * 12) / 100)} MAD
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Per-Vehicle Detailed Leaderboard */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Analyse détaillée par véhicule</Text>
                        <Text style={styles.sectionSub}>
                            Touchez un véhicule pour voir tous ses ralentis (≥ 3 min) et leurs lieux sur Google Maps
                        </Text>

                        {sortedVehicles.map((v, idx) => {
                            const open = expandedId === v.device_id;
                            const gColor = v.grade ? gradeColors[v.grade] : null;
                            const typeLabel =
                                v.vehicleType === 'truck'
                                    ? 'Poids lourd (3L/h)'
                                    : v.vehicleType === 'van'
                                    ? 'Fourgon (1,8L/h)'
                                    : 'Léger (1,3L/h)';

                            return (
                                <View key={v.device_id} style={styles.vCard}>
                                    <TouchableOpacity
                                        style={styles.vHeader}
                                        onPress={() => setExpandedId(open ? null : v.device_id)}
                                        activeOpacity={0.75}
                                    >
                                        <View style={styles.vLeft}>
                                            {open ? (
                                                <ChevronDown size={16} color="#2563EB" />
                                            ) : (
                                                <ChevronRight size={16} color="#64748B" />
                                            )}
                                            <View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={styles.vName}>
                                                        {idx + 1}. {v.name}
                                                    </Text>
                                                    {v.grade && gColor && (
                                                        <View
                                                            style={[
                                                                styles.gradeBadge,
                                                                {
                                                                    backgroundColor: gColor.bg,
                                                                    borderColor: gColor.border,
                                                                },
                                                            ]}
                                                        >
                                                            <Text style={[styles.gradeText, { color: gColor.text }]}>
                                                                Grade {v.grade}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.vMeta}>
                                                    {fmt(v.distanceKm, 1)} km · Ralenti : {fmt(v.idleHours, 1)} h ({v.idleEventCount} arrêts)
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.vRight}>
                                            <Text style={styles.vCost}>{fmt(v.cost)} MAD</Text>
                                            <Text style={styles.vLiters}>{fmt(v.wasteL, 1)} L</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {open && (
                                        <View style={styles.vBody}>
                                            {/* Category Switcher + Mini KPIs */}
                                            <View style={styles.vStatsRow}>
                                                <TouchableOpacity
                                                    style={styles.typeBtn}
                                                    onPress={() => cycleVehicleType(v.device_id)}
                                                >
                                                    <Text style={styles.typeBtnLabel}>Catégorie (toucher)</Text>
                                                    <Text style={styles.typeBtnVal}>{typeLabel}</Text>
                                                </TouchableOpacity>
                                                <View style={styles.miniStat}>
                                                    <Text style={styles.miniStatLabel}>Vit. max</Text>
                                                    <Text style={styles.miniStatVal}>{v.maxSpeed} km/h</Text>
                                                </View>
                                                <View style={styles.miniStat}>
                                                    <Text style={styles.miniStatLabel}>Plus long arrêt</Text>
                                                    <Text style={styles.miniStatVal}>
                                                        {v.longestIdleMin ? fmtDur(v.longestIdleMin) : '—'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* All Idle Events >= 3 min */}
                                            <Text style={styles.eventsHeader}>
                                                Arrêts moteur allumé ≥ 3 min ({v.events.length}) :
                                            </Text>
                                            {v.events.length === 0 ? (
                                                <Text style={styles.emptyEvents}>
                                                    Aucun ralenti prolongé sur cette période.
                                                </Text>
                                            ) : (
                                                v.events.map((e, k) => {
                                                    const evLiters = (e.minutes / 60) * v.rate;
                                                    const evCost = Math.round(evLiters * fuelPrice);
                                                    return (
                                                        <TouchableOpacity
                                                            key={k}
                                                            style={styles.eventRow}
                                                            onPress={() => openMap(e.lat, e.lng)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <View>
                                                                <Text style={styles.eventMain}>
                                                                    {fmtDur(e.minutes)} · ≈ {fmt(evLiters, 1)} L · {evCost} MAD
                                                                </Text>
                                                                <Text style={styles.eventSub}>
                                                                    {fmtDateTime(e.start)}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.mapLinkPill}>
                                                                <MapPin size={13} color="#2563EB" />
                                                                <Text style={styles.mapLinkText}>Carte</Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    );
                                                })
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        padding: 14,
        paddingBottom: 110,
    },
    periodBar: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        padding: 3,
        marginBottom: 10,
    },
    periodBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    periodBtnActive: {
        backgroundColor: '#2563EB',
    },
    periodText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    periodTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    paramRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    paramLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    paramLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#334155',
    },
    pricePills: {
        flexDirection: 'row',
        gap: 6,
    },
    pricePill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    pricePillActive: {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
    },
    pricePillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    pricePillTextActive: {
        color: '#B45309',
        fontWeight: '700',
    },
    loadingBox: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        color: '#64748B',
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
        marginBottom: 12,
    },
    kpiCard: {
        width: '48.5%',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
    },
    kpiRed: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    kpiAmber: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    kpiGreen: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
    },
    kpiBlue: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    kpiTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    kpiTitleRed: { fontSize: 10, fontWeight: '800', color: '#B91C1C' },
    kpiTitleAmber: { fontSize: 10, fontWeight: '800', color: '#B45309' },
    kpiTitleGreen: { fontSize: 10, fontWeight: '800', color: '#047857' },
    kpiTitleBlue: { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
    kpiIconRed: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
    kpiIconAmber: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
    kpiIconGreen: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
    kpiIconBlue: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
    kpiValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
    },
    kpiUnitRed: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
    kpiUnitAmber: { fontSize: 12, fontWeight: '700', color: '#D97706' },
    kpiUnitBlue: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
    kpiUnitMuted: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    kpiSubRed: { fontSize: 11, color: '#B91C1C', marginTop: 2, fontWeight: '500' },
    kpiSubAmber: { fontSize: 11, color: '#B45309', marginTop: 2, fontWeight: '500' },
    kpiSubGreen: { fontSize: 11, color: '#047857', marginTop: 2, fontWeight: '500' },
    kpiSubBlue: { fontSize: 11, color: '#1D4ED8', marginTop: 2, fontWeight: '500' },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    sectionSub: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
        marginBottom: 12,
    },
    barChartRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 120,
        paddingTop: 16,
    },
    barCol: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
    },
    barTopLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#D97706',
        height: 14,
    },
    barTrack: {
        flex: 1,
        width: 18,
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    barFill: {
        width: '100%',
        backgroundColor: '#F59E0B',
        borderRadius: 6,
    },
    barDateLabel: {
        fontSize: 9,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '600',
    },
    roiCard: {
        backgroundColor: '#ECFDF5',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#A7F3D0',
        marginBottom: 12,
    },
    roiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    roiTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#065F46',
    },
    roiTargets: {
        flexDirection: 'row',
        gap: 4,
    },
    roiPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    roiPillActive: {
        backgroundColor: '#059669',
        borderColor: '#059669',
    },
    roiPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    roiPillTextActive: {
        color: '#FFFFFF',
    },
    roiBoxes: {
        flexDirection: 'row',
        gap: 8,
    },
    roiBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    roiBoxLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
    },
    roiBoxVal: {
        fontSize: 16,
        fontWeight: '900',
        color: '#059669',
        marginTop: 2,
    },
    vCard: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
    },
    vHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFFFFF',
    },
    vLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    vName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    vMeta: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    vRight: {
        alignItems: 'flex-end',
    },
    vCost: {
        fontSize: 14,
        fontWeight: '900',
        color: '#DC2626',
    },
    vLiters: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    gradeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 6,
        borderWidth: 1,
    },
    gradeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    vBody: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    vStatsRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 10,
    },
    typeBtn: {
        flex: 1.3,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    typeBtnLabel: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '600',
    },
    typeBtnVal: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2563EB',
        marginTop: 2,
    },
    miniStat: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    miniStatLabel: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '600',
    },
    miniStatVal: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 2,
    },
    eventsHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6,
    },
    emptyEvents: {
        fontSize: 11,
        color: '#94A3B8',
        fontStyle: 'italic',
    },
    eventRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 6,
    },
    eventMain: {
        fontSize: 12,
        fontWeight: '700',
        color: '#B45309',
    },
    eventSub: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 1,
    },
    mapLinkPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    mapLinkText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563EB',
    },
});
