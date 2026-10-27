import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET all active geofences for tenant
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    try {
        const result = await query(
            'SELECT * FROM geofences WHERE tenant_id = ? ORDER BY created_at DESC',
            [tenantId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to fetch geofences:', err);
        res.status(500).json({ error: 'Failed to fetch geofences' });
    }
});

// CREATE a new geofence
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    const { name, description, type, centerLat, centerLng, radiusMeters, polygonCoordinates, speedLimit } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Geofence name is required' });
    }

    try {
        const result = await query(
            `INSERT INTO geofences (tenant_id, name, description, type, center_lat, center_lng, radius_meters, polygon_coordinates, speed_limit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                name,
                description || null,
                type || 'circle',
                centerLat || null,
                centerLng || null,
                radiusMeters || 500,
                polygonCoordinates ? JSON.stringify(polygonCoordinates) : null,
                speedLimit || 0
            ]
        );
        res.status(201).json({ id: (result as any).insertId, message: 'Geofence created' });
    } catch (err) {
        console.error('Failed to create geofence:', err);
        res.status(500).json({ error: 'Failed to create geofence' });
    }
});

// UPDATE geofence
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, description, type, centerLat, centerLng, radiusMeters, polygonCoordinates, speedLimit, isActive } = req.body;

    try {
        const check = await query('SELECT id FROM geofences WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        if ((check.rows as any[]).length === 0) {
            return res.status(404).json({ error: 'Geofence not found' });
        }

        await query(
            `UPDATE geofences SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                type = COALESCE(?, type),
                center_lat = COALESCE(?, center_lat),
                center_lng = COALESCE(?, center_lng),
                radius_meters = COALESCE(?, radius_meters),
                polygon_coordinates = COALESCE(?, polygon_coordinates),
                speed_limit = COALESCE(?, speed_limit),
                is_active = COALESCE(?, is_active)
             WHERE id = ? AND tenant_id = ?`,
            [
                name,
                description,
                type,
                centerLat,
                centerLng,
                radiusMeters,
                polygonCoordinates ? JSON.stringify(polygonCoordinates) : null,
                speedLimit,
                isActive,
                id,
                tenantId
            ]
        );
        res.json({ message: 'Geofence updated' });
    } catch (err) {
        console.error('Failed to update geofence:', err);
        res.status(500).json({ error: 'Failed to update geofence' });
    }
});

// DELETE geofence
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    try {
        const result = await query(
            'DELETE FROM geofences WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ error: 'Geofence not found' });
        }
        res.json({ message: 'Geofence deleted' });
    } catch (err) {
        console.error('Failed to delete geofence:', err);
        res.status(500).json({ error: 'Failed to delete geofence' });
    }
});

export default router;
