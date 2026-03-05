import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/notifications
// Fetch recent notifications for the logged-in user's role
router.get('/', requireRole('admin', 'pathologist'), async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM notifications 
             WHERE target_role = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [req.user.role]
        );
        res.json(rows);
    } catch (err) {
        console.error('Notifications list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', requireRole('admin', 'pathologist'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID' });

        const { rows: [updated] } = await pool.query(
            `UPDATE notifications SET is_read = true, updated_at = NOW() 
             WHERE id = $1 AND target_role = $2 RETURNING *`,
            [id, req.user.role]
        );

        if (!updated) return res.status(404).json({ error: 'Notification not found' });
        res.json(updated);
    } catch (err) {
        console.error('Notification mark read error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/notifications/read-all
router.put('/read-all', requireRole('admin', 'pathologist'), async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET is_read = true, updated_at = NOW() 
             WHERE target_role = $1 AND is_read = false`,
            [req.user.role]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Notification mark all read error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
