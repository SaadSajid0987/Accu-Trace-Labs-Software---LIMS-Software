import pool from './src/db/pool.js';

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_log_archive (
                id SERIAL PRIMARY KEY,
                table_name VARCHAR(50) NOT NULL,
                record_id INTEGER,
                field_name VARCHAR(100),
                old_value TEXT,
                new_value TEXT,
                action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
                changed_by INTEGER REFERENCES users(id),
                changed_at TIMESTAMPTZ DEFAULT NOW(),
                ip_address VARCHAR(50),
                notes TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_audit_log_archive_table ON audit_log_archive(table_name, record_id);
            CREATE INDEX IF NOT EXISTS idx_audit_log_archive_changed_at ON audit_log_archive(changed_at DESC);
        `);
        console.log('Successfully created audit_log_archive table');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
migrate();
