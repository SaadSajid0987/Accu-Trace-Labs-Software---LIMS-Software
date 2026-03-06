import pool from './pool.js';

async function migrate() {
    try {
        console.log('Altering default type to Individual...');
        await pool.query(`ALTER TABLE tests ALTER COLUMN type SET DEFAULT 'Individual';`);
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
