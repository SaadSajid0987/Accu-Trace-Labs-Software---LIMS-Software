import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { logAudit } from './audit.js';

const router = express.Router();
router.use(verifyToken);

// ── Helper: sanitize and cap pagination params ──
function sanitizePagination(query) {
    const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 100);
    const offset = Math.max(parseInt(query.offset) || 0, 0);
    return { limit, offset };
}

// GET /api/patients?search=...
router.get('/', requireRole('admin', 'pathologist'), async (req, res) => {
    try {
        const { search = '' } = req.query;
        const { limit, offset } = sanitizePagination(req.query);
        let query, params;
        if (search) {
            query = `SELECT * FROM patients WHERE 
        name ILIKE $1 OR patient_id ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
        ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
            params = [`%${search}%`, limit, offset];
        } else {
            query = 'SELECT * FROM patients ORDER BY created_at DESC LIMIT $1 OFFSET $2';
            params = [limit, offset];
        }
        const { rows } = await pool.query(query, params);
        const count = await pool.query(
            search ? `SELECT COUNT(*) FROM patients WHERE name ILIKE $1 OR patient_id ILIKE $1` : 'SELECT COUNT(*) FROM patients',
            search ? [`%${search}%`] : []
        );
        res.json({ patients: rows, total: parseInt(count.rows[0].count) });
    } catch (err) {
        console.error('Patients list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/patients
router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const { name, dob, gender, phone, email, address, blood_group, cnic, referring_doctor } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Patient name is required' });
        const { rows } = await pool.query(
            `INSERT INTO patients (name, dob, gender, phone, email, address, blood_group, cnic, referring_doctor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [name.trim(), dob || null, gender || null, phone || null, email || null, address || null, blood_group || null, cnic || null, referring_doctor || null]
        );
        await logAudit('patients', rows[0].id, null, null, rows[0].patient_id, 'INSERT', req.user.id);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Patient create error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/patients/:id
router.get('/:id', requireRole('admin', 'pathologist'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid patient ID' });

        const { rows: [patient] } = await pool.query('SELECT * FROM patients WHERE id=$1', [id]);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        // visit history
        const { rows: samples } = await pool.query(
            `SELECT s.*, u.name as ordered_by_name,
        array_agg(t.name) as tests
       FROM samples s
       LEFT JOIN users u ON s.ordered_by = u.id
       LEFT JOIN sample_tests st ON s.id = st.sample_id
       LEFT JOIN tests t ON st.test_id = t.id
       WHERE s.patient_id = $1
       GROUP BY s.id, u.name
       ORDER BY s.created_at DESC`,
            [patient.id]
        );
        res.json({ patient, samples });
    } catch (err) {
        console.error('Patient detail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/patients/:id
router.put('/:id', requireRole('admin'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid patient ID' });

        const { name, dob, gender, phone, email, address, blood_group, cnic, referring_doctor } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Patient name is required' });

        const { rows } = await pool.query(
            `UPDATE patients SET name=$1, dob=$2, gender=$3, phone=$4, email=$5,
       address=$6, blood_group=$7, cnic=$8, referring_doctor=$9, updated_at=NOW() WHERE id=$10 RETURNING *`,
            [name.trim(), dob || null, gender, phone, email, address, blood_group, cnic || null, referring_doctor || null, id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Patient not found' });
        await logAudit('patients', id, null, null, JSON.stringify(req.body), 'UPDATE', req.user.id);
        res.json(rows[0]);
    } catch (err) {
        console.error('Patient update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/patients/:id/timeline
router.get('/:id/timeline', requireRole('admin', 'pathologist', 'technician'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid patient ID' });

        // Ensure patient exists
        const { rows: [patient] } = await pool.query('SELECT name FROM patients WHERE id=$1', [id]);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        // 1. Fetch all samples for this patient, structured for the timeline
        const { rows: timeline } = await pool.query(
            `SELECT
                s.id as sample_internal_id, 
                s.sample_id,
                s.status as sample_status,
                s.created_at as visit_date,
                s.is_verified,
                v.name as verified_by_name,
                i.payment_status,
                i.net_payable as invoice_amount,
                COALESCE(
                    (SELECT array_agg(t.name) FROM sample_tests st JOIN tests t ON st.test_id = t.id WHERE st.sample_id = s.id),
                    '{}'
                ) as tests_ordered,
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'component', tc.component_name,
                        'value', tr.value,
                        'is_abnormal', tr.is_abnormal,
                        'unit', tc.unit
                    )) FROM sample_tests st
                       JOIN test_components tc ON st.test_id = tc.test_id
                       JOIN test_results tr ON tr.sample_test_id = st.id AND tr.component_id = tc.id 
                     WHERE st.sample_id = s.id AND tr.value IS NOT NULL AND tr.value != ''),
                    '[]'
                ) as results
             FROM samples s
             LEFT JOIN invoices i ON s.id = i.sample_id
             LEFT JOIN users v ON s.verified_by = v.id
             WHERE s.patient_id = $1
             ORDER BY s.created_at DESC`,
            [id]
        );

        // 2. Calculate summary statistics
        const totalVisits = timeline.length;
        // Map top tests
        const testCounts = {};
        let totalSpent = 0;
        let mostOrdered = null;

        timeline.forEach(visit => {
            if (visit.payment_status === 'Paid' || visit.payment_status === 'Partial') {
                totalSpent += parseFloat(visit.invoice_amount || 0);
            }
            visit.tests_ordered.forEach(t => {
                testCounts[t] = (testCounts[t] || 0) + 1;
            });
        });

        if (Object.keys(testCounts).length > 0) {
            mostOrdered = Object.keys(testCounts).reduce((a, b) => testCounts[a] > testCounts[b] ? a : b);
        }

        const stats = {
            totalVisits,
            totalSpent,
            firstVisit: totalVisits > 0 ? timeline[timeline.length - 1].visit_date : null,
            mostRecentVisit: totalVisits > 0 ? timeline[0].visit_date : null,
            mostOrderedTest: mostOrdered
        };

        res.json({ stats, timeline });
    } catch (err) {
        console.error('Patient timeline error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
