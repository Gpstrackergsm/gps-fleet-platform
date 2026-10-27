import { query } from '../db';

export interface TelemetryPoint {
    deviceId: string;
    lat: number;
    lng: number;
    speed: number;
    course: number;
    timestamp: Date;
    alarm?: string;
}

// Haversine distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Radius of the Earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Ray-casting algorithm for Point in Polygon
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
    const [lat, lng] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > lng) !== (yj > lng)) &&
            (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// In-memory state tracking for geofence entry/exit detection
// Key: `${deviceId}_${geofenceId}` -> boolean (wasInside)
const geofenceStateMap = new Map<string, boolean>();

export async function evaluateTelemetryAlerts(telemetry: TelemetryPoint, ioInstance: any): Promise<void> {
    try {
        // 1. Fetch tenant ID and vehicle name for this device
        const deviceRes = await query(
            'SELECT tenant_id, name FROM devices WHERE device_id = ?',
            [telemetry.deviceId]
        );
        const device = (deviceRes.rows as any[])[0];
        if (!device || !device.tenant_id) return;

        const tenantId = device.tenant_id;
        const vehicleName = device.name || telemetry.deviceId;

        // 2. Fetch active geofences for this tenant
        const geofencesRes = await query(
            'SELECT * FROM geofences WHERE tenant_id = ? AND is_active = TRUE',
            [tenantId]
        );
        const geofences = geofencesRes.rows as any[];

        for (const geofence of geofences) {
            let isInside = false;

            if (geofence.type === 'circle' && geofence.center_lat && geofence.center_lng) {
                const dist = getDistanceMeters(
                    telemetry.lat,
                    telemetry.lng,
                    geofence.center_lat,
                    geofence.center_lng
                );
                isInside = dist <= (geofence.radius_meters || 500);
            } else if (geofence.type === 'polygon' && geofence.polygon_coordinates) {
                let coords: [number, number][] = [];
                try {
                    coords = typeof geofence.polygon_coordinates === 'string'
                        ? JSON.parse(geofence.polygon_coordinates)
                        : geofence.polygon_coordinates;
                    isInside = isPointInPolygon([telemetry.lat, telemetry.lng], coords);
                } catch (e) {
                    console.error('Error parsing polygon coords for geofence', geofence.id);
                }
            }

            const stateKey = `${telemetry.deviceId}_${geofence.id}`;
            const wasInside = geofenceStateMap.get(stateKey);

            if (wasInside !== undefined) {
                // Entry transition
                if (!wasInside && isInside) {
                    await emitAndSaveAlert({
                        tenantId,
                        deviceId: telemetry.deviceId,
                        ruleId: null,
                        type: 'geofence_entry',
                        severity: 'medium',
                        message: `Vehicle "${vehicleName}" entered geofence "${geofence.name}"`,
                        lat: telemetry.lat,
                        lng: telemetry.lng,
                        speed: telemetry.speed,
                    }, ioInstance);
                }
                // Exit transition
                else if (wasInside && !isInside) {
                    await emitAndSaveAlert({
                        tenantId,
                        deviceId: telemetry.deviceId,
                        ruleId: null,
                        type: 'geofence_exit',
                        severity: 'high',
                        message: `Vehicle "${vehicleName}" exited geofence "${geofence.name}"`,
                        lat: telemetry.lat,
                        lng: telemetry.lng,
                        speed: telemetry.speed,
                    }, ioInstance);
                }
            }
            geofenceStateMap.set(stateKey, isInside);

            // Check geofence speed limit if inside
            if (isInside && geofence.speed_limit > 0 && telemetry.speed > geofence.speed_limit) {
                await emitAndSaveAlert({
                    tenantId,
                    deviceId: telemetry.deviceId,
                    ruleId: null,
                    type: 'geofence_overspeed',
                    severity: 'high',
                    message: `Vehicle "${vehicleName}" exceeded speed limit (${geofence.speed_limit} km/h) in "${geofence.name}" at ${telemetry.speed.toFixed(0)} km/h`,
                    lat: telemetry.lat,
                    lng: telemetry.lng,
                    speed: telemetry.speed,
                }, ioInstance);
            }
        }

        // 3. Evaluate general overspeed alert rules
        const rulesRes = await query(
            'SELECT * FROM alert_rules WHERE tenant_id = ? AND is_active = TRUE AND (device_id IS NULL OR device_id = ?)',
            [tenantId, telemetry.deviceId]
        );
        const rules = rulesRes.rows as any[];

        for (const rule of rules) {
            if (rule.type === 'overspeed' && rule.threshold_value > 0) {
                if (telemetry.speed > rule.threshold_value) {
                    await emitAndSaveAlert({
                        tenantId,
                        deviceId: telemetry.deviceId,
                        ruleId: rule.id,
                        type: 'overspeed',
                        severity: telemetry.speed > rule.threshold_value + 30 ? 'critical' : 'high',
                        message: `Speed alert: "${vehicleName}" reached ${telemetry.speed.toFixed(0)} km/h (limit: ${rule.threshold_value} km/h)`,
                        lat: telemetry.lat,
                        lng: telemetry.lng,
                        speed: telemetry.speed,
                    }, ioInstance);
                }
            }
        }
    } catch (err) {
        console.error('[AlertEngine] Error evaluating alerts:', err);
    }
}

interface AlertPayload {
    tenantId: number;
    deviceId: string;
    ruleId: number | null;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    lat: number;
    lng: number;
    speed: number;
}

// Debounce map to avoid flooding alerts for the same condition (1 minute cooldown)
const alertCooldownMap = new Map<string, number>();

async function emitAndSaveAlert(payload: AlertPayload, ioInstance: any): Promise<void> {
    const cooldownKey = `${payload.deviceId}_${payload.type}`;
    const now = Date.now();
    const lastAlert = alertCooldownMap.get(cooldownKey);

    if (lastAlert && (now - lastAlert) < 60000) {
        return; // Suppress duplicate alert within 60s
    }
    alertCooldownMap.set(cooldownKey, now);

    try {
        const insertRes = await query(
            `INSERT INTO alerts (tenant_id, device_id, rule_id, type, severity, message, lat, lng, speed, status, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unacknowledged', NOW())`,
            [
                payload.tenantId,
                payload.deviceId,
                payload.ruleId,
                payload.type,
                payload.severity,
                payload.message,
                payload.lat,
                payload.lng,
                payload.speed
            ]
        );

        const alertData = {
            id: (insertRes as any).insertId,
            tenantId: payload.tenantId,
            deviceId: payload.deviceId,
            type: payload.type,
            severity: payload.severity,
            message: payload.message,
            lat: payload.lat,
            lng: payload.lng,
            speed: payload.speed,
            status: 'unacknowledged',
            timestamp: new Date().toISOString()
        };

        if (ioInstance) {
            ioInstance.emit('alert', alertData);
            console.log(`   [ALERT] Emitted ${payload.severity.toUpperCase()} alert for ${payload.deviceId}: ${payload.message}`);
        }
    } catch (err) {
        console.error('[AlertEngine] Failed to save alert:', err);
    }
}
