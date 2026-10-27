import { pool } from '../db';
import { evaluateTelemetryAlerts } from './alertEngine';

export interface LocationUpdate {
    deviceId: string;
    lat: number;
    lng: number;
    speed?: number;
    course?: number;
    alarm?: string;
    accStatus?: boolean;
    internetStatus?: boolean;
    gpsStatus?: boolean;
    doorStatus?: boolean;
    batteryLevel?: number;
    timestamp: Date;
    tripDistance?: number;
}

export const processLocationUpdate = async (data: LocationUpdate, ioInstance: any) => {
    try {
        // 1. Insert into positions table
        await pool.execute(
            'INSERT INTO positions (device_id, lat, lng, speed, course, alarm, acc_status, internet_status, gps_status, door_status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                data.deviceId,
                data.lat,
                data.lng,
                data.speed || 0,
                data.course || 0,
                data.alarm || null,
                data.accStatus || false,
                data.internetStatus || false,
                data.gpsStatus || false,
                data.doorStatus || false,
                data.timestamp
            ]
        );

        // 2. Determine State
        let newState = 'offline';
        if (!data.accStatus) {
            newState = 'parked';
        } else if (data.speed && data.speed > 5) {
            newState = 'moving';
        } else {
            newState = 'idling';
        }

        // 3. Update devices table
        // Logic: If state changes, update state_start_time to NOW(), otherwise keep it.
        const updateDeviceQuery = `
            UPDATE devices 
            SET 
                last_seen = ?, 
                status = 'online',
                internet_status = ?,
                gps_status = ?,
                state_start_time = CASE WHEN current_state != ? THEN ? ELSE state_start_time END,
                current_state = ?
                ${data.alarm ? ', last_alarm = ?' : ''}
            WHERE device_id = ?
        `;

        const updateParams = [
            data.timestamp,
            data.internetStatus || false,
            data.gpsStatus || false,
            newState, // Check against new state
            data.timestamp, // If changed, set to now
            newState, // Set new state
            ...(data.alarm ? [data.alarm] : []),
            data.deviceId
        ];

        await pool.execute(updateDeviceQuery, updateParams);

        console.log(`   [DB] Updated position/state for ${data.deviceId} -> ${newState}`);

        // 4. Fetch the actual state_start_time from DB to ensure accuracy
        const [deviceRows]: any = await pool.query(
            'SELECT current_state, state_start_time, internet_status, gps_status FROM devices WHERE device_id = ?',
            [data.deviceId]
        );

        const actualStateStartTime = deviceRows[0]?.state_start_time || data.timestamp;
        const stateStartTimeISO = new Date(actualStateStartTime).toISOString();

        // 5. Emit Real-Time Event
        if (ioInstance) {
            ioInstance.emit('position', {
                deviceId: data.deviceId,
                lat: data.lat,
                lng: data.lng,
                speed: data.speed || 0,
                course: data.course || 0,
                alarm: data.alarm,
                accStatus: data.accStatus,
                internetStatus: deviceRows[0]?.internet_status === 1,
                gpsStatus: deviceRows[0]?.gps_status === 1,
                state: newState,
                stateStartTime: stateStartTimeISO,
                tripDistance: data.tripDistance || 0,
                lastUpdate: data.timestamp
            });
            console.log(`   [SOCKET] Emitted position for ${data.deviceId}`);
        }

        // Evaluate Enterprise Alert Rules
        evaluateTelemetryAlerts({
            deviceId: data.deviceId,
            lat: data.lat,
            lng: data.lng,
            speed: data.speed || 0,
            course: data.course || 0,
            timestamp: data.timestamp,
            alarm: data.alarm
        }, ioInstance).catch(e => console.error('[AlertEngine] Evaluation error:', e));

        return { success: true, state: newState };

    } catch (err) {
        console.error('Error processing location update:', err);
        throw err;
    }
};
