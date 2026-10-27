import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth';
import { query, transaction } from '../db';

const router = Router();

// GET All Clients with Vehicle Counts
router.get('/clients', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const currentUserId = req.user?.id || 0;
        const result = await query(`
            SELECT 
                u.id, 
                u.email, 
                u.phone,
                u.role, 
                u.tenant_id,
                u.created_at,
                t.name as company_name,
                COUNT(d.id) as vehicle_count
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            LEFT JOIN devices d ON d.tenant_id = t.id
            WHERE u.id != ?
            GROUP BY u.id, t.name, u.email, u.phone, u.role, u.tenant_id, u.created_at
            ORDER BY u.created_at DESC
        `, [currentUserId]);
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin] Failed to fetch clients:', err);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// CREATE New Client (Tenant + User Account)
router.post('/clients', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { companyName, email, password, phone } = req.body;

    if (!companyName || !email || !password) {
        return res.status(400).json({ error: 'Company name, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const result = await transaction(async (conn) => {
            // Check if user already exists
            const [existing] = await conn.query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
            if (existing && existing.length > 0) {
                throw new Error('EMAIL_EXISTS');
            }

            // 1. Create Tenant (Company)
            const [tenantRes] = await conn.query<any>('INSERT INTO tenants (name) VALUES (?)', [companyName.trim()]);
            const tenantId = tenantRes.insertId;

            // 2. Create Client User Account
            const hashedPassword = await bcrypt.hash(password, 10);
            const [userRes] = await conn.query<any>(
                'INSERT INTO users (email, password_hash, tenant_id, role, phone) VALUES (?, ?, ?, "client", ?)',
                [email.trim().toLowerCase(), hashedPassword, tenantId, phone ? phone.trim() : null]
            );

            return {
                id: userRes.insertId,
                email: email.trim().toLowerCase(),
                companyName: companyName.trim(),
                phone: phone ? phone.trim() : null,
                tenantId
            };
        });

        res.status(201).json({
            message: 'Client created successfully',
            client: result
        });
    } catch (err: any) {
        if (err.message === 'EMAIL_EXISTS') {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }
        console.error('[Admin] Failed to create client:', err);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// GET Single Client Details & Devices
router.get('/clients/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const userId = req.params.id;
    try {
        // 1. Fetch Client Details
        const userResult = await query(`
            SELECT 
                u.id, 
                u.email, 
                u.phone,
                u.role, 
                u.tenant_id,
                u.created_at,
                t.name as company_name
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            WHERE u.id = ?
        `, [userId]);

        const users = userResult.rows as any[];
        if (users.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const client = users[0];

        // 2. Fetch Client's Devices with full vehicle details
        const devicesResult = await query(`
            SELECT 
                id,
                device_id,
                name,
                status,
                plate_number,
                model,
                vehicle_type,
                sim_phone,
                driver_name,
                driver_phone,
                notes,
                current_state,
                last_seen,
                tenant_id,
                created_at
            FROM devices 
            WHERE tenant_id = ? 
            ORDER BY created_at DESC
        `, [client.tenant_id]);

        res.json({
            client,
            devices: devicesResult.rows
        });
    } catch (err) {
        console.error('[Admin] Failed to fetch client details:', err);
        res.status(500).json({ error: 'Failed to fetch client details' });
    }
});

// UPDATE Client
router.put('/clients/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const userId = req.params.id;
    const { companyName, email, phone, password } = req.body;

    try {
        const userRes = await query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
        const users = userRes.rows as any[];
        if (users.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        const tenantId = users[0].tenant_id;

        await transaction(async (conn) => {
            if (companyName) {
                await conn.query('UPDATE tenants SET name = ? WHERE id = ?', [companyName.trim(), tenantId]);
            }
            if (password && password.length >= 6) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
            }
            await conn.query(
                'UPDATE users SET email = COALESCE(?, email), phone = ? WHERE id = ?',
                [email ? email.trim().toLowerCase() : null, phone ? phone.trim() : null, userId]
            );
        });

        res.json({ message: 'Client updated successfully' });
    } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already in use' });
        }
        console.error('[Admin] Failed to update client:', err);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// DELETE Client
router.delete('/clients/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const userId = req.params.id;
    try {
        const userRes = await query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
        const users = userRes.rows as any[];
        if (users.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        const tenantId = users[0].tenant_id;

        await transaction(async (conn) => {
            // Delete positions, alerts, alert_rules, geofences, devices, users, then tenant
            await conn.query('DELETE FROM positions WHERE device_id IN (SELECT device_id FROM devices WHERE tenant_id = ?)', [tenantId]);
            await conn.query('DELETE FROM alerts WHERE tenant_id = ?', [tenantId]);
            await conn.query('DELETE FROM alert_rules WHERE tenant_id = ?', [tenantId]);
            await conn.query('DELETE FROM geofences WHERE tenant_id = ?', [tenantId]);
            await conn.query('DELETE FROM devices WHERE tenant_id = ?', [tenantId]);
            await conn.query('DELETE FROM users WHERE tenant_id = ?', [tenantId]);
            await conn.query('DELETE FROM tenants WHERE id = ?', [tenantId]);
        });

        res.json({ message: 'Client and all associated data deleted successfully' });
    } catch (err) {
        console.error('[Admin] Failed to delete client:', err);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

// ASSIGN / CREATE Vehicle (Device) for Client
router.post('/devices', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const {
        deviceId,
        name,
        tenantId,
        simPhone,
        plateNumber,
        model,
        vehicleType,
        driverName,
        driverPhone,
        notes
    } = req.body;

    if (!deviceId || !tenantId) {
        return res.status(400).json({ error: 'Device IMEI (ID) and Tenant ID are required' });
    }

    const cleanDeviceId = String(deviceId).trim();
    if (cleanDeviceId.length < 4) {
        return res.status(400).json({ error: 'Device ID / IMEI must be at least 4 characters' });
    }

    try {
        await query(
            `INSERT INTO devices (
                device_id, name, tenant_id, sim_phone, plate_number, model, vehicle_type, driver_name, driver_phone, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cleanDeviceId,
                name ? name.trim() : `Vehicle-${cleanDeviceId.slice(-4)}`,
                tenantId,
                simPhone ? simPhone.trim() : null,
                plateNumber ? plateNumber.trim() : null,
                model ? model.trim() : null,
                vehicleType || 'car',
                driverName ? driverName.trim() : null,
                driverPhone ? driverPhone.trim() : null,
                notes ? notes.trim() : null
            ]
        );

        // Seed initial default position if none exists
        try {
            await query(
                'INSERT INTO positions (device_id, lat, lng, speed, timestamp) VALUES (?, ?, ?, ?, NOW())',
                [cleanDeviceId, 31.626829, -8.003744, 0]
            );
        } catch { /* ignore if already has positions */ }

        res.status(201).json({ message: 'Vehicle registered and assigned successfully' });
    } catch (err: any) {
        console.error('[Admin] Failed to assign device:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: `Device ID / IMEI (${cleanDeviceId}) is already registered in the system` });
        }
        res.status(500).json({ error: 'Failed to assign device' });
    }
});

// UPDATE Device
router.put('/devices/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const id = req.params.id;
    const {
        deviceId,
        name,
        simPhone,
        plateNumber,
        model,
        vehicleType,
        driverName,
        driverPhone,
        notes
    } = req.body;

    try {
        await query(
            `UPDATE devices SET 
                device_id = COALESCE(?, device_id), 
                name = COALESCE(?, name), 
                sim_phone = ?, 
                plate_number = ?, 
                model = ?, 
                vehicle_type = COALESCE(?, vehicle_type), 
                driver_name = ?, 
                driver_phone = ?, 
                notes = ? 
            WHERE id = ?`,
            [
                deviceId ? String(deviceId).trim() : null,
                name ? name.trim() : null,
                simPhone ? simPhone.trim() : null,
                plateNumber ? plateNumber.trim() : null,
                model ? model.trim() : null,
                vehicleType || null,
                driverName ? driverName.trim() : null,
                driverPhone ? driverPhone.trim() : null,
                notes ? notes.trim() : null,
                id
            ]
        );
        res.json({ message: 'Device updated successfully' });
    } catch (err: any) {
        console.error('[Admin] Failed to update device:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Device ID (IMEI) already exists for another vehicle' });
        }
        res.status(500).json({ error: 'Failed to update device' });
    }
});

// DELETE Device
router.delete('/devices/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const id = req.params.id;
    try {
        // Fetch device_id first to delete positions
        const devRes = await query('SELECT device_id FROM devices WHERE id = ?', [id]);
        const devs = devRes.rows as any[];
        if (devs.length > 0) {
            const devId = devs[0].device_id;
            await query('DELETE FROM positions WHERE device_id = ?', [devId]);
            await query('DELETE FROM alerts WHERE device_id = ?', [devId]);
        }
        await query('DELETE FROM devices WHERE id = ?', [id]);
        res.json({ message: 'Device deleted successfully' });
    } catch (err) {
        console.error('[Admin] Failed to delete device:', err);
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

// SEARCH User by Email
router.get('/users/search', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email query parameter required' });

    try {
        const result = await query(
            `SELECT u.id, u.email, u.phone, u.role, u.tenant_id, t.name as company_name 
             FROM users u 
             JOIN tenants t ON u.tenant_id = t.id 
             WHERE u.email LIKE ?`,
            [`%${email}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Search failed' });
    }
});

export default router;
