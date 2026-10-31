import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// Morocco is UTC+1 (all year since 2018). Used to bucket days / hours in local time.
const TZ_OFFSET_MIN = 60;
const MAX_GAP_S = 600;        // gaps longer than this = tracker offline, never counted
const IDLE_SPEED = 5;         // km/h under which a running engine is "idling"
const MIN_IDLE_EVENT_S = 180; // idle runs shorter than 3 min are not reported as events
const MAX_PLAUSIBLE_KMH = 220; // GPS teleport filter

const pad = (n: number) => String(n).padStart(2, '0');
const local = (ms: number) => new Date(ms + TZ_OFFSET_MIN * 60000); // read with getUTC*
const dayKey = (ms: number) => { const d = local(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const sqlDate = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

interface IdleEvent { start: string; end: string; minutes: number; lat: number; lng: number; }
interface DayStat { idleSeconds: number; km: number; speedingKm: number; }

function analyze(positions: any[], threshold: number) {
    let idleSeconds = 0, movingSeconds = 0, km = 0, speedingKm = 0, offHoursKm = 0, maxSpeed = 0;
    const hourlyIdle = new Array(24).fill(0);
    const days: Record<string, DayStat> = {};
    const events: IdleEvent[] = [];
    let cur: { startMs: number; endMs: number; lat: number; lng: number } | null = null;

    const closeEvent = () => {
        if (cur) {
            const dur = (cur.endMs - cur.startMs) / 1000;
            if (dur >= MIN_IDLE_EVENT_S) {
                events.push({
                    start: new Date(cur.startMs).toISOString(),
                    end: new Date(cur.endMs).toISOString(),
                    minutes: Math.round(dur / 60),
                    lat: cur.lat, lng: cur.lng,
                });
            }
            cur = null;
        }
    };
    const day = (ms: number) => (days[dayKey(ms)] ||= { idleSeconds: 0, km: 0, speedingKm: 0 });

    for (let i = 1; i < positions.length; i++) {
        const prev = positions[i - 1], curr = positions[i];
        const t0 = new Date(prev.timestamp).getTime();
        const t1 = new Date(curr.timestamp).getTime();
        const dt = (t1 - t0) / 1000;
        const speed = Number(curr.speed) || 0;
        const accOn = curr.acc_status == 1 || curr.acc_status === true || curr.acc_status === 'true';
        if (speed > maxSpeed && speed < MAX_PLAUSIBLE_KMH) maxSpeed = speed;

        if (dt <= 0 || dt > MAX_GAP_S) { closeEvent(); continue; }

        const idle = accOn && speed < IDLE_SPEED;
        if (idle) {
            idleSeconds += dt;
            day(t1).idleSeconds += dt;
            hourlyIdle[local(t1).getUTCHours()] += dt;
            if (!cur) cur = { startMs: t0, endMs: t1, lat: Number(curr.lat), lng: Number(curr.lng) };
            else cur.endMs = t1;
        } else {
            closeEvent();
        }

        if (speed >= IDLE_SPEED) {
            movingSeconds += dt;
            const d = haversineKm(Number(prev.lat), Number(prev.lng), Number(curr.lat), Number(curr.lng));
            if (d / (dt / 3600) > MAX_PLAUSIBLE_KMH) continue; // teleport
            km += d;
            day(t1).km += d;
            const h = local(t1).getUTCHours();
            if (h >= 20 || h < 6) offHoursKm += d;
            if (speed > threshold) { speedingKm += d; day(t1).speedingKm += d; }
        }
    }
    closeEvent();

    return {
        idleSeconds, movingSeconds, km, speedingKm, offHoursKm, maxSpeed, hourlyIdle, days, events,
    };
}

/**
 * GET /api/fuel/analytics?period=today|7d|30d|month&threshold=100
 * Real analytics computed from the positions table (current period + previous period for trends).
 */
router.get('/analytics', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';
        const period = String(req.query.period || '7d');
        const threshold = Math.min(200, Math.max(40, Number(req.query.threshold) || 100));

        const nowMs = Date.now();
        const nowLocal = local(nowMs);
        const startOfTodayMs = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate()) - TZ_OFFSET_MIN * 60000;
        let sinceMs: number;
        switch (period) {
            case 'today': sinceMs = startOfTodayMs; break;
            case '7d': sinceMs = nowMs - 7 * 86400000; break;
            case 'month': sinceMs = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), 1) - TZ_OFFSET_MIN * 60000; break;
            case '30d':
            default: sinceMs = nowMs - 30 * 86400000; break;
        }
        const lenMs = Math.max(nowMs - sinceMs, 3600000);
        const prevSinceMs = sinceMs - lenMs;

        const latestSpeed = '(SELECT p.speed FROM positions p WHERE p.device_id = d.device_id ORDER BY p.timestamp DESC LIMIT 1) AS speed';
        const devicesResult = await query(
            isAdmin
                ? `SELECT d.device_id, d.name, d.status, d.current_state, ${latestSpeed} FROM devices d ORDER BY d.last_seen DESC`
                : `SELECT d.device_id, d.name, d.status, d.current_state, ${latestSpeed} FROM devices d WHERE d.tenant_id = ? ORDER BY d.last_seen DESC`,
            isAdmin ? [] : [tenantId]
        );
        const devices = devicesResult.rows as any[];
        const sinceDate = sqlDate(sinceMs);

        if (devices.length === 0) {
            return res.json({ period, sinceDate, threshold, deviceCount: 0, devices: [] });
        }

        const deviceIds = devices.map(d => d.device_id);
        const placeholders = deviceIds.map(() => '?').join(',');
        const positionsResult = await query(
            `SELECT device_id, lat, lng, speed, acc_status, timestamp
             FROM positions
             WHERE device_id IN (${placeholders}) AND timestamp >= ? AND lat != 0 AND lng != 0
             ORDER BY device_id, timestamp ASC`,
            [...deviceIds, sqlDate(prevSinceMs)]
        );

        const cur: Record<string, any[]> = {}, prv: Record<string, any[]> = {};
        for (const p of positionsResult.rows as any[]) {
            const bucket = new Date(p.timestamp).getTime() >= sinceMs ? cur : prv;
            (bucket[p.device_id] ||= []).push(p);
        }

        // Continuous list of local days for charts
        const dayList: string[] = [];
        for (let ms = sinceMs; ms <= nowMs + 1000; ms += 86400000) {
            const k = dayKey(ms);
            if (dayList[dayList.length - 1] !== k) dayList.push(k);
        }
        if (dayList[dayList.length - 1] !== dayKey(nowMs)) dayList.push(dayKey(nowMs));

        const fleetDaily: Record<string, { idleSeconds: number; km: number; speedingKm: number }> =
            Object.fromEntries(dayList.map(k => [k, { idleSeconds: 0, km: 0, speedingKm: 0 }]));
        const fleetHourly = new Array(24).fill(0);
        const fleetPrev = { idleHours: 0, km: 0, speedingKm: 0 };
        const allEvents: any[] = [];

        const deviceStats = devices.map(dev => {
            const name = dev.name || `Véhicule ${String(dev.device_id).slice(-4)}`;
            const positions = cur[dev.device_id] || [];
            const a = analyze(positions, threshold);
            const pa = analyze(prv[dev.device_id] || [], threshold);

            a.hourlyIdle.forEach((s, h) => (fleetHourly[h] += s));
            for (const [k, v] of Object.entries(a.days)) {
                if (fleetDaily[k]) {
                    fleetDaily[k].idleSeconds += v.idleSeconds;
                    fleetDaily[k].km += v.km;
                    fleetDaily[k].speedingKm += v.speedingKm;
                }
            }
            fleetPrev.idleHours += pa.idleSeconds / 3600;
            fleetPrev.km += pa.km;
            fleetPrev.speedingKm += pa.speedingKm;

            const sortedEvents = [...a.events].sort((x, y) => y.minutes - x.minutes);
            sortedEvents.slice(0, 50).forEach(e => allEvents.push({ ...e, device_id: dev.device_id, name }));

            const movingHours = a.movingSeconds / 3600;
            return {
                device_id: dev.device_id,
                name,
                current_state: dev.current_state || 'parked',
                speed: Number(dev.speed) || 0,
                positionCount: positions.length,
                idleSeconds: Math.round(a.idleSeconds),
                idleHours: r2(a.idleSeconds / 3600),
                movingHours: r2(movingHours),
                distanceKm: r1(a.km),
                speedingKm: r1(a.speedingKm),
                offHoursKm: r1(a.offHoursKm),
                avgSpeed: movingHours > 0.05 ? Math.round(a.km / movingHours) : 0,
                maxSpeed: Math.round(a.maxSpeed),
                idleEventCount: a.events.length,
                longestIdleMin: sortedEvents[0]?.minutes || 0,
                hourlyIdle: a.hourlyIdle.map(s => r2(s / 3600)),
                daily: dayList.map(k => {
                    const v = a.days[k];
                    return { date: k, idleHours: r2((v?.idleSeconds || 0) / 3600), km: r1(v?.km || 0), speedingKm: r1(v?.speedingKm || 0) };
                }),
                events: sortedEvents.slice(0, 15),
                prev: { idleHours: r2(pa.idleSeconds / 3600), km: r1(pa.km), speedingKm: r1(pa.speedingKm) },
            };
        });

        allEvents.sort((x, y) => y.minutes - x.minutes);

        return res.json({
            period,
            sinceDate,
            threshold,
            deviceCount: devices.length,
            fleet: {
                daily: dayList.map(k => ({
                    date: k,
                    idleHours: r2(fleetDaily[k].idleSeconds / 3600),
                    km: r1(fleetDaily[k].km),
                    speedingKm: r1(fleetDaily[k].speedingKm),
                })),
                hourlyIdle: fleetHourly.map(s => r2(s / 3600)),
                prev: { idleHours: r2(fleetPrev.idleHours), km: r1(fleetPrev.km), speedingKm: r1(fleetPrev.speedingKm) },
            },
            topEvents: allEvents.slice(0, 30),
            devices: deviceStats,
        });
    } catch (err) {
        console.error('[Fuel API] Error:', err);
        res.status(500).json({ error: 'Failed to compute fuel analytics' });
    }
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if ([lat1, lon1, lat2, lon2].some(isNaN)) return 0;
    const R = 6371;
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default router;
