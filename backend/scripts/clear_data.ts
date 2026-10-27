import { pool } from '../src/db';

const clearData = async () => {
    console.log('🗑️  Clearing all GPS data...');
    try {
        await pool.execute('TRUNCATE TABLE positions');
        await pool.execute('TRUNCATE TABLE raw_logs');
        await pool.execute("UPDATE devices SET current_state='offline', status='offline', last_seen=NULL, state_start_time=NULL, internet_status=0, gps_status=0");
        console.log('✅ Data cleared successfully.');
    } catch (err) {
        console.error('❌ Error clearing data:', err);
    } finally {
        process.exit(0);
    }
};

clearData();
