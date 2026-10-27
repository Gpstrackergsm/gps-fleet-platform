import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create the connection pool
const dbConfig = process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gps_platform',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
};

export const pool = mysql.createPool(dbConfig as any);

// Helper to run queries. Adjusts for MySQL return type [rows, fields]
export const query = async (text: string, params?: any[]) => {
    // Convert Postgres $1, $2 syntax to MySQL ? syntax if needed, 
    // but better to just use ? in code. 
    // For now we assume calls are updated to use ?
    const [rows, fields] = await pool.query(text, params);
    return { rows, fields, insertId: (rows as any).insertId };
};

export const transaction = async <T>(callback: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

export const connectDB = async () => {
    let retries = 15;
    while (retries > 0) {
        try {
            const connection = await pool.getConnection();
            console.log('[DB] Connected to MySQL successfully');
            await initTables();
            connection.release();
            return;
        } catch (err: any) {
            console.error(`[DB] Connection attempt failed: ${err.message}. Retrying in 5s... (${retries} retries left)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    console.error('[DB] Could not connect to MySQL after multiple attempts. Server running in degraded mode.');
};

const initTables = async () => {
    const createDevicesTable = `
        CREATE TABLE IF NOT EXISTS devices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            device_id VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100),
            status VARCHAR(20) DEFAULT 'offline',
            current_state VARCHAR(20) DEFAULT 'parked',
            state_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_alarm VARCHAR(50),
            last_seen TIMESTAMP,
            internet_status BOOLEAN DEFAULT FALSE,
            gps_status BOOLEAN DEFAULT FALSE,
            tenant_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createPositionsTable = `
        CREATE TABLE IF NOT EXISTS positions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            device_id VARCHAR(50),
            lat DOUBLE NOT NULL,
            lng DOUBLE NOT NULL,
            speed DOUBLE DEFAULT 0,
            course DOUBLE DEFAULT 0,
            alarm VARCHAR(50),
            acc_status BOOLEAN DEFAULT FALSE,
            internet_status BOOLEAN DEFAULT FALSE,
            gps_status BOOLEAN DEFAULT FALSE,
            door_status BOOLEAN DEFAULT FALSE,
            battery_level INT DEFAULT 100,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        );
    `;

    const createRawLogsTable = `
        CREATE TABLE IF NOT EXISTS raw_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            device_id VARCHAR(50), 
            payload TEXT NOT NULL,
            received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createTenantsTable = `
        CREATE TABLE IF NOT EXISTS tenants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user',
            phone VARCHAR(20),
            tenant_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        );
    `;

    const createGeofencesTable = `
        CREATE TABLE IF NOT EXISTS geofences (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            description VARCHAR(255),
            type VARCHAR(20) DEFAULT 'circle',
            center_lat DOUBLE,
            center_lng DOUBLE,
            radius_meters DOUBLE DEFAULT 500,
            polygon_coordinates JSON,
            speed_limit DOUBLE DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );
    `;

    const createAlertRulesTable = `
        CREATE TABLE IF NOT EXISTS alert_rules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            type VARCHAR(50) NOT NULL,
            device_id VARCHAR(50),
            geofence_id INT,
            threshold_value DOUBLE DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );
    `;

    const createAlertsTable = `
        CREATE TABLE IF NOT EXISTS alerts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id INT NOT NULL,
            device_id VARCHAR(50) NOT NULL,
            rule_id INT,
            type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) DEFAULT 'medium',
            message TEXT NOT NULL,
            lat DOUBLE,
            lng DOUBLE,
            speed DOUBLE DEFAULT 0,
            status VARCHAR(20) DEFAULT 'unacknowledged',
            acknowledged_by INT,
            acknowledged_at TIMESTAMP NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
        );
    `;

    try {
        await query(createDevicesTable);
        await query(createPositionsTable);
        await query(createRawLogsTable);
        await query(createTenantsTable);
        await query(createUsersTable);
        await query(createGeofencesTable);
        await query(createAlertRulesTable);
        await query(createAlertsTable);

        // Manual Migration for existing tables (Blind ALTERs)
        try { await query("ALTER TABLE positions ADD COLUMN internet_status BOOLEAN DEFAULT FALSE"); } catch { }
        try { await query("ALTER TABLE positions ADD COLUMN gps_status BOOLEAN DEFAULT FALSE"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN internet_status BOOLEAN DEFAULT FALSE"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN gps_status BOOLEAN DEFAULT FALSE"); } catch { }
        try { await query("ALTER TABLE positions ADD COLUMN course DOUBLE DEFAULT 0"); } catch { }
        try { await query("ALTER TABLE positions ADD COLUMN alarm VARCHAR(50)"); } catch { }
        try { await query("ALTER TABLE positions ADD COLUMN acc_status BOOLEAN DEFAULT FALSE"); } catch { }
        try { await query("ALTER TABLE positions ADD COLUMN door_status BOOLEAN DEFAULT FALSE"); } catch { }
        try { await query("ALTER TABLE positions ADD COLUMN battery_level INT DEFAULT 100"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN last_alarm VARCHAR(50)"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN current_state VARCHAR(20) DEFAULT 'parked'"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN state_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN tenant_id INT"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN sim_phone VARCHAR(30)"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN plate_number VARCHAR(50)"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN model VARCHAR(100)"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN vehicle_type VARCHAR(50) DEFAULT 'car'"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN driver_name VARCHAR(100)"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN driver_phone VARCHAR(30)"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN notes TEXT"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN battery_level INT DEFAULT 100"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN acc_status BOOLEAN DEFAULT FALSE"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN satellites INT DEFAULT NULL"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN gsm_signal INT DEFAULT NULL"); } catch { }
        try { await query("ALTER TABLE devices ADD COLUMN fuel_percent DOUBLE DEFAULT NULL"); } catch { }
        try { await query("ALTER TABLE positions ADD COLUMN satellites INT DEFAULT NULL"); } catch { }
        try { await query("ALTER TABLE positions ADD COLUMN gsm_signal INT DEFAULT NULL"); } catch { }
        try { await query("ALTER TABLE positions ADD COLUMN fuel_percent DOUBLE DEFAULT NULL"); } catch { }
        try { await query("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"); } catch { }

        // High-Performance Composite Indexes
        try { await query("CREATE INDEX idx_positions_device_time ON positions(device_id, timestamp DESC)"); } catch { }
        try { await query("CREATE INDEX idx_devices_tenant_status ON devices(tenant_id, status)"); } catch { }
        try { await query("CREATE INDEX idx_alerts_tenant_time ON alerts(tenant_id, timestamp DESC)"); } catch { }
        try { await query("CREATE INDEX idx_alerts_status ON alerts(status)"); } catch { }
        try { await query("CREATE INDEX idx_geofences_tenant ON geofences(tenant_id, is_active)"); } catch { }

        // Seed Default Tenant & Admin User if not exists
        try {
            const tenantCheck = await query("SELECT id FROM tenants WHERE id = 1");
            if ((tenantCheck.rows as any[]).length === 0) {
                await query("INSERT INTO tenants (id, name) VALUES (1, 'Global Admin Fleet')");
            }

            const adminCheck = await query("SELECT id FROM users WHERE email = 'gsmkhalid@msn.com'");
            if ((adminCheck.rows as any[]).length === 0) {
                const bcrypt = await import('bcryptjs');
                const hash = await bcrypt.hash('admin123', 10);
                await query(
                    "INSERT INTO users (email, password_hash, role, tenant_id) VALUES (?, ?, 'admin', 1)",
                    ['gsmkhalid@msn.com', hash]
                );
                console.log('[DB] Seeded initial Admin user: gsmkhalid@msn.com / admin123');
            }

            // Seed user's real TK103 device
            const deviceCheck = await query("SELECT id FROM devices WHERE device_id = '869706063068466'");
            if ((deviceCheck.rows as any[]).length === 0) {
                await query(
                    "INSERT INTO devices (device_id, name, status, tenant_id, plate_number, model) VALUES ('869706063068466', 'Mercedes Sprinter', 'online', 1, '12345-A-26', 'TK103B')"
                );
                console.log('[DB] Seeded physical device 869706063068466');
            }
        } catch (seedErr) {
            console.error('[DB] Error seeding initial records:', seedErr);
        }

        console.log('[DB] Enterprise tables and performance indexes initialized (MySQL)');
    } catch (err) {
        console.error('[DB] Error initializing tables', err);
    }
};
