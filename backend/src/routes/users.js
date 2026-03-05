import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { logAudit } from './audit.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/users
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users
router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields required' });
        }
        const hash = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role',
            [name, email.toLowerCase(), hash, role]
        );
        await logAudit('users', rows[0].id, null, null, rows[0].email, 'INSERT', req.user.id);
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        console.error('User create error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/users/:id
router.put('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });
        const { name, email, role, is_active, password } = req.body;

        let query, params;
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            query = 'UPDATE users SET name=$1, email=$2, role=$3, is_active=$4, password_hash=$5, updated_at=NOW() WHERE id=$6 RETURNING id,name,email,role,is_active';
            params = [name, email.toLowerCase(), role, is_active, hash, id];
        } else {
            query = 'UPDATE users SET name=$1, email=$2, role=$3, is_active=$4, updated_at=NOW() WHERE id=$5 RETURNING id,name,email,role,is_active';
            params = [name, email.toLowerCase(), role, is_active, id];
        }

        const { rows } = await pool.query(query, params);
        if (!rows[0]) return res.status(404).json({ error: 'User not found' });
        await logAudit('users', Number(id), null, null, JSON.stringify(req.body), 'UPDATE', req.user.id);
        res.json(rows[0]);
    } catch (err) {
        console.error('User update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/users/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await pool.query('DELETE FROM users WHERE id=$1', [id]);
        await logAudit('users', Number(id), null, null, 'deleted', 'DELETE', req.user.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('User delete error:', err);
        // If there is a foreign key constraint violation (e.g. user has samples), inform the user nicely
        if (err.code === '23503') return res.status(400).json({ error: 'Cannot delete this user because they have associated records in the system.' });
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
