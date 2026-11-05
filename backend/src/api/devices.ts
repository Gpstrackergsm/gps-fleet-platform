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

import fs from 'fs';
import path from 'path';

function saveBase64Image(dataUri: string, deviceId: string): string | null {
    if (!dataUri) return null;
    if (!dataUri.startsWith('data:image/')) {
        return dataUri;
    }

    try {
        const matches = dataUri.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return null;
        }

        let ext = matches[1].toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        const uploadDir = path.join(process.cwd(), 'uploads', 'vehicles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeId = deviceId.replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `veh_${safeId}_${Date.now()}.${ext}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, buffer);
        return `/uploads/vehicles/${filename}`;
    } catch (err) {
        console.error('Failed to save base64 vehicle image:', err);
        return null;
    }
}

// ADD a new device
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    const { deviceId, name, driver_name, image_url, plate_number, model, vehicle_type } = req.body;
    const tenantId = req.user.tenantId;

    if (!deviceId || !String(deviceId).trim()) {
        return res.status(400).json({ error: 'Device ID (IMEI) is required' });
    }

    try {
        const trimmedDeviceId = String(deviceId).trim();
        let finalImageUrl = null;
        if (image_url) {
            if (image_url.startsWith('data:image/')) {
                finalImageUrl = saveBase64Image(image_url, trimmedDeviceId);
            } else {
                finalImageUrl = String(image_url).trim();
            }
        }

        await query(
            `INSERT INTO devices (device_id, name, driver_name, image_url, plate_number, model, vehicle_type, status, tenant_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'offline', ?)`,
            [
                trimmedDeviceId,
                name ? String(name).trim() : null,
                driver_name ? String(driver_name).trim() : null,
                finalImageUrl,
                plate_number ? String(plate_number).trim() : null,
                model ? String(model).trim() : null,
                vehicle_type || 'car',
                tenantId
            ]
        );
        res.status(201).json({ message: 'Device added successfully' });
    } catch (err: any) {
        console.error('Failed to add device:', err);
        res.status(500).json({ error: err?.code === 'ER_DUP_ENTRY' ? 'Device IMEI already exists' : 'Failed to add device' });
    }
});

// UPDATE a device (Vehicle name, driver name, vehicle image, etc.)
const handleUpdateDevice = async (req: AuthRequest, res: any) => {
    const deviceId = String(req.params.deviceId);
    const { name, driver_name, image_url, plate_number, model, vehicle_type } = req.body;
    const tenantId = req.user.tenantId;
    const isAdmin = req.user.role === 'admin';

    try {
        // Enforce authorization
        const checkSql = isAdmin
            ? 'SELECT * FROM devices WHERE device_id = ?'
            : 'SELECT * FROM devices WHERE device_id = ? AND tenant_id = ?';
        const devCheck = await query(checkSql, isAdmin ? [deviceId] : [deviceId, tenantId]);
        const existing = (devCheck.rows as any[])[0];

        if (!existing) {
            return res.status(404).json({ error: 'Device not found or unauthorized' });
        }

        let finalImageUrl = existing.image_url;
        if (image_url !== undefined) {
            if (image_url === '' || image_url === null) {
                finalImageUrl = null;
            } else if (typeof image_url === 'string' && image_url.startsWith('data:image/')) {
                finalImageUrl = saveBase64Image(image_url, deviceId) || existing.image_url;
            } else {
                finalImageUrl = String(image_url).trim();
            }
        }

        const updatedName = name !== undefined ? (name ? String(name).trim() : null) : existing.name;
        const updatedDriver = driver_name !== undefined ? (driver_name ? String(driver_name).trim() : null) : existing.driver_name;
        const updatedPlate = plate_number !== undefined ? (plate_number ? String(plate_number).trim() : null) : existing.plate_number;
        const updatedModel = model !== undefined ? (model ? String(model).trim() : null) : existing.model;
        const updatedType = vehicle_type !== undefined ? (vehicle_type ? String(vehicle_type).trim() : 'car') : (existing.vehicle_type || 'car');

        await query(
            `UPDATE devices SET 
                name = ?, 
                driver_name = ?, 
                image_url = ?, 
                plate_number = ?, 
                model = ?, 
                vehicle_type = ? 
            WHERE device_id = ?`,
            [updatedName, updatedDriver, finalImageUrl, updatedPlate, updatedModel, updatedType, deviceId]
        );

        res.json({
            message: 'Vehicle updated successfully',
            device: {
                device_id: deviceId,
                name: updatedName,
                driver_name: updatedDriver,
                image_url: finalImageUrl,
                plate_number: updatedPlate,
                model: updatedModel,
                vehicle_type: updatedType
            }
        });
    } catch (err) {
        console.error('Failed to update device:', err);
        res.status(500).json({ error: 'Failed to update vehicle' });
    }
};

router.put('/:deviceId', authenticateToken, handleUpdateDevice);
router.patch('/:deviceId', authenticateToken, handleUpdateDevice);

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
