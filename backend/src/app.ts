import express from 'express';
import cors from 'cors';
import authRoutes from './api/auth';
import deviceRoutes from './api/devices';
import adminRoutes from './api/admin';
import historyRoutes from './api/history';
import geofenceRoutes from './api/geofences';
import alertRoutes from './api/alerts';

import morgan from 'morgan';

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', historyRoutes); // Mount on devices path to extend it
app.use('/api/geofences', geofenceRoutes);
app.use('/api/alerts', alertRoutes);


// Health check
app.get('/', (req, res) => {
    res.send('GPS SaaS Platform API is running');
});

import { pool } from './db';
app.get('/add-test-device', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows]: any = await connection.query("SELECT * FROM devices WHERE device_id = '123456789012345'");
        if (rows.length === 0) {
            await connection.query("INSERT INTO devices (device_id, name, status, tenant_id) VALUES ('123456789012345', 'Test TK103', 'offline', 2)");
            res.json({ status: 'ok', message: 'Test device added' });
        } else {
            res.json({ status: 'ok', message: 'Device already exists' });
        }
        connection.release();
    } catch (err: any) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.get('/clear-test-history', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query("DELETE FROM positions WHERE device_id = '123456789012345'");
        res.json({ status: 'ok', message: 'History cleared for test device' });
        connection.release();
    } catch (err: any) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.get('/clear-all-data', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query("DELETE FROM positions");
        res.json({ status: 'ok', message: 'All position data cleared' });
        connection.release();
    } catch (err: any) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.get('/debug-devices', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows]: any = await connection.query("SELECT device_id, name, internet_status, gps_status FROM devices");
        res.json(rows);
        connection.release();
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default app;
