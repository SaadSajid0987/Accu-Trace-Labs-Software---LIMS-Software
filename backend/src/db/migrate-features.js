import pool from './pool.js';

const sql = `
-- ============================================================
-- NOTIFICATIONS (Feature 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- e.g., 'AbnormalResult'
  message TEXT NOT NULL,
  reference_id VARCHAR(50),  -- e.g., sample ID
  reference_type VARCHAR(50),
  target_role VARCHAR(20) NOT NULL CHECK (target_role IN ('admin', 'pathologist')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMAIL SETTINGS (Feature 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_settings (
  id SERIAL PRIMARY KEY,
  recipient_email VARCHAR(150),
  daily_summary_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_role_read ON notifications(target_role, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
`;

async function runMigration() {
    console.log('Running feature database migrations...');
    try {
        const res = await pool.query(sql);
        console.log('Migration successful. Tables created if they did not exist.');

        // Check if email_settings has a baseline row
        const { rows } = await pool.query('SELECT COUNT(*) FROM email_settings');
        if (parseInt(rows[0].count) === 0) {
            await pool.query('INSERT INTO email_settings (recipient_email) VALUES ($1)', ['']);
            console.log('Inserted default empty row into email_settings.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
