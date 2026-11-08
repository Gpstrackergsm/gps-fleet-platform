import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

export interface MaintenanceServiceItem {
    id: number;
    tenant_id: number;
    device_id: string;
    service_type: string;
    title: string;
    interval_km: number;
    last_service_km: number;
    last_service_date: string | null;
    next_due_km: number;
    alert_before_km: number;
    cost_mad: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // Enriched fields from devices
    device_name?: string;
    plate_number?: string;
    model?: string;
    driver_name?: string;
    image_url?: string;
    current_odometer_km?: number;
    km_remaining?: number;
    progress_percent?: number;
    status?: 'ok' | 'due_soon' | 'overdue';
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/maintenance/overview
// Aggregate statistics across all vehicles for the tenant
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';

        // Fetch all active maintenance services with their corresponding device odometer
        const sql = `
            SELECT 
                s.*,
                COALESCE(d.odometer_km, 0) as current_odometer_km
            FROM maintenance_services s
            INNER JOIN devices d ON d.device_id = s.device_id
            ${isAdmin ? '' : 'WHERE s.tenant_id = ?'}
        `;
        const result = await query(sql, isAdmin ? [] : [tenantId]);
        const services = (result.rows as any[]) || [];

        let okCount = 0;
        let dueSoonCount = 0;
        let overdueCount = 0;

        for (const s of services) {
            const currentKm = Number(s.current_odometer_km) || 0;
            const nextDueKm = Number(s.next_due_km) || 0;
            const alertBeforeKm = Number(s.alert_before_km) || 1000;
            const remaining = nextDueKm - currentKm;

            if (remaining < 0) {
                overdueCount++;
            } else if (remaining <= alertBeforeKm) {
                dueSoonCount++;
            } else {
                okCount++;
            }
        }

        // Aggregate total expenses from logs
        const logSql = `
            SELECT 
                COUNT(*) as total_logs,
                COALESCE(SUM(cost_mad), 0) as total_spent,
                COALESCE(SUM(CASE WHEN service_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN cost_mad ELSE 0 END), 0) as spent_30d
            FROM maintenance_logs
            ${isAdmin ? '' : 'WHERE tenant_id = ?'}
        `;
        const logResult = await query(logSql, isAdmin ? [] : [tenantId]);
        const logStats = (logResult.rows as any[])[0] || {};

