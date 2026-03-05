import express from 'express';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ──────────────────────────────────────────────────────
// POST /api/portal/generate  (authenticated staff only)
// ──────────────────────────────────────────────────────
router.post('/generate', verifyToken, async (req, res) => {
    try {
        const { link_type, reference_id, patient_name, patient_phone } = req.body;

        if (!link_type || !reference_id) {
            return res.status(400).json({ error: 'link_type and reference_id are required' });
        }
        if (!['Report', 'Invoice'].includes(link_type)) {
            return res.status(400).json({ error: 'link_type must be Report or Invoice' });
        }

        // Check for existing active, unexpired link
        const { rows: existing } = await pool.query(
            `SELECT * FROM patient_portal_links 
             WHERE link_type = $1 AND reference_id = $2 AND is_active = true AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [link_type, reference_id]
        );

        if (existing.length > 0) {
            return res.json({ token: existing[0].token, link: `/portal/${existing[0].token}`, reused: true });
        }

        // Generate new token
        const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(8).toString('hex');

        await pool.query(
            `INSERT INTO patient_portal_links (token, link_type, reference_id, patient_name, patient_phone)
             VALUES ($1, $2, $3, $4, $5)`,
            [token, link_type, reference_id, patient_name || null, patient_phone || null]
        );

        res.json({ token, link: `/portal/${token}`, reused: false });
    } catch (err) {
        console.error('Portal generate error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────────────
// GET /api/portal/:token  (PUBLIC — no auth required)
// ──────────────────────────────────────────────────────
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;
        if (!/^[a-f0-9]{48}$/.test(token)) {
            return res.status(400).json({ error: 'Invalid token format' });
        }

        const { rows: [link] } = await pool.query(
            'SELECT * FROM patient_portal_links WHERE token = $1',
            [token]
        );

        // Load lab settings for branding (always — even for error pages)
        const { rows: [labSettings] } = await pool.query('SELECT * FROM lab_settings WHERE id = 1');
        const lab = labSettings || {};

        if (!link) {
            return res.json({ status: 'not_found', lab });
        }

        if (!link.is_active || new Date(link.expires_at) < new Date()) {
            return res.json({ status: 'expired', lab });
        }

        // ── Valid token — fetch the referenced data ──

        if (link.link_type === 'Report') {
            // Fetch sample + patient + verifier
            const { rows: [sample] } = await pool.query(
                `SELECT s.*, 
                    p.name as patient_name, p.patient_id as patient_ref, p.gender, p.dob, 
                    p.blood_group, p.phone, p.cnic, p.referring_doctor,
                    u.name as ordered_by_name,
                    v.name as verified_by_name, v.email as verified_by_email
                 FROM samples s
                 LEFT JOIN patients p ON s.patient_id = p.id
                 LEFT JOIN users u ON s.ordered_by = u.id
                 LEFT JOIN users v ON s.verified_by = v.id
                 WHERE s.id = $1`,
                [link.reference_id]
            );

            if (!sample) return res.json({ status: 'not_found', lab });

            // Fetch tests + components
            const { rows: sampleTests } = await pool.query(
                `SELECT st.id as sample_test_id, t.id as test_id, t.name as test_name, t.category
                 FROM sample_tests st JOIN tests t ON st.test_id = t.id
                 WHERE st.sample_id = $1`,
                [link.reference_id]
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

            return res.json({
                status: 'valid',
                link_type: 'Report',
                lab,
                data: { sample, tests: sampleTests }
            });
        }

        if (link.link_type === 'Invoice') {
            const { rows: [invoice] } = await pool.query(
                'SELECT * FROM invoices WHERE id = $1',
                [link.reference_id]
            );

            if (!invoice) return res.json({ status: 'not_found', lab });

            const { rows: items } = await pool.query(
                'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id',
                [link.reference_id]
            );

            return res.json({
                status: 'valid',
                link_type: 'Invoice',
                lab,
                data: { ...invoice, items }
            });
        }

        return res.json({ status: 'not_found', lab });
    } catch (err) {
        console.error('Portal lookup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
