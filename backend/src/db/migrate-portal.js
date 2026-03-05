import pool from './pool.js';

const sql = `
CREATE TABLE IF NOT EXISTS patient_portal_links (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  link_type VARCHAR(10) NOT NULL CHECK (link_type IN ('Report', 'Invoice')),
  reference_id INTEGER NOT NULL,
  patient_name TEXT,
  patient_phone TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_token ON patient_portal_links(token);
`;

try {
    await pool.query(sql);
    console.log('SUCCESS: patient_portal_links table created');
} catch (err) {
    console.error('ERROR:', err.message);
} finally {
    await pool.end();
}