        return res.json({
            total_services: services.length,
            ok_count: okCount,
            due_soon_count: dueSoonCount,
            overdue_count: overdueCount,
            total_spent_mad: Number(logStats.total_spent) || 0,
            spent_30d_mad: Number(logStats.spent_30d) || 0,
            total_logs_count: Number(logStats.total_logs) || 0
        });
    } catch (err: any) {
        console.error('[Maintenance API] Error in /overview:', err);
        return res.status(500).json({ error: 'Failed to fetch maintenance overview' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/maintenance/services
// List scheduled services (filterable by device_id and status)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/services', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';
        const deviceId = req.query.device_id ? String(req.query.device_id) : null;
        const statusFilter = req.query.status ? String(req.query.status) : null;

        const whereClauses: string[] = [];
        const params: any[] = [];

        if (!isAdmin) {
            whereClauses.push('s.tenant_id = ?');
            params.push(tenantId);
        }
        if (deviceId) {
            whereClauses.push('s.device_id = ?');
            params.push(deviceId);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const sql = `
            SELECT 
                s.*,
                d.name as device_name,
                d.plate_number,
                d.model,
                d.driver_name,
                d.image_url,
                COALESCE(d.odometer_km, 0) as current_odometer_km
            FROM maintenance_services s
            INNER JOIN devices d ON d.device_id = s.device_id
            ${whereSql}
            ORDER BY (s.next_due_km - COALESCE(d.odometer_km, 0)) ASC
        `;

        const result = await query(sql, params);
        const rows = (result.rows as any[]) || [];

        const enriched = rows.map(r => {
            const currentKm = Number(r.current_odometer_km) || 0;
            const lastKm = Number(r.last_service_km) || 0;
            const nextDueKm = Number(r.next_due_km) || 0;
            const intervalKm = Number(r.interval_km) || 10000;
            const alertBeforeKm = Number(r.alert_before_km) || 1000;

            const kmRemaining = nextDueKm - currentKm;
            let status: 'ok' | 'due_soon' | 'overdue' = 'ok';
            if (kmRemaining < 0) {
                status = 'overdue';
            } else if (kmRemaining <= alertBeforeKm) {
                status = 'due_soon';
            }

            const traveledInInterval = Math.max(0, currentKm - lastKm);
            const progressPercent = Math.min(100, Math.max(0, Math.round((traveledInInterval / intervalKm) * 100)));

            return {
                ...r,
                km_remaining: kmRemaining,
                progress_percent: progressPercent,
                status
            };
        });

        const filtered = statusFilter
            ? enriched.filter(item => item.status === statusFilter)
            : enriched;

        return res.json(filtered);
    } catch (err: any) {
        console.error('[Maintenance API] Error in /services:', err);
        return res.status(500).json({ error: 'Failed to fetch maintenance services' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/maintenance/services
// Create a new scheduled maintenance service
// ─────────────────────────────────────────────────────────────────────────────
router.post('/services', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';
        const {
            device_id,
            service_type,
            title,
            interval_km,
            last_service_km,
            last_service_date,
            alert_before_km,
            cost_mad,
            notes
        } = req.body;

        if (!device_id || !title) {
            return res.status(400).json({ error: 'device_id and title are required' });
        }

        // Validate vehicle belongs to tenant
        const devCheck = await query(
            isAdmin
                ? 'SELECT id, odometer_km FROM devices WHERE device_id = ?'
                : 'SELECT id, odometer_km FROM devices WHERE device_id = ? AND tenant_id = ?',
            isAdmin ? [device_id] : [device_id, tenantId]
        );
        const dev = (devCheck.rows as any[])[0];
        if (!dev) {
            return res.status(404).json({ error: 'Device not found or unauthorized' });
        }

        const interval = Math.max(500, Number(interval_km) || 10000);
        const lastKm = Number(last_service_km) >= 0 ? Number(last_service_km) : (Number(dev.odometer_km) || 0);
        const nextDueKm = lastKm + interval;
        const alertBefore = Math.max(100, Number(alert_before_km) || 1000);
        const serviceType = service_type || 'custom';
        const initialCost = Number(cost_mad) || 0;

        const insertSql = `
            INSERT INTO maintenance_services (
                tenant_id, device_id, service_type, title,
                interval_km, last_service_km, last_service_date,
                next_due_km, alert_before_km, cost_mad, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertRes = await query(insertSql, [
            tenantId,
            device_id,
            serviceType,
            String(title).trim(),
            interval,
            lastKm,
            last_service_date || null,
            nextDueKm,
            alertBefore,
            initialCost,
            notes || null
        ]);

        return res.status(201).json({
            message: 'Service schedule created successfully',
            id: insertRes.insertId,
            next_due_km: nextDueKm
        });
    } catch (err: any) {
        console.error('[Maintenance API] Error in POST /services:', err);
        return res.status(500).json({ error: 'Failed to create maintenance schedule' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUT /api/maintenance/services/:id
// Update an existing maintenance schedule
// ─────────────────────────────────────────────────────────────────────────────
router.put('/services/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = Number(req.params.id);
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';
        const {
            title,
            service_type,
            interval_km,
            last_service_km,
            last_service_date,
            alert_before_km,
            cost_mad,
            notes
        } = req.body;

        const checkSql = isAdmin
            ? 'SELECT * FROM maintenance_services WHERE id = ?'
            : 'SELECT * FROM maintenance_services WHERE id = ? AND tenant_id = ?';
        const existingResult = await query(checkSql, isAdmin ? [id] : [id, tenantId]);
        const existing = (existingResult.rows as any[])[0];

        if (!existing) {
            return res.status(404).json({ error: 'Maintenance service not found' });
        }

        const newInterval = interval_km !== undefined ? Math.max(500, Number(interval_km)) : existing.interval_km;
        const newLastKm = last_service_km !== undefined ? Math.max(0, Number(last_service_km)) : existing.last_service_km;
        const newNextDueKm = newLastKm + newInterval;
        const newAlertBefore = alert_before_km !== undefined ? Math.max(100, Number(alert_before_km)) : existing.alert_before_km;

        const updateSql = `
            UPDATE maintenance_services SET
                title = COALESCE(?, title),
                service_type = COALESCE(?, service_type),
                interval_km = ?,
                last_service_km = ?,
                last_service_date = ?,
                next_due_km = ?,
                alert_before_km = ?,
                cost_mad = COALESCE(?, cost_mad),
                notes = ?
            WHERE id = ?
        `;

        await query(updateSql, [
            title ? String(title).trim() : null,
            service_type || null,
            newInterval,
            newLastKm,
            last_service_date || existing.last_service_date,
            newNextDueKm,
            newAlertBefore,
            cost_mad !== undefined ? Number(cost_mad) : null,
            notes !== undefined ? notes : existing.notes,
            id
        ]);

        return res.json({ message: 'Service schedule updated successfully', next_due_km: newNextDueKm });
    } catch (err: any) {
        console.error('[Maintenance API] Error in PUT /services/:id:', err);
        return res.status(500).json({ error: 'Failed to update maintenance schedule' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE /api/maintenance/services/:id
// Delete a maintenance schedule
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/services/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = Number(req.params.id);
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';

        const checkSql = isAdmin
            ? 'DELETE FROM maintenance_services WHERE id = ?'
            : 'DELETE FROM maintenance_services WHERE id = ? AND tenant_id = ?';
        await query(checkSql, isAdmin ? [id] : [id, tenantId]);

        return res.json({ message: 'Service schedule deleted successfully' });
    } catch (err: any) {
        console.error('[Maintenance API] Error in DELETE /services/:id:', err);
        return res.status(500).json({ error: 'Failed to delete service schedule' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /api/maintenance/services/:id/complete
// Complete an intervention (log it and roll over next service interval)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/services/:id/complete', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = Number(req.params.id);
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';

        const {
            service_km,
            service_date,
            cost_mad,
            performed_by,
            invoice_number,
            notes,
            next_interval_km
        } = req.body;

        const checkSql = isAdmin
            ? 'SELECT * FROM maintenance_services WHERE id = ?'
            : 'SELECT * FROM maintenance_services WHERE id = ? AND tenant_id = ?';
        const existingResult = await query(checkSql, isAdmin ? [id] : [id, tenantId]);
        const service = (existingResult.rows as any[])[0];

        if (!service) {
            return res.status(404).json({ error: 'Maintenance service not found' });
        }

        const actualKm = Number(service_km) >= 0 ? Number(service_km) : service.next_due_km;
        const actualDate = service_date || new Date().toISOString().split('T')[0];
        const actualCost = Math.max(0, Number(cost_mad) || 0);
        const interval = next_interval_km ? Math.max(500, Number(next_interval_km)) : service.interval_km;
        const nextDueKm = actualKm + interval;

        // 1. Insert into maintenance_logs
        const logSql = `
            INSERT INTO maintenance_logs (
                tenant_id, device_id, service_id, service_type,
                title, service_km, service_date, cost_mad,
                performed_by, invoice_number, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await query(logSql, [
            tenantId,
            service.device_id,
            service.id,
            service.service_type,
            service.title,
            actualKm,
            actualDate,
            actualCost,
            performed_by ? String(performed_by).trim() : null,
            invoice_number ? String(invoice_number).trim() : null,
            notes || null
        ]);

        // 2. Update maintenance_services schedule for next cycle
        const updateServiceSql = `
            UPDATE maintenance_services SET
                interval_km = ?,
                last_service_km = ?,
                last_service_date = ?,
                next_due_km = ?,
                cost_mad = ?
            WHERE id = ?
        `;
        await query(updateServiceSql, [
            interval,
            actualKm,
            actualDate,
            nextDueKm,
            actualCost,
            service.id
        ]);

        // 3. Update device odometer if the service km is higher than current recorded odometer
        await query(
            'UPDATE devices SET odometer_km = GREATEST(COALESCE(odometer_km, 0), ?) WHERE device_id = ?',
            [actualKm, service.device_id]
        );

        return res.json({
            message: 'Intervention enregistrée avec succès',
            next_due_km: nextDueKm,
            service_km: actualKm
        });
    } catch (err: any) {
        console.error('[Maintenance API] Error in complete service:', err);
        return res.status(500).json({ error: 'Failed to record completed maintenance' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /api/maintenance/logs
// History of all completed interventions
// ─────────────────────────────────────────────────────────────────────────────
router.get('/logs', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';
        const deviceId = req.query.device_id ? String(req.query.device_id) : null;

        const whereClauses: string[] = [];
        const params: any[] = [];

        if (!isAdmin) {
            whereClauses.push('l.tenant_id = ?');
            params.push(tenantId);
        }
        if (deviceId) {
            whereClauses.push('l.device_id = ?');
            params.push(deviceId);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const sql = `
            SELECT 
                l.*,
                d.name as device_name,
                d.plate_number,
                d.model,
                d.driver_name,
                d.image_url
            FROM maintenance_logs l
            LEFT JOIN devices d ON d.device_id = l.device_id
            ${whereSql}
            ORDER BY l.service_date DESC, l.id DESC
        `;

        const result = await query(sql, params);
        return res.json(result.rows || []);
    } catch (err: any) {
        console.error('[Maintenance API] Error in /logs:', err);
        return res.status(500).json({ error: 'Failed to fetch maintenance logs' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. DELETE /api/maintenance/logs/:id
// Delete a specific maintenance log
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/logs/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = Number(req.params.id);
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';

        const sql = isAdmin
            ? 'DELETE FROM maintenance_logs WHERE id = ?'
            : 'DELETE FROM maintenance_logs WHERE id = ? AND tenant_id = ?';
        await query(sql, isAdmin ? [id] : [id, tenantId]);

        return res.json({ message: 'Log deleted successfully' });
    } catch (err: any) {
        console.error('[Maintenance API] Error in DELETE /logs/:id:', err);
        return res.status(500).json({ error: 'Failed to delete maintenance log' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. POST /api/maintenance/batch-init/:deviceId
// Quick 1-click preset initializer (Standard Moroccan Fleet Maintenance Package)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/batch-init/:deviceId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const deviceId = String(req.params.deviceId);
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';
        const currentOdometer = Math.max(0, Number(req.body.current_odometer_km) || 0);

        // Fetch vehicle
        const devCheck = await query(
            isAdmin
                ? 'SELECT id, odometer_km FROM devices WHERE device_id = ?'
                : 'SELECT id, odometer_km FROM devices WHERE device_id = ? AND tenant_id = ?',
            isAdmin ? [deviceId] : [deviceId, tenantId]
        );
        const dev = (devCheck.rows as any[])[0];
        if (!dev) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const baseKm = currentOdometer > 0 ? currentOdometer : (Number(dev.odometer_km) || 0);

        // If user provided a positive odometer, update device
        if (currentOdometer > 0) {
            await query('UPDATE devices SET odometer_km = ? WHERE device_id = ?', [currentOdometer, deviceId]);
        }

        // Standard Fleet Package presets
        const presets = [
            { type: 'oil_change', title: 'Vidange Huile Moteur (10W40 / 5W30)', interval: 10000, alert: 1000 },
            { type: 'oil_filter', title: 'Filtre à Huile', interval: 10000, alert: 1000 },
            { type: 'fuel_filter', title: 'Filtre à Carburant (Gasoil / Essence)', interval: 20000, alert: 2000 },
            { type: 'air_filter', title: 'Filtre à Air & Habitacle', interval: 20000, alert: 2000 },
            { type: 'brake_pads', title: 'Plaquettes de Frein Avant / Arrière', interval: 30000, alert: 3000 },
            { type: 'tires', title: 'Rotation & Contrôle Pneumatiques', interval: 40000, alert: 4000 },
            { type: 'timing_belt', title: 'Courroie de Distribution & Pompe à Eau', interval: 80000, alert: 5000 },
        ];

        let createdCount = 0;
        for (const p of presets) {
            // Check if service already exists
            const existingCheck = await query(
                'SELECT id FROM maintenance_services WHERE device_id = ? AND service_type = ?',
                [deviceId, p.type]
            );
            if ((existingCheck.rows as any[]).length === 0) {
                await query(
                    `INSERT INTO maintenance_services (
                        tenant_id, device_id, service_type, title,
                        interval_km, last_service_km, last_service_date,
                        next_due_km, alert_before_km, cost_mad
                    ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, 0)`,
                    [
                        tenantId,
                        deviceId,
                        p.type,
                        p.title,
                        p.interval,
                        baseKm,
                        baseKm + p.interval,
                        p.alert
                    ]
                );
                createdCount++;
            }
        }

        return res.json({
            message: `${createdCount} rappels d'entretien initialisés avec succès`,
            base_km: baseKm,
            created_count: createdCount
        });
    } catch (err: any) {
        console.error('[Maintenance API] Error in batch-init:', err);
        return res.status(500).json({ error: 'Failed to initialize maintenance presets' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. PUT /api/devices/:deviceId/odometer
// Update vehicle baseline odometer reading
// ─────────────────────────────────────────────────────────────────────────────
router.put('/odometer/:deviceId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const deviceId = String(req.params.deviceId);
        const tenantId = req.user.tenantId;
        const isAdmin = req.user.role === 'admin';
        const newOdometer = Math.max(0, Number(req.body.odometer_km) || 0);

        const checkSql = isAdmin
            ? 'SELECT id FROM devices WHERE device_id = ?'
            : 'SELECT id FROM devices WHERE device_id = ? AND tenant_id = ?';
        const devCheck = await query(checkSql, isAdmin ? [deviceId] : [deviceId, tenantId]);
        if ((devCheck.rows as any[]).length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await query('UPDATE devices SET odometer_km = ? WHERE device_id = ?', [newOdometer, deviceId]);

        return res.json({ message: 'Odomètre mis à jour', odometer_km: newOdometer });
    } catch (err: any) {
        console.error('[Maintenance API] Error updating odometer:', err);
        return res.status(500).json({ error: 'Failed to update odometer' });
    }
});

export default router;
