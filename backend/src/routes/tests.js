import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/tests
router.get('/', async (req, res) => {
    try {
        const { rows: tests } = await pool.query(
            'SELECT * FROM tests WHERE is_active=true ORDER BY category, name'
        );
        const { rows: components } = await pool.query(
            'SELECT * FROM test_components ORDER BY test_id, sort_order'
        );
        const testsWithComponents = tests.map(t => ({
            ...t,
            components: components.filter(c => c.test_id === t.id)
        }));
        res.json(testsWithComponents);
    } catch (err) {
        console.error('Tests list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/tests/:id
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid test ID' });
        const { rows: [test] } = await pool.query('SELECT * FROM tests WHERE id=$1', [id]);
        if (!test) return res.status(404).json({ error: 'Test not found' });
        const { rows: components } = await pool.query(
            'SELECT * FROM test_components WHERE test_id=$1 ORDER BY sort_order',
            [id]
        );
        res.json({ ...test, components });
    } catch (err) {
        console.error('Test detail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/tests (Admin)
router.post('/', requireRole('admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, category, price, turnaround_hours, description, type, components = [] } = req.body;
        if (!name) return res.status(400).json({ error: 'Test name required' });

        await client.query('BEGIN');
        const { rows: [test] } = await client.query(
            'INSERT INTO tests (name, category, price, turnaround_hours, description, type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [name, category, price || 0, turnaround_hours || 24, description, type || 'Individual']
        );

        for (let i = 0; i < components.length; i++) {
            const c = components[i];
            await client.query(
                `INSERT INTO test_components (test_id, component_name, unit, normal_min, normal_max, normal_text, sort_order, result_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [test.id, c.component_name, c.unit || null, c.normal_min || null, c.normal_max || null, c.normal_text || null, i, c.result_type || 'numeric']
            );
        }
        await client.query('COMMIT');

        const { rows: comps } = await pool.query('SELECT * FROM test_components WHERE test_id=$1 ORDER BY sort_order', [test.id]);
        res.status(201).json({ ...test, components: comps });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Test create error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// PUT /api/tests/:id (Admin)
router.put('/:id', requireRole('admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, category, price, turnaround_hours, description, type, components = [] } = req.body;
        await client.query('BEGIN');
        const { rows: [test] } = await client.query(
            `UPDATE tests SET name=$1, category=$2, price=$3, turnaround_hours=$4, description=$5, type=$6
       WHERE id=$7 RETURNING *`,
            [name, category, price, turnaround_hours, description, type || 'Individual', req.params.id]
        );
        if (!test) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Test not found' }); }

        // Update components: keep existing ones (may be referenced by test_results), upsert new ones
        const { rows: existingComps } = await client.query(
            'SELECT id FROM test_components WHERE test_id=$1 ORDER BY sort_order', [req.params.id]
        );
        const incomingIds = components.filter(c => c.id).map(c => c.id);
        // Delete only components that are NOT in the incoming list AND not referenced by test_results
        for (const ec of existingComps) {
            if (!incomingIds.includes(ec.id)) {
                const { rows: refs } = await client.query(
                    'SELECT 1 FROM test_results WHERE component_id=$1 LIMIT 1', [ec.id]
                );
                if (refs.length === 0) {
                    await client.query('DELETE FROM test_components WHERE id=$1', [ec.id]);
                }
                // If referenced, leave it (orphaned but safe) — it won't break FK
            }
        }
        for (let i = 0; i < components.length; i++) {
            const c = components[i];
            if (c.id) {
                // Update existing component in-place
                await client.query(
                    `UPDATE test_components SET component_name=$1, unit=$2, normal_min=$3, normal_max=$4, normal_text=$5, sort_order=$6, result_type=$7
                     WHERE id=$8`,
                    [c.component_name, c.unit || null, c.normal_min || null, c.normal_max || null, c.normal_text || null, i, c.result_type || 'numeric', c.id]
                );
            } else {
                // Insert new component
                await client.query(
                    `INSERT INTO test_components (test_id, component_name, unit, normal_min, normal_max, normal_text, sort_order, result_type)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                    [test.id, c.component_name, c.unit || null, c.normal_min || null, c.normal_max || null, c.normal_text || null, i, c.result_type || 'numeric']
                );
            }
        }
        await client.query('COMMIT');
        const { rows: comps } = await pool.query('SELECT * FROM test_components WHERE test_id=$1 ORDER BY sort_order', [req.params.id]);
        res.json({ ...test, components: comps });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Test update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// DELETE /api/tests/:id (Admin - soft delete)
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        await pool.query('UPDATE tests SET is_active=false WHERE id=$1', [req.params.id]);
        res.json({ message: 'Test deactivated' });
    } catch (err) {
        console.error('Test delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
