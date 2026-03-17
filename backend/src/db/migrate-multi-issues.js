import pool from './pool.js';

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Issue 1: Add result_type column to test_components (default 'numeric')
        await client.query(`
            ALTER TABLE test_components
            ADD COLUMN IF NOT EXISTS result_type VARCHAR(10) DEFAULT 'numeric'
        `);

        // Issue 2a: Add age column to patients
        await client.query(`
            ALTER TABLE patients
            ADD COLUMN IF NOT EXISTS age INTEGER
        `);

        // Issue 2c: Add guardian_name column to patients
        await client.query(`
            ALTER TABLE patients
            ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(150)
        `);

        // Issue 4: Add discount_percentage column to invoices
        await client.query(`
            ALTER TABLE invoices
            ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0
        `);

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
