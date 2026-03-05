import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);
router.use(requireRole('admin'));

const VALID_CATEGORIES = ['Supplies', 'Equipment', 'Utilities', 'Rent', 'Salaries', 'Maintenance', 'Other'];

// POST /api/expenses — log a new expense
router.post('/', async (req, res) => {
    try {
        const { date, category, item_description, amount, note } = req.body;

        if (!category || !VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` });
        }
        if (!item_description || !item_description.trim()) {
            return res.status(400).json({ error: 'Item description is required' });
        }
        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        const { rows: [expense] } = await pool.query(
            `INSERT INTO expenses (date, category, item_description, amount, note, logged_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [date || new Date(), category, item_description.trim(), parseFloat(amount), note || null, req.user.id]
        );

        res.status(201).json(expense);
    } catch (err) {
        console.error('Expenses error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/expenses — list expenses with optional filters
router.get('/', async (req, res) => {
    try {
        const { from, to, category, limit = 100, offset = 0 } = req.query;
        let conditions = [];
        let params = [];
        let i = 1;

        if (from) { conditions.push(`e.date >= $${i++}`); params.push(from); }
        if (to) { conditions.push(`e.date <= $${i++}`); params.push(to); }
        if (category && VALID_CATEGORIES.includes(category)) {
            conditions.push(`e.category = $${i++}`); params.push(category);
        }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

        const { rows } = await pool.query(
            `SELECT e.*, u.name as logged_by_name
             FROM expenses e
             LEFT JOIN users u ON e.logged_by = u.id
             ${where}
             ORDER BY e.date DESC, e.created_at DESC
             LIMIT $${i} OFFSET $${i + 1}`,
            [...params, limit, offset]
        );

        const countResult = await pool.query(`SELECT COUNT(*) FROM expenses e ${where}`, params);
        res.json({ expenses: rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('Expenses error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
