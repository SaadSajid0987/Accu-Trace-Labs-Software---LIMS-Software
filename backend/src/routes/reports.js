import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/reports/:sampleId - structured data for PDF
router.get('/:sampleId', requireRole('admin', 'pathologist'), async (req, res) => {
    try {
        const sampleId = parseInt(req.params.sampleId);
        if (isNaN(sampleId)) return res.status(400).json({ error: 'Invalid sample ID' });

        const { rows: [sample] } = await pool.query(
            `SELECT s.*, 
        p.name as patient_name, p.patient_id as patient_ref, p.gender, p.dob, p.blood_group, p.phone, p.cnic, p.referring_doctor, p.age, p.guardian_name,
        u.name as ordered_by_name,
        v.name as verified_by_name, v.email as verified_by_email
       FROM samples s
       LEFT JOIN patients p ON s.patient_id = p.id
       LEFT JOIN users u ON s.ordered_by = u.id
       LEFT JOIN users v ON s.verified_by = v.id
       WHERE s.id=$1`,
            [sampleId]
        );
        if (!sample) return res.status(404).json({ error: 'Sample not found' });

        const { rows: sampleTests } = await pool.query(
            `SELECT st.id as sample_test_id, t.id as test_id, t.name as test_name, t.category
       FROM sample_tests st JOIN tests t ON st.test_id = t.id
       WHERE st.sample_id=$1`,
            [sampleId]
        );

        for (const st of sampleTests) {
            const { rows } = await pool.query(
                `SELECT tc.component_name, tc.unit, tc.normal_min, tc.normal_max, tc.normal_text,
                tc.sort_order, tr.value, tr.is_abnormal
         FROM test_components tc
         LEFT JOIN test_results tr ON tr.component_id = tc.id AND tr.sample_test_id = $1
         WHERE tc.test_id = $2
         ORDER BY tc.sort_order`,
                [st.sample_test_id, st.test_id]
            );
            st.components = rows;
        }

        res.json({
            report: {
                lab: {
                    name: 'Accu Trace Labs',
                    address: '123 Medical Center, Lahore, Pakistan',
                    phone: '+92-42-3456789',
                    email: 'info@accutracelabs.com',
                    license: 'LIC-2024-PAK-0123'
                },
                sample,
                tests: sampleTests,
                generated_at: new Date().toISOString(),
            }
        });
    } catch (err) {
        console.error('Report detail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/reports/stats/dashboard - dashboard stats
router.get('/stats/dashboard', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT status, COUNT(*) as count FROM samples GROUP BY status`
        );
        const stats = { Registered: 0, 'In Progress': 0, Completed: 0, total: 0 };
        rows.forEach(r => {
            stats[r.status] = parseInt(r.count);
            stats.total += parseInt(r.count);
        });

        const patientCount = await pool.query('SELECT COUNT(*) FROM patients');
        const todayCount = await pool.query(
            `SELECT COUNT(*) FROM samples WHERE created_at::date = CURRENT_DATE`
        );
        const abnormalCount = await pool.query(
            `SELECT COUNT(*) FROM test_results WHERE is_abnormal = true`
        );
        const verifiedCount = await pool.query(
            `SELECT COUNT(*) FROM samples WHERE is_verified = true`
        );

        res.json({
            ...stats,
            patients: parseInt(patientCount.rows[0].count),
            today_samples: parseInt(todayCount.rows[0].count),
            abnormal_results: parseInt(abnormalCount.rows[0].count),
            verified: parseInt(verifiedCount.rows[0].count),
        });
    } catch (err) {
        console.error('Report stats error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
