import pool from './src/db/pool.js';

async function migrate() {
    try {
        await pool.query("ALTER TABLE samples ADD COLUMN IF NOT EXISTS remarks TEXT;");
        console.log('Successfully added remarks column');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
migrate();
