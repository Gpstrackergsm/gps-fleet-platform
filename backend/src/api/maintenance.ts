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
    interval_days: number;
    last_service_km: number;
    last_service_date: string | null;
    next_due_km: number;
    next_due_date: string | null;
    alert_before_km: number;
    alert_before_days: number;
    is_mandatory: boolean;
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
    days_remaining?: number;
    progress_percent?: number;
    status?: 'ok' | 'due_soon' | 'overdue';
}

/**
 * Unified computation for maintenance status and progress:
 * Works for km-based (e.g. oil change), date-based (e.g. annual technical inspection), or dual
 */
export function computeServiceStatus(s: {
    current_odometer_km?: number;
    last_service_km?: number;
    next_due_km?: number;
    interval_km?: number;
    alert_before_km?: number;
    last_service_date?: string | null;
    next_due_date?: string | null;
    interval_days?: number;
    alert_before_days?: number;
}) {
    const currentKm = Number(s.current_odometer_km) || 0;
    const lastKm = Number(s.last_service_km) || 0;
    const nextDueKm = Number(s.next_due_km) || 0;
    const intervalKm = Number(s.interval_km) || 0;
    const alertBeforeKm = Number(s.alert_before_km) || 1000;
    const intervalDays = Number(s.interval_days) || 0;
    const alertBeforeDays = Number(s.alert_before_days) || 30;

    // 1. Distance calculations (if interval_km > 0)
    let kmRemaining: number | null = null;
    let kmProgress = 0;
    let kmOverdue = false;
    let kmDueSoon = false;

    if (intervalKm > 0) {
        kmRemaining = nextDueKm - currentKm;
        if (kmRemaining < 0) {
            kmOverdue = true;
        } else if (kmRemaining <= alertBeforeKm) {
            kmDueSoon = true;
        }
        const traveled = Math.max(0, currentKm - lastKm);
        kmProgress = Math.min(100, Math.max(0, Math.round((traveled / intervalKm) * 100)));
    }

    // 2. Date / Days calculations (if next_due_date is set)
    let daysRemaining: number | null = null;
    let daysProgress = 0;
    let dateOverdue = false;
    let dateDueSoon = false;

    if (s.next_due_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(s.next_due_date);
        due.setHours(0, 0, 0, 0);
        const diffMs = due.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
            dateOverdue = true;
        } else if (daysRemaining <= alertBeforeDays) {
            dateDueSoon = true;
        }

        if (intervalDays > 0 && s.last_service_date) {
            const lastDate = new Date(s.last_service_date);
            lastDate.setHours(0, 0, 0, 0);
            const elapsedDays = Math.max(0, Math.ceil((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
            daysProgress = Math.min(100, Math.max(0, Math.round((elapsedDays / intervalDays) * 100)));
        } else if (daysRemaining !== null) {
            if (daysRemaining <= 0) daysProgress = 100;
            else if (daysRemaining <= alertBeforeDays) {
                daysProgress = Math.round(((alertBeforeDays - daysRemaining) / alertBeforeDays) * 100);
            }
        }
    }

    // 3. Combined status & progress
    let status: 'ok' | 'due_soon' | 'overdue' = 'ok';
    if (kmOverdue || dateOverdue) {
        status = 'overdue';
    } else if (kmDueSoon || dateDueSoon) {
        status = 'due_soon';
    }

    const progressPercent = Math.max(kmProgress, daysProgress);

    return {
        km_remaining: kmRemaining !== null ? kmRemaining : undefined,
        days_remaining: daysRemaining !== null ? daysRemaining : undefined,
        progress_percent: progressPercent,
        status
    };
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
        let mandatoryCount = 0;

        for (const s of services) {
            const calculated = computeServiceStatus(s);
            if (s.is_mandatory || s.service_type === 'technical_inspection') {
                mandatoryCount++;
            }
            if (calculated.status === 'overdue') {
                overdueCount++;
            } else if (calculated.status === 'due_soon') {
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
            mandatory_count: mandatoryCount,
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
        const categoryFilter = req.query.category ? String(req.query.category) : null; // 'all' | 'mandatory' | 'mechanical'

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
            ORDER BY 
                s.is_mandatory DESC,
                CASE WHEN s.next_due_date IS NOT NULL THEN s.next_due_date ELSE '9999-12-31' END ASC,
                (s.next_due_km - COALESCE(d.odometer_km, 0)) ASC
        `;

        const result = await query(sql, params);
        const rows = (result.rows as any[]) || [];

        const enriched = rows.map(r => {
            const calculated = computeServiceStatus(r);
            return {
                ...r,
                is_mandatory: Boolean(r.is_mandatory),
                km_remaining: calculated.km_remaining,
                days_remaining: calculated.days_remaining,
                progress_percent: calculated.progress_percent,
                status: calculated.status
            };
        });

        let filtered = enriched;
        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter(item => item.status === statusFilter);
        }
        if (categoryFilter === 'mandatory') {
            filtered = filtered.filter(item => item.is_mandatory || item.service_type === 'technical_inspection');
        } else if (categoryFilter === 'mechanical') {
            filtered = filtered.filter(item => !item.is_mandatory && item.service_type !== 'technical_inspection');
        }

        return res.json(filtered);
    } catch (err: any) {
        console.error('[Maintenance API] Error in /services:', err);
        return res.status(500).json({ error: 'Failed to fetch maintenance services' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/maintenance/services
// Create a new scheduled maintenance service (km-based or date-based or dual)
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
            interval_days,
            last_service_km,
            last_service_date,
            next_due_date,
            alert_before_km,
            alert_before_days,
            is_mandatory,
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

        const intervalKm = Math.max(0, Number(interval_km) || 0);
        const intervalDays = Math.max(0, Number(interval_days) || 0);
        const lastKm = Number(last_service_km) >= 0 ? Number(last_service_km) : (Number(dev.odometer_km) || 0);
        const nextDueKm = intervalKm > 0 ? (lastKm + intervalKm) : lastKm;
        const alertBeforeKm = Math.max(100, Number(alert_before_km) || 1000);
        const alertBeforeDays = Math.max(1, Number(alert_before_days) || 30);
        const isMandatory = Boolean(is_mandatory || service_type === 'technical_inspection');
        const serviceType = service_type || 'custom';
        const initialCost = Number(cost_mad) || 0;
        const lastDate = last_service_date || new Date().toISOString().split('T')[0];

        // Compute next_due_date if not explicitly given and interval_days > 0
        let dueDate = next_due_date || null;
        if (!dueDate && intervalDays > 0) {
            const baseDate = new Date(lastDate);
            baseDate.setDate(baseDate.getDate() + intervalDays);
            dueDate = baseDate.toISOString().split('T')[0];
        }

        const insertSql = `
            INSERT INTO maintenance_services (
                tenant_id, device_id, service_type, title,
                interval_km, interval_days, last_service_km, last_service_date,
                next_due_km, next_due_date, alert_before_km, alert_before_days,
                is_mandatory, cost_mad, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertRes = await query(insertSql, [
            tenantId,
            device_id,
            serviceType,
            String(title).trim(),
            intervalKm,
            intervalDays,
            lastKm,
            lastDate,
            nextDueKm,
            dueDate,
            alertBeforeKm,
            alertBeforeDays,
            isMandatory ? 1 : 0,
            initialCost,
            notes || null
        ]);

        return res.status(201).json({
            message: 'Service schedule created successfully',
            id: insertRes.insertId,
            next_due_km: nextDueKm,
            next_due_date: dueDate
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
            interval_days,
            last_service_km,
            last_service_date,
            next_due_date,
            alert_before_km,
            alert_before_days,
            is_mandatory,
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

        const newIntervalKm = interval_km !== undefined ? Math.max(0, Number(interval_km)) : existing.interval_km;
        const newIntervalDays = interval_days !== undefined ? Math.max(0, Number(interval_days)) : (existing.interval_days || 0);
        const newLastKm = last_service_km !== undefined ? Math.max(0, Number(last_service_km)) : existing.last_service_km;
        const newNextDueKm = newIntervalKm > 0 ? (newLastKm + newIntervalKm) : newLastKm;
        const newAlertBeforeKm = alert_before_km !== undefined ? Math.max(100, Number(alert_before_km)) : existing.alert_before_km;
        const newAlertBeforeDays = alert_before_days !== undefined ? Math.max(1, Number(alert_before_days)) : (existing.alert_before_days || 30);
        const newIsMandatory = is_mandatory !== undefined ? Boolean(is_mandatory) : Boolean(existing.is_mandatory);

        let newNextDueDate = next_due_date !== undefined ? next_due_date : existing.next_due_date;
        if (!newNextDueDate && newIntervalDays > 0) {
            const baseDate = new Date(last_service_date || existing.last_service_date || new Date());
            baseDate.setDate(baseDate.getDate() + newIntervalDays);
            newNextDueDate = baseDate.toISOString().split('T')[0];
        }

        const updateSql = `
            UPDATE maintenance_services SET
                title = COALESCE(?, title),
                service_type = COALESCE(?, service_type),
                interval_km = ?,
                interval_days = ?,
                last_service_km = ?,
                last_service_date = ?,
                next_due_km = ?,
                next_due_date = ?,
                alert_before_km = ?,
                alert_before_days = ?,
                is_mandatory = ?,
                cost_mad = COALESCE(?, cost_mad),
                notes = ?
            WHERE id = ?
        `;

        await query(updateSql, [
            title ? String(title).trim() : null,
            service_type || null,
            newIntervalKm,
            newIntervalDays,
            newLastKm,
            last_service_date || existing.last_service_date,
            newNextDueKm,
            newNextDueDate || null,
            newAlertBeforeKm,
            newAlertBeforeDays,
            newIsMandatory ? 1 : 0,
            cost_mad !== undefined ? Number(cost_mad) : null,
            notes !== undefined ? notes : existing.notes,
            id
        ]);

        return res.json({
            message: 'Service schedule updated successfully',
            next_due_km: newNextDueKm,
            next_due_date: newNextDueDate
        });
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
// Complete an intervention (log it and roll over next service interval km / date)
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
            next_interval_km,
            next_interval_days
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

        const intervalKm = next_interval_km !== undefined ? Number(next_interval_km) : service.interval_km;
        const intervalDays = next_interval_days !== undefined ? Number(next_interval_days) : (service.interval_days || 0);

        const nextDueKm = intervalKm > 0 ? (actualKm + intervalKm) : actualKm;

        let nextDueDate: string | null = null;
        if (intervalDays > 0) {
            const nextDateObj = new Date(actualDate);
            nextDateObj.setDate(nextDateObj.getDate() + intervalDays);
            nextDueDate = nextDateObj.toISOString().split('T')[0];
        }

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
                interval_days = ?,
                last_service_km = ?,
                last_service_date = ?,
                next_due_km = ?,
                next_due_date = ?,
                cost_mad = ?
            WHERE id = ?
        `;
        await query(updateServiceSql, [
            intervalKm,
            intervalDays,
            actualKm,
            actualDate,
            nextDueKm,
            nextDueDate,
            actualCost,
            service.id
        ]);

        // 3. Update device odometer if the service km is higher than current recorded odometer
        if (actualKm > 0) {
            await query(
                'UPDATE devices SET odometer_km = GREATEST(COALESCE(odometer_km, 0), ?) WHERE device_id = ?',
                [actualKm, service.device_id]
            );
        }

        return res.json({
            message: 'Intervention enregistrée avec succès',
            next_due_km: nextDueKm,
            next_due_date: nextDueDate,
            service_km: actualKm,
            service_date: actualDate
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
            LIMIT 200
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
// Includes the mandatory annual technical inspection (Visite Technique Annuelle)
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

        // Standard Fleet Package presets (including the annual mandatory technical inspection)
        const presets = [
            {
                type: 'technical_inspection',
                title: 'Visite Technique Annuelle Obligatoire (Centre Agréé)',
                interval_km: 0,
                interval_days: 365,
                alert_km: 0,
                alert_days: 30,
                is_mandatory: true,
                cost_mad: 350,
                notes: 'Obligatoire chaque année selon la réglementation des transports pour éviter amendes, fourrière et nullité d\'assurance.'
            },
            {
                type: 'oil_change',
                title: 'Vidange Huile Moteur (10W40 / 5W30)',
                interval_km: 10000,
                interval_days: 0,
                alert_km: 1000,
                alert_days: 30,
                is_mandatory: false,
                cost_mad: 450,
                notes: null
            },
            {
                type: 'oil_filter',
                title: 'Filtre à Huile',
                interval_km: 10000,
                interval_days: 0,
                alert_km: 1000,
                alert_days: 30,
                is_mandatory: false,
                cost_mad: 90,
                notes: null
            },
            {
                type: 'fuel_filter',
                title: 'Filtre à Carburant (Gasoil / Essence)',
                interval_km: 20000,
                interval_days: 0,
                alert_km: 2000,
                alert_days: 30,
                is_mandatory: false,
                cost_mad: 180,
                notes: null
            },
            {
                type: 'air_filter',
                title: 'Filtre à Air & Habitacle',
                interval_km: 20000,
                interval_days: 0,
                alert_km: 2000,
                alert_days: 30,
                is_mandatory: false,
                cost_mad: 150,
                notes: null
            },
            {
                type: 'brake_pads',
                title: 'Plaquettes de Frein Avant / Arrière',
                interval_km: 30000,
                interval_days: 0,
                alert_km: 3000,
                alert_days: 30,
                is_mandatory: false,
                cost_mad: 400,
                notes: null
            },
            {
                type: 'tires',
                title: 'Rotation & Contrôle Pneumatiques',
                interval_km: 40000,
                interval_days: 0,
                alert_km: 4000,
                alert_days: 30,
                is_mandatory: false,
                cost_mad: 0,
                notes: null
            },
            {
                type: 'timing_belt',
                title: 'Courroie de Distribution & Pompe à Eau',
                interval_km: 80000,
                interval_days: 0,
                alert_km: 5000,
                alert_days: 30,
                is_mandatory: false,
                cost_mad: 1800,
                notes: null
            },
        ];

        let createdCount = 0;
        for (const p of presets) {
            // Check if service already exists
            const existingCheck = await query(
                'SELECT id FROM maintenance_services WHERE device_id = ? AND service_type = ?',
                [deviceId, p.type]
            );
            if ((existingCheck.rows as any[]).length === 0) {
                const nextDueKm = p.interval_km > 0 ? (baseKm + p.interval_km) : baseKm;
                const nextDueDateSql = p.interval_days > 0
                    ? 'DATE_ADD(CURDATE(), INTERVAL ? DAY)'
                    : 'NULL';

                await query(
                    `INSERT INTO maintenance_services (
                        tenant_id, device_id, service_type, title,
                        interval_km, interval_days, last_service_km, last_service_date,
                        next_due_km, next_due_date, alert_before_km, alert_before_days,
                        is_mandatory, cost_mad, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ${nextDueDateSql}, ?, ?, ?, ?, ?)`,
                    p.interval_days > 0
                        ? [
                            tenantId,
                            deviceId,
                            p.type,
                            p.title,
                            p.interval_km,
                            p.interval_days,
                            baseKm,
                            nextDueKm,
                            p.interval_days,
                            p.alert_km,
                            p.alert_days,
                            p.is_mandatory ? 1 : 0,
                            p.cost_mad,
                            p.notes
                        ]
                        : [
                            tenantId,
                            deviceId,
                            p.type,
                            p.title,
                            p.interval_km,
                            p.interval_days,
                            baseKm,
                            nextDueKm,
                            p.alert_km,
                            p.alert_days,
                            p.is_mandatory ? 1 : 0,
                            p.cost_mad,
                            p.notes
                        ]
                );
                createdCount++;
            }
        }

        return res.json({
            message: `${createdCount} rappels d'entretien et obligations réglementaires initialisés avec succès`,
            base_km: baseKm,
            created_count: createdCount
        });
    } catch (err: any) {
        console.error('[Maintenance API] Error in batch-init:', err);
        return res.status(500).json({ error: 'Failed to initialize maintenance presets' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. PUT /api/maintenance/odometer/:deviceId
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
