import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

/**
 * GET /api/fuel/analytics
 * Returns real fuel waste analytics computed from actual positions table.
 * Query params:
 *   period = 'today' | '7d' | '30d' | 'month'  (default: '7d')
 *   deviceId = specific device ID or 'all'        (default: 'all')
 */
router.get('/analytics', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';
        const period = String(req.query.period || '7d');

        // Calculate date range from period in MySQL format (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        let targetMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
        switch (period) {
            case 'today':
                targetMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                break;
            case '7d':
                targetMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
                break;
            case 'month':
                targetMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                break;
            case '30d':
            default:
                targetMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
                break;
        }

        const d = new Date(targetMs);
        const pad = (n: number) => String(n).padStart(2, '0');
        const sinceDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

        // 1. Get all devices for this tenant
        const latestSpeed = '(SELECT p.speed FROM positions p WHERE p.device_id = d.device_id ORDER BY p.timestamp DESC LIMIT 1) AS speed';
        const devicesResult = await query(
            isAdmin
                ? `SELECT d.device_id, d.name, d.status, d.current_state, ${latestSpeed} FROM devices d ORDER BY d.last_seen DESC`
                : `SELECT d.device_id, d.name, d.status, d.current_state, ${latestSpeed} FROM devices d WHERE d.tenant_id = ? ORDER BY d.last_seen DESC`,
            isAdmin ? [] : [tenantId]
        );
        const devices = devicesResult.rows as any[];

        if (devices.length === 0) {
            return res.json({ devices: [], period, sinceDate });
        }

        const deviceIds = devices.map(d => d.device_id);
        const placeholders = deviceIds.map(() => '?').join(',');

        // 2. Fetch all positions in period for these devices
        // We compute idle time by finding consecutive rows where acc_status=1 and speed<5
        const positionsResult = await query(
            `SELECT device_id, lat, lng, speed, acc_status, timestamp
             FROM positions
             WHERE device_id IN (${placeholders})
               AND timestamp >= ?
             ORDER BY device_id, timestamp ASC`,
            [...deviceIds, sinceDate]
        );
        const allPositions = positionsResult.rows as any[];

        // 3. Group positions by device_id
        const byDevice: Record<string, any[]> = {};
        for (const pos of allPositions) {
            if (!byDevice[pos.device_id]) byDevice[pos.device_id] = [];
            byDevice[pos.device_id].push(pos);
        }

        // 4. Compute analytics per device
        const deviceStats = devices.map(dev => {
            const positions = byDevice[dev.device_id] || [];

            let idleSeconds = 0;
            let distanceKm = 0;
            let speedingKm = 0;
            let maxSpeed = 0;

            for (let i = 1; i < positions.length; i++) {
                const prev = positions[i - 1];
                const curr = positions[i];

                const dtSeconds = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;

                // Cap time gap to 10 minutes to avoid counting long offline gaps as idle
                const cappedDt = Math.min(dtSeconds, 600);

                const speed = Number(curr.speed) || 0;
                const accOn = curr.acc_status == 1 || curr.acc_status === true || curr.acc_status === 'true';

                if (speed > maxSpeed) maxSpeed = speed;

                // Idle: engine on, speed < 5 km/h
                if (accOn && speed < 5 && cappedDt > 0) {
                    idleSeconds += cappedDt;
                }

                // Distance: haversine between consecutive GPS points
                if (speed >= 5) {
                    const d = haversineKm(
                        Number(prev.lat), Number(prev.lng),
                        Number(curr.lat), Number(curr.lng)
                    );
                    distanceKm += d;

                    // Count km driven above 100 km/h (default threshold)
                    if (speed > 100) {
                        speedingKm += d;
                    }
                }
            }

            const idleHours = Number((idleSeconds / 3600).toFixed(2));

            return {
                device_id: dev.device_id,
                name: dev.name || `Véhicule ${dev.device_id.slice(-4)}`,
                current_state: dev.current_state || 'parked',
                speed: Number(dev.speed) || 0,
                positionCount: positions.length,
                idleSeconds: Math.round(idleSeconds),
                idleHours,
                distanceKm: Number(distanceKm.toFixed(1)),
                speedingKm: Number(speedingKm.toFixed(1)),
                maxSpeed: Math.round(maxSpeed),
            };
        });

        return res.json({
            period,
            sinceDate,
            deviceCount: devices.length,
            devices: deviceStats,
        });

    } catch (err) {
        console.error('[Fuel API] Error:', err);
        res.status(500).json({ error: 'Failed to compute fuel analytics' });
    }
});

// Haversine formula to compute distance in km between two GPS coordinates
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

export default router;
