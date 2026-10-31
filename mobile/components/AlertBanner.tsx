import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Gauge, MapPin, WifiOff, Key, X } from 'lucide-react-native';

export type BannerAlert = {
    id: string;
    type: 'speed' | 'geofence' | 'offline' | 'engine';
    vehicleName: string;
    message: string;
    timestamp: number;
    subType?: 'on' | 'off';
};

interface AlertBannerProps {
    alert: BannerAlert | null;
    onDismiss: () => void;
}

export default function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
    const translateY = useRef(new Animated.Value(-120)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (alert) {
            // Slide in
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 60,
                    friction: 10,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-dismiss after 5s
            timerRef.current = setTimeout(() => dismiss(), 5000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [alert?.id]);

    const dismiss = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -120,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onDismiss());
    };

    if (!alert) return null;

    const getIcon = () => {
        switch (alert.type) {
            case 'speed':    return <Gauge size={22} color="#FFFFFF" />;
            case 'geofence': return <MapPin size={22} color="#FFFFFF" />;
            case 'offline':  return <WifiOff size={22} color="#FFFFFF" />;
            case 'engine':   return <Key size={22} color="#FFFFFF" />;
        }
    };

    const getBgColor = () => {
        switch (alert.type) {
            case 'speed':    return '#DC2626'; // red
            case 'geofence': return '#D97706'; // amber
            case 'offline':  return '#475569'; // slate
            case 'engine':   return alert.subType === 'off' ? '#D97706' : '#16A34A'; // green for ON, amber for OFF
        }
    };

    return (
        <Animated.View
            style={[
                styles.banner,
                { backgroundColor: getBgColor(), transform: [{ translateY }], opacity },
            ]}
        >
            <View style={styles.iconBox}>{getIcon()}</View>
            <View style={styles.textBox}>
                <Text style={styles.title} numberOfLines={1}>{alert.vehicleName}</Text>
                <Text style={styles.message} numberOfLines={2}>{alert.message}</Text>
            </View>
            <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 100,
        left: 16,
        right: 16,
        zIndex: 9999,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textBox: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    message: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 16,
    },
    closeBtn: {
        marginLeft: 8,
        padding: 4,
    },
});
