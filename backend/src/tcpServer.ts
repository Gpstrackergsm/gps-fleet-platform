import net from 'net';
import { pool } from './db';
import { parseTK103, GPSData } from './parser/tk103';
import { evaluateTelemetryAlerts } from './services/alertEngine';
import { getDistanceMeters } from './utils/trajectoryFilter';

const PORT = process.env.TCP_PORT ? parseInt(process.env.TCP_PORT) : 5001;
let ioInstance: any = null;

// Registry of live TCP connections by deviceId (for 2-way remote commands like stop/resume engine)
export const activeSockets = new Map<string, net.Socket>();

export const sendCommandToDevice = (deviceId: string, command: string): boolean => {
    const socket = activeSockets.get(deviceId);
    if (socket && !socket.destroyed) {
        // Send command with CRLF / semicolon as standard in TK103
        const payload = command.endsWith(';') ? command : `${command};`;
        socket.write(payload);
        console.log(`[TCP 2-Way] Sent command to ${deviceId}: ${payload}`);
        return true;
    }
    return false;
};

const server = net.createServer((socket) => {
    let attachedDeviceId: string | null = null;
    console.log('[TCP] Device connected:', socket.remoteAddress, socket.remotePort);

    socket.on('data', async (data) => {
        const rawString = data.toString();
        const timestamp = new Date();

        console.log(`[${timestamp.toISOString()}] [TCP IN] ${rawString.trim()}`);

        // 1. Raw Logging (Vacuum Mode)
        try {
            await pool.execute(
                'INSERT INTO raw_logs (payload, received_at) VALUES (?, ?)',
                [rawString, timestamp]
            );
        } catch (err) {
            console.error('Error logging raw data:', err);
        }

        // 2. Multi-Packet Stream Splitting
        // Buffered packets from GSM reconnects arrive bundled like: "imei:...;imei:...;"
        const rawPackets = rawString
            .split(';')
            .map(p => p.trim())
            .filter(p => p.length > 0);

        for (const rawPkt of rawPackets) {
            const packetWithTerminator = rawPkt + ';';
            await processSinglePacket(packetWithTerminator, socket, timestamp);
        }

        // 3. Protocol Handshake / Heartbeat Responses
        if (rawString.startsWith('##,imei:')) {
            socket.write('LOAD');
            console.log('   [TCP] Sent TK103 Handshake ACK: LOAD');
        } else if (rawString.includes('BP05')) {
            const response = '(AP05)';
            socket.write(response);
            console.log('   [TCP] Sent Login Response:', response);
        }
    });

    async function processSinglePacket(packetStr: string, clientSocket: net.Socket, now: Date) {
        const parsed = parseTK103(packetStr);
        if (!parsed) return;

        // Register active socket for 2-way remote control
        if (parsed.deviceId) {
            attachedDeviceId = parsed.deviceId;
            activeSockets.set(parsed.deviceId, clientSocket);
        }

        console.log(`   [PARSED] ${parsed.deviceId} | Type: ${parsed.type} | Lat: ${parsed.lat?.toFixed(6)} | Lng: ${parsed.lng?.toFixed(6)} | Speed: ${parsed.speed} km/h | ACC: ${parsed.accStatus} | Batt: ${parsed.batteryLevel}%`);

        if (parsed.type === 'location_update' && parsed.lat !== undefined && parsed.lng !== undefined && (parsed.lat !== 0 || parsed.lng !== 0)) {
            try {
                // ── Live GPS Spike / Teleportation Rejector ──
                // Check last known position. If velocity > 180 km/h (50 m/s) over short time window (< 5 mins), reject glitch.
                const [lastPosRows]: any = await pool.query(
                    'SELECT lat, lng, timestamp FROM positions WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1',
                    [parsed.deviceId]
                );

                if (lastPosRows.length > 0) {
                    const lastP = lastPosRows[0];
                    const prevTime = new Date(lastP.timestamp).getTime();
                    const currTime = parsed.timestamp.getTime();
                    const dt = Math.max(0.5, (currTime - prevTime) / 1000);
                    const distM = getDistanceMeters(lastP.lat, lastP.lng, parsed.lat, parsed.lng);
                    const speedMs = distM / dt;

                    // If impossible ground speed (> 180 km/h) in a short interval, discard the glitch
                    if (speedMs > 50 && dt < 300) {
                        console.log(`   [SPIKE REJECTED] ${parsed.deviceId}: Jump of ${Math.round(distM)}m in ${dt.toFixed(1)}s (${Math.round(speedMs * 3.6)} km/h) ignored.`);
                        return;
                    }
                }

                // Auto-provision device if not already registered (preserves pre-assigned tenant/name)
                await pool.execute(
                    'INSERT INTO devices (device_id, name, status, tenant_id) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE status = "online"',
                    [parsed.deviceId, `TK103-${parsed.deviceId.slice(-4)}`, 'online']
                );

                // Update positions reference table with ALL telemetry columns
                await pool.execute(
                    `INSERT INTO positions (
                        device_id, lat, lng, speed, course, alarm, 
                        acc_status, internet_status, gps_status, door_status, 
                        battery_level, satellites, gsm_signal, fuel_percent, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        parsed.deviceId,
                        parsed.lat,
                        parsed.lng,
                        parsed.speed || 0,
                        parsed.course || 0,
                        parsed.alarm || null,
                        parsed.accStatus || false,
                        parsed.internetStatus || true,
                        parsed.gpsStatus || true,
                        parsed.doorStatus || false,
                        parsed.batteryLevel !== undefined ? parsed.batteryLevel : 100,
                        parsed.satellites !== undefined ? parsed.satellites : null,
                        parsed.gsmSignal !== undefined ? parsed.gsmSignal : null,
                        parsed.fuelPercent !== undefined ? parsed.fuelPercent : null,
                        parsed.timestamp
                    ]
                );

                // Determine State: Parked, Moving, or Idling
                let newState = 'offline';
                if (!parsed.accStatus) {
                    newState = 'parked';
                } else if (parsed.speed && parsed.speed > 5) {
                    newState = 'moving';
                } else {
                    newState = 'idling';
                }

                // Update device with rich live status
                const updateDeviceQuery = `
                    UPDATE devices 
                    SET 
                        last_seen = ?, 
                        status = 'online',
                        internet_status = ?,
                        gps_status = ?,
                        battery_level = COALESCE(?, battery_level),
                        acc_status = ?,
                        satellites = COALESCE(?, satellites),
                        gsm_signal = COALESCE(?, gsm_signal),
                        fuel_percent = COALESCE(?, fuel_percent),
                        state_start_time = CASE WHEN current_state != ? THEN ? ELSE state_start_time END,
                        current_state = ?
                        ${parsed.alarm ? ', last_alarm = ?' : ''}
                    WHERE device_id = ?
                `;

                const updateParams = [
                    parsed.timestamp,
                    parsed.internetStatus || true,
                    parsed.gpsStatus || true,
                    parsed.batteryLevel !== undefined ? parsed.batteryLevel : null,
                    parsed.accStatus || false,
                    parsed.satellites !== undefined ? parsed.satellites : null,
                    parsed.gsmSignal !== undefined ? parsed.gsmSignal : null,
                    parsed.fuelPercent !== undefined ? parsed.fuelPercent : null,
                    newState,
                    parsed.timestamp,
                    newState,
                    ...(parsed.alarm ? [parsed.alarm] : []),
                    parsed.deviceId
                ];

                await pool.execute(updateDeviceQuery, updateParams);

                // Fetch actual state_start_time
                const [deviceRows]: any = await pool.query(
                    'SELECT current_state, state_start_time FROM devices WHERE device_id = ?',
                    [parsed.deviceId]
                );
                const actualStateStartTime = deviceRows[0]?.state_start_time || parsed.timestamp;
                const stateStartTimeISO = new Date(actualStateStartTime).toISOString();

                // Broadcast Real-Time Telemetry via Socket.IO
                if (ioInstance) {
                    ioInstance.emit('position', {
                        deviceId: parsed.deviceId,
                        lat: parsed.lat,
                        lng: parsed.lng,
                        speed: parsed.speed || 0,
                        course: parsed.course || 0,
                        alarm: parsed.alarm,
                        accStatus: parsed.accStatus,
                        doorStatus: parsed.doorStatus,
                        batteryLevel: parsed.batteryLevel !== undefined ? parsed.batteryLevel : 100,
                        satellites: parsed.satellites,
                        gsmSignal: parsed.gsmSignal,
                        fuelPercent: parsed.fuelPercent,
                        internetStatus: true,
                        gpsStatus: parsed.gpsStatus,
                        state: newState,
                        stateStartTime: stateStartTimeISO,
                        tripDistance: parsed.tripDistance || 0,
                        lastUpdate: parsed.timestamp
                    });
                    console.log(`   [SOCKET] Emitted rich position for ${parsed.deviceId}`);
                }

                // Evaluate Enterprise Alert Rules (Geofencing, Overspeed)
                evaluateTelemetryAlerts({
                    deviceId: parsed.deviceId,
                    lat: parsed.lat,
                    lng: parsed.lng,
                    speed: parsed.speed || 0,
                    course: parsed.course || 0,
                    timestamp: parsed.timestamp || new Date(),
                    alarm: parsed.alarm
                }, ioInstance).catch(e => console.error('[AlertEngine] Evaluation error:', e));

            } catch (err) {
                console.error('Error saving position:', err);
            }
        } else if (parsed.type.startsWith('heartbeat')) {
            try {
                await pool.execute(
                    `UPDATE devices SET 
                        last_seen = ?, 
                        status = 'online', 
                        internet_status = true,
                        satellites = COALESCE(?, satellites),
                        gsm_signal = COALESCE(?, gsm_signal)
                    WHERE device_id = ?`,
                    [
                        parsed.timestamp, 
                        parsed.satellites !== undefined ? parsed.satellites : null,
                        parsed.gsmSignal !== undefined ? parsed.gsmSignal : null,
                        parsed.deviceId
                    ]
                );
                console.log(`   [DB] Updated heartbeat for ${parsed.deviceId}`);
            } catch (err) {
                console.error('Error saving heartbeat:', err);
            }
        }
    }

    socket.on('end', () => {
        if (attachedDeviceId) {
            activeSockets.delete(attachedDeviceId);
            console.log(`[TCP] Device ${attachedDeviceId} disconnected`);
        }
    });

    socket.on('error', (err) => {
        if (attachedDeviceId) {
            activeSockets.delete(attachedDeviceId);
        }
        console.error('[TCP] Socket error:', err.message);
    });
});

export const startTcpServer = (io: any) => {
    ioInstance = io;
    server.listen(PORT, () => {
        console.log(`TCP Server listening on port ${PORT}`);
    });
};
