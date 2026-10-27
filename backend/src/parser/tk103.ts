export interface GPSData {
    deviceId: string;
    lat?: number;
    lng?: number;
    speed?: number;
    course?: number;
    timestamp: Date;
    raw: string;
    type: 'location_update' | 'heartbeat_simple' | 'heartbeat_command' | 'heartbeat_status' | 'other' | 'alarm';
    format: 'standard' | 'hq' | 'simulator' | 'unknown';
    // New Fields
    alarm?: string;
    accStatus?: boolean;
    internetStatus?: boolean;
    gpsStatus?: boolean;
    doorStatus?: boolean;
    batteryLevel?: number;
    tripDistance?: number;
    satellites?: number;
    gsmSignal?: number;
    fuelPercent?: number;
}

/**
 * Universal GPS Parser - TypeScript Implementation
 * Consolidates logic for:
 * - Standard Data Packet (imei:...)
 * - Simple Heartbeat (Just IMEI)
 * - HQ Data Packet (*HQ,...)
 * - Simulator Format ((ID,LOC,LAT,LNG))
 */
export const parseTK103 = (inputRaw: string): GPSData | null => {
    if (!inputRaw || typeof inputRaw !== 'string') return null;
    const message = inputRaw.trim();
    const timestamp = new Date(); // Default to now if not parsed

    // 1. Simulator Format: (ID,LOC,LAT,LNG,SPEED,ACC,DISTANCE,TRIP)
    if (message.startsWith('(') && message.endsWith(')')) {
        const content = message.slice(1, -1);
        const parts = content.split(',');
        if (parts.length >= 4) {
            return {
                deviceId: parts[0],
                // parts[1] is CMD
                lat: parseFloat(parts[2]),
                lng: parseFloat(parts[3]),
                speed: parts[4] ? parseFloat(parts[4]) : 0,
                // Parse ACC status (1 or 0) from 6th part, default to true if speed > 0
                accStatus: parts[5] ? parts[5] === '1' : (parts[4] ? parseFloat(parts[4]) > 0 : false),
                internetStatus: true,
                gpsStatus: parts[7] ? parts[7] === '1' : true,
                // Trip Distance
                tripDistance: parts[6] ? parseFloat(parts[6]) : 0,
                timestamp: new Date(), // Current time for simulator
                type: 'location_update',
                format: 'simulator',
                raw: message
            };
        }
    }

    // 2. Standard Data Packet: imei:1234567,tracker,230520120000,,F,120000,A,3124.5678,N,12124.5678,E,...
    if (message.startsWith('imei:')) {
        return parseStandardData(message);
    }

    // 3. HQ Data Packet: *HQ,359586018966098,V1,123519,A,3123.1234,N,00433.9876,E,...
    if (message.startsWith('*HQ,')) {
        return parseHQData(message);
    }

    // 4. Simple Heartbeat: 123456789012345;
    const heartbeatMatch = message.match(/^\d{15};?$/);
    if (heartbeatMatch) {
        return {
            deviceId: message.replace(';', ''),
            timestamp: new Date(),
            raw: message,
            type: 'heartbeat_simple',
            format: 'standard'
        };
    }

    // 5. Command Heartbeat: ##,imei:359586018966098,A
    if (message.startsWith('##,imei:')) {
        const parts = message.split(',');
        if (parts.length > 1 && parts[1].startsWith('imei:')) {
            return {
                deviceId: parts[1].split(':')[1],
                timestamp: new Date(),
                raw: message,
                type: 'heartbeat_command',
                format: 'standard'
            };
        }
    }

    return null;
};

// --- Helpers ---

