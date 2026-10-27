import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { sendCommandToDevice, activeSockets } from '../tcpServer';

const router = Router();

// GET all devices for the tenant (or all devices if admin) with latest position and telemetry
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';

        const result = await query(`
            SELECT 
                d.*,
                p.lat,
                p.lng,
                p.speed,
                p.course,
                p.battery_level as pos_battery_level,
                p.door_status,
                p.timestamp as last_update,
                t.name as company_name
            FROM devices d
            LEFT JOIN tenants t ON t.id = d.tenant_id
            LEFT JOIN positions p ON p.id = (
                SELECT id FROM positions 
                WHERE device_id = d.device_id 
                ORDER BY timestamp DESC 
                LIMIT 1
            )
            ${isAdmin ? '' : 'WHERE d.tenant_id = ?'}
            ORDER BY d.last_seen DESC
        `, isAdmin ? [] : [tenantId]);

        // Enrich with live TCP socket connection status
        const enriched = (result.rows as any[]).map(dev => ({
            ...dev,
            isTcpConnected: activeSockets.has(dev.device_id) && !activeSockets.get(dev.device_id)?.destroyed
        }));

        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// ADD a new device
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    const { deviceId, name } = req.body;
    const tenantId = req.user.tenantId;

    try {
        await query(
            'INSERT INTO devices (device_id, name, status, tenant_id) VALUES (?, ?, ?, ?)',
            [deviceId, name, 'offline', tenantId]
        );
        res.status(201).json({ message: 'Device added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add device' });
    }
});

// SEND 2-WAY COMMAND TO TRACKER (Engine Immobilizer, Resume, Arm, Disarm, Interval)
router.post('/:deviceId/command', authenticateToken, async (req: AuthRequest, res) => {
    const deviceId = String(req.params.deviceId);
    const { commandType, customCommand, intervalSeconds } = req.body;
    const tenantId = req.user.tenantId;
    const isAdmin = req.user.role === 'admin';

    try {
        // Enforce authorization
        const devCheck = await query(
            isAdmin 
                ? 'SELECT * FROM devices WHERE device_id = ?' 
                : 'SELECT * FROM devices WHERE device_id = ? AND tenant_id = ?',
            isAdmin ? [deviceId] : [deviceId, tenantId]
        );

        const devices = devCheck.rows as any[];
        if (devices.length === 0) {
            return res.status(404).json({ error: 'Device not found or unauthorized' });
        }

        const device = devices[0];

        // Map commandType to TK103 command syntax
        let cmd = '';
        switch (commandType) {
            case 'stop_engine':
                cmd = 'stop123456';
                break;
            case 'resume_engine':
                cmd = 'resume123456';
                break;
            case 'arm':
                cmd = 'arm123456';
                break;
            case 'disarm':
                cmd = 'disarm123456';
                break;
            case 'set_interval':
                const sec = Math.max(5, Math.min(3600, parseInt(intervalSeconds) || 30));
                cmd = `fix${String(sec).padStart(3, '0')}s***n123456`;
                break;
            case 'custom':
                cmd = String(customCommand || '').trim();
                break;
            default:
                return res.status(400).json({ error: 'Invalid command type' });
        }

        if (!cmd) {
            return res.status(400).json({ error: 'Empty command payload' });
        }

        // Try to transmit directly through live TCP socket
        const sent = sendCommandToDevice(deviceId, cmd);

        if (sent) {
            return res.json({
                success: true,
                method: 'tcp',
                command: cmd,
                message: `Command "${cmd}" sent to tracker over live TCP socket`
            });
        } else {
            return res.json({
                success: false,
                method: 'offline',
                command: cmd,
                simPhone: device.sim_phone || null,
                message: `Tracker is currently not connected via TCP. You can send this command via SMS to ${device.sim_phone || 'tracker SIM'}: "${cmd}"`
            });
        }

    } catch (err) {
        console.error('[Command] Error sending command:', err);
        res.status(500).json({ error: 'Failed to send command' });
    }
});

// DELETE a device
router.delete('/:deviceId', authenticateToken, async (req: AuthRequest, res) => {
    const { deviceId } = req.params;
    const tenantId = req.user.tenantId;
    const isAdmin = req.user.role === 'admin';

    try {
        await query(
            isAdmin ? 'DELETE FROM devices WHERE device_id = ?' : 'DELETE FROM devices WHERE device_id = ? AND tenant_id = ?',
            isAdmin ? [deviceId] : [deviceId, tenantId]
        );
        res.json({ message: 'Device deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

export default router;
