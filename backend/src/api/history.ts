import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../db';

import { filterGpsSpikes } from '../utils/trajectoryFilter';

const router = Router();

// GET History for a device
router.get('/:deviceId/history', authenticateToken, async (req: AuthRequest, res) => {
    const { deviceId } = req.params;
    const { start, end } = req.query;
    const tenantId = req.user.tenantId;

    try {
        // Enforce tenant isolation for non-admin users
        if (req.user.role !== 'admin') {
            const deviceCheck = await query(
                'SELECT id FROM devices WHERE device_id = ? AND tenant_id = ?',
                [deviceId, tenantId]
            );
            if ((deviceCheck.rows as any[]).length === 0) {
                return res.status(404).json({ error: 'Device not found or unauthorized' });
            }
        }

        let sql = 'SELECT * FROM positions WHERE device_id = ?';
        const params: any[] = [deviceId];

        if (start && end) {
            sql += ' AND timestamp BETWEEN ? AND ?';
            params.push(new Date(start as string), new Date(end as string));
        }

        // Filter invalid null coordinates
        sql += ' AND (lat != 0 AND lng != 0)';
        sql += ' ORDER BY timestamp ASC LIMIT 50000';

        const result = await query(sql, params);
        
        // Filter out crazy GPS teleportation jumps and multipath spike outliers
        const cleanedPositions = filterGpsSpikes(result.rows as any[], 180);

        res.json(cleanedPositions);
    } catch (err) {
        console.error('Failed to fetch history:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// DELETE History for a device
router.delete('/:deviceId/history', authenticateToken, async (req: AuthRequest, res) => {
    const { deviceId } = req.params;
    const tenantId = req.user.tenantId;

    try {
        // Enforce tenant isolation for non-admin users
        if (req.user.role !== 'admin') {
            const deviceCheck = await query(
                'SELECT id FROM devices WHERE device_id = ? AND tenant_id = ?',
                [deviceId, tenantId]
            );
            if ((deviceCheck.rows as any[]).length === 0) {
                return res.status(404).json({ error: 'Device not found or unauthorized' });
            }
        }

        await query('DELETE FROM positions WHERE device_id = ?', [deviceId]);
        res.json({ message: 'History deleted successfully' });
    } catch (err) {
        console.error('Error deleting history:', err);
        res.status(500).json({ error: 'Failed to delete history' });
    }
});

export default router;