const parseStandardData = (message: string): GPSData | null => {
    try {
        const parts = message.replace(';', '').split(',');
        const imeiMatch = parts[0].match(/imei:(\d+)/);
        if (!imeiMatch) return null;
        const deviceId = imeiMatch[1];

        if (parts.length < 12) return null; // Not enough data for location

        // Date: parts[2] -> YYMMDDHHMM(SS)
        // Lat: parts[7], LatDir: parts[8]
        // Lon: parts[9], LonDir: parts[10]
        // Speed: parts[11]

        const dateStr = parts[2];
        let timestamp = new Date();
        if (dateStr && dateStr.length >= 10) {
            const year = parseInt('20' + dateStr.substring(0, 2));
            const month = parseInt(dateStr.substring(2, 4)) - 1;
            const day = parseInt(dateStr.substring(4, 6));
            const hour = parseInt(dateStr.substring(6, 8));
            const minute = parseInt(dateStr.substring(8, 10));
            const second = dateStr.length >= 12 ? parseInt(dateStr.substring(10, 12)) : 0;
            timestamp = new Date(Date.UTC(year, month, day, hour, minute, second));
        }

        const lat = convertDDMMToDecimal(parts[7], parts[8]);
        const lng = convertDDMMToDecimal(parts[9], parts[10]);
        // In GPS103 / TK103 protocol, speed is reported in knots (1 knot = 1.852 km/h)
        const rawSpeed = parts[11] ? parseFloat(parts[11]) : 0;
        const speed = Math.round(rawSpeed * 1.852 * 10) / 10;
        const course = parts[12] ? parseFloat(parts[12]) : 0;
        const batteryLevel = parts[3] && parts[3].includes('%') ? parseInt(parts[3].replace('%', '')) : 100;

        // --- Alarm / Status Detection (Standard Packet) ---
        const trigger = parts[1].toLowerCase();

        if (trigger === 'status') {
            const satellites = parts[3] ? parseInt(parts[3]) : undefined;
            const gsmSignal = parts[18] ? parseInt(parts[18]) : undefined;
            return {
                deviceId,
                timestamp: new Date(),
                raw: message,
                type: 'heartbeat_status',
                format: 'standard',
                internetStatus: true,
                satellites: !isNaN(satellites as number) ? satellites : undefined,
                gsmSignal: !isNaN(gsmSignal as number) ? gsmSignal : undefined
            };
        }

        let alarm = undefined;
        let type: GPSData['type'] = 'location_update';

        const latDir = parts[8]?.toUpperCase();
        const lngDir = parts[10]?.toUpperCase();
        const hasValidCoords = (latDir === 'N' || latDir === 'S') && (lngDir === 'E' || lngDir === 'W') && lat !== 0 && lng !== 0;

        if (trigger === 'help me') { 
            alarm = 'sos'; 
            type = 'alarm'; 
        } else if (trigger === 'low battery') { 
            alarm = 'low_battery'; 
            type = 'alarm'; 
        } else if (trigger === 'move') { 
            alarm = 'movement'; 
            type = 'alarm'; 
        } else if (trigger === 'speed') { 
            alarm = 'overspeed'; 
            type = 'alarm'; 
        } else if (trigger === 'stockade') { 
            alarm = 'geofence'; 
            type = 'alarm'; 
        } else if (trigger === 'accalarm') { 
            alarm = 'acc_alarm'; 
            type = 'alarm'; 
        } else if (!hasValidCoords) {
            type = 'heartbeat_simple';
        }

        // Some devices send ACC state in a specific column (parts[14]) or appended 'State:ACC=1;'
        const accStatus = parts[14] === '1' || message.includes('State:ACC=1') || message.includes('acc on');
        const doorStatus = parts[15] === '1' || message.includes('Door=1');

        let fuelPercent: number | undefined = undefined;
        if (parts[16] && parts[16].includes('%')) {
            const f = parseFloat(parts[16].replace('%', ''));
            if (!isNaN(f)) fuelPercent = f;
        }

        return {
            deviceId,
            lat: hasValidCoords ? lat : undefined,
            lng: hasValidCoords ? lng : undefined,
            speed: hasValidCoords ? speed : 0,
            course,
            batteryLevel,
            fuelPercent,
            timestamp,
            raw: message,
            type,
            format: 'standard',
            alarm,
            accStatus,
            internetStatus: true,
            gpsStatus: parts[6] === 'A', // parts[6] is 'A' or 'V'
            doorStatus
        };

    } catch (e) {
        console.error('Error parsing standard data:', e);
        return null;
    }
}

const parseHQData = (message: string): GPSData | null => {
    try {
        // *HQ,359586018966098,V1,123519,A,3123.1234,N,00433.9876,E,0.08,0,231023,FFFFFFFF#
        const content = message.replace(/#$/, '');
        const parts = content.split(',');
        if (parts.length < 10) return null;

        const deviceId = parts[1];
        const timeStr = parts[3]; // HHMMSS
        // parts[4] is 'A' or 'V'
        const latStr = parts[5];
        const latDir = parts[6];
        const lngStr = parts[7];
        const lngDir = parts[8];
        const speed = parts[9] ? parseFloat(parts[9]) : 0;
        const course = parts[10] ? parseFloat(parts[10]) : 0;
        const dateStr = parts[11]; // DDMMYY
        const vehicleState = parts[12]; // Hex Status (FFFFFFFF)

        let timestamp = new Date();
        if (dateStr && timeStr) {
            const day = parseInt(dateStr.substring(0, 2));
            const month = parseInt(dateStr.substring(2, 4)) - 1;
            const year = parseInt('20' + dateStr.substring(4, 6));
            const hour = parseInt(timeStr.substring(0, 2));
            const minute = parseInt(timeStr.substring(2, 4));
            const second = parseInt(timeStr.substring(4, 6));
            timestamp = new Date(Date.UTC(year, month, day, hour, minute, second));
        }

        const lat = convertDDMMToDecimal(latStr, latDir);
        const lng = convertDDMMToDecimal(lngStr, lngDir);

        // --- Hex Status Decoding ---
        let accStatus = false;
        let doorStatus = false;
        let alarm = undefined;
        let type: GPSData['type'] = 'location_update';

        if (vehicleState && vehicleState.length >= 2) {
            const stateVal = parseInt(vehicleState, 16);
            if (!isNaN(stateVal)) {
                accStatus = (stateVal & 1) === 1; // Bit 0: ACC
                doorStatus = (stateVal & 2) === 2; // Bit 1: Door
                // Example: if (stateVal & 4) alarm = 'sos';
            }
        }

        return {
            deviceId,
            lat,
            lng,
            speed,
            course,
            timestamp,
            raw: message,
            type,
            format: 'hq',
            accStatus,
            internetStatus: true,
            gpsStatus: parts[4] === 'A',
            doorStatus,
            alarm
        };

    } catch (e) {
        console.error('Error parsing HQ data:', e);
        return null;
    }
}

const convertDDMMToDecimal = (coordStr: string, direction: string): number => {
    if (!coordStr || !direction) return 0;
    try {
        const val = parseFloat(coordStr);
        const deg = Math.floor(val / 100);
        const mins = val - (deg * 100);
        let decimal = deg + (mins / 60);

        if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
            decimal = -decimal;
        }
        return decimal;
    } catch {
        return 0;
    }
}
