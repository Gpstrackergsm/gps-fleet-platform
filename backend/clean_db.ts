
import { pool } from './src/db';

const cleanDB = async () => {
    try {
        console.log("Cleaning DB for test device...");
        const imei = '359586018966098';
        await pool.execute('DELETE FROM positions WHERE device_id = ?', [imei]);
        await pool.execute('DELETE FROM raw_logs'); // Optional
        await pool.execute('UPDATE devices SET current_state="offline", last_seen=NULL, state_start_time=NULL WHERE device_id = ?', [imei]);
        console.log("DB Cleaned.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

cleanDB();
