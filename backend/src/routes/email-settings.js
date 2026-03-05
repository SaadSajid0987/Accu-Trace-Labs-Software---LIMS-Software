import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

// GET /api/email-settings
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM email_settings WHERE id = 1');
        if (rows.length === 0) {
            // First time init
            const { rows: inserted } = await pool.query(
                `INSERT INTO email_settings (recipient_email) VALUES ('admin@example.com') RETURNING *`
            );
            return res.json(inserted[0]);
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Email settings fetch error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/email-settings
router.put('/', async (req, res) => {
    try {
        const { recipient_email, daily_enabled, weekly_enabled } = req.body;
        const { rows: [updated] } = await pool.query(
            `UPDATE email_settings 
             SET recipient_email = $1, daily_enabled = $2, weekly_enabled = $3, updated_at = NOW() 
             WHERE id = 1 RETURNING *`,
            [recipient_email, daily_enabled, weekly_enabled]
        );
        res.json(updated);
    } catch (err) {
        console.error('Email settings update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

import { sendTestEmail } from '../services/emailService.js';

// POST /api/email-settings/test
router.post('/test', async (req, res) => {
    try {
        const { recipient_email } = req.body;
        if (!recipient_email) return res.status(400).json({ error: 'Email required' });

        const result = await sendTestEmail(recipient_email);
        res.json(result);
    } catch (err) {
        console.error('Test email error:', err);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});

export default router;
