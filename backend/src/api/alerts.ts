import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET alerts for tenant
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    const { status, severity, deviceId, limit = 50 } = req.query;

    try {
        let sql = `
            SELECT a.*, d.name as vehicle_name
            FROM alerts a
            LEFT JOIN devices d ON a.device_id = d.device_id
            WHERE a.tenant_id = ?
        `;
        const params: any[] = [tenantId];

        if (status) {
            sql += ' AND a.status = ?';
            params.push(status);
        }
        if (severity) {
            sql += ' AND a.severity = ?';
            params.push(severity);
        }
        if (deviceId) {
            sql += ' AND a.device_id = ?';
            params.push(deviceId);
        }

        sql += ' ORDER BY a.timestamp DESC LIMIT ?';
        params.push(parseInt(limit as string) || 50);

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to fetch alerts:', err);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// ACKNOWLEDGE alert
router.post('/:id/acknowledge', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { id } = req.params;

    try {
        await query(
            `UPDATE alerts SET 
                status = 'acknowledged',
                acknowledged_by = ?,
                acknowledged_at = NOW()
             WHERE id = ? AND tenant_id = ?`,
            [userId, id, tenantId]
        );
        res.json({ message: 'Alert acknowledged' });
    } catch (err) {
        console.error('Failed to acknowledge alert:', err);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

// RESOLVE alert
router.post('/:id/resolve', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    try {
        await query(
            `UPDATE alerts SET status = 'resolved' WHERE id = ? AND tenant_id = ?`,
            [id, tenantId]
        );
        res.json({ message: 'Alert resolved' });
    } catch (err) {
        console.error('Failed to resolve alert:', err);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

// GET alert rules
router.get('/rules', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    try {
        const result = await query(
            'SELECT * FROM alert_rules WHERE tenant_id = ? ORDER BY created_at DESC',
            [tenantId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to fetch alert rules:', err);
        res.status(500).json({ error: 'Failed to fetch alert rules' });
    }
});

// CREATE alert rule
router.post('/rules', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    const { name, type, deviceId, geofenceId, thresholdValue } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
    }

    try {
        const result = await query(
            `INSERT INTO alert_rules (tenant_id, name, type, device_id, geofence_id, threshold_value)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [tenantId, name, type, deviceId || null, geofenceId || null, thresholdValue || 0]
        );
        res.status(201).json({ id: (result as any).insertId, message: 'Alert rule created' });
    } catch (err) {
        console.error('Failed to create alert rule:', err);
        res.status(500).json({ error: 'Failed to create alert rule' });
    }
});

// DELETE alert rule
router.delete('/rules/:id', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    try {
        await query('DELETE FROM alert_rules WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        res.json({ message: 'Alert rule deleted' });
    } catch (err) {
        console.error('Failed to delete alert rule:', err);
        res.status(500).json({ error: 'Failed to delete alert rule' });
    }
});

export default router;
