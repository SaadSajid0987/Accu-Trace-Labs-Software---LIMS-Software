import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { logAudit } from './audit.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/samples?status=...&patient=...
router.get('/', async (req, res) => {
    try {
        const { status, patient_id, search, verified } = req.query;
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);
        let conditions = [];
        let params = [];
        let i = 1;

        if (status) { conditions.push(`s.status = $${i++}`); params.push(status); }
        if (patient_id) { conditions.push(`s.patient_id = $${i++}`); params.push(patient_id); }
        if (verified === 'true') { conditions.push(`s.is_verified = true`); }
        if (verified === 'false') { conditions.push(`s.is_verified = false`); }
        if (search) {
            conditions.push(`(p.name ILIKE $${i} OR s.sample_id ILIKE $${i} OR p.patient_id ILIKE $${i})`);
            params.push(`%${search}%`); i++;
        }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const { rows } = await pool.query(
            `SELECT s.*, p.name as patient_name, p.patient_id as patient_ref,
        u.name as ordered_by_name, v.name as verified_by_name,
        array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tests
       FROM samples s
       LEFT JOIN patients p ON s.patient_id = p.id
       LEFT JOIN users u ON s.ordered_by = u.id
       LEFT JOIN users v ON s.verified_by = v.id
       LEFT JOIN sample_tests st ON s.id = st.sample_id
       LEFT JOIN tests t ON st.test_id = t.id
       ${where}
       GROUP BY s.id, p.name, p.patient_id, u.name, v.name
       ORDER BY s.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
            [...params, limit, offset]
        );
        const countResult = await pool.query(
            `SELECT COUNT(DISTINCT s.id) FROM samples s
       LEFT JOIN patients p ON s.patient_id = p.id ${where}`,
            params
        );
        res.json({ samples: rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('Samples list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/samples - create new sample order + auto-create invoice
router.post('/', requireRole('admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { patient_id, test_ids = [], priority = 'Routine', notes,
            discount_amount = 0, discount_reason = '', payment_method = 'Cash', amount_paid = 0 } = req.body;
        if (!patient_id || !Array.isArray(test_ids) || test_ids.length === 0) {
            return res.status(400).json({ error: 'Patient and at least one test are required' });
        }
        // Validate test_ids are integers
        if (!test_ids.every(id => Number.isInteger(Number(id)))) {
            return res.status(400).json({ error: 'Invalid test IDs' });
        }
        // Validate priority
        if (!['Routine', 'Urgent', 'STAT'].includes(priority)) {
            return res.status(400).json({ error: 'Invalid priority value' });
        }
        await client.query('BEGIN');

        // 1. Create sample
        const { rows: [sample] } = await client.query(
            `INSERT INTO samples (patient_id, ordered_by, priority, notes, status) VALUES ($1,$2,$3,$4,'Registered') RETURNING *`,
            [patient_id, req.user.id, priority, notes]
        );
        for (const testId of test_ids) {
            await client.query('INSERT INTO sample_tests (sample_id, test_id) VALUES ($1,$2)', [sample.id, testId]);
        }

        // 2. Snapshot patient info
        const { rows: [patient] } = await client.query(
            'SELECT name, referring_doctor FROM patients WHERE id=$1', [patient_id]
        );

        // 3. Get test prices for snapshot
        const { rows: tests } = await client.query(
            'SELECT id, name, price FROM tests WHERE id = ANY($1)', [test_ids]
        );

        // 4. Calculate totals
        const subtotal = tests.reduce((s, t) => s + parseFloat(t.price || 0), 0);
        const disc = Math.max(0, Math.min(parseFloat(discount_amount) || 0, subtotal));
        const discPercentage = subtotal > 0 ? Math.round((disc / subtotal) * 10000) / 100 : 0;
        const netPayable = Math.max(0, subtotal - disc);
        const paid = parseFloat(amount_paid) || 0;
        const balanceDue = Math.max(0, netPayable - paid);
        const paymentStatus = paid <= 0 ? 'Unpaid' : paid >= netPayable ? 'Paid' : 'Partial';

        // 5. Create invoice
        const { rows: [invoice] } = await client.query(
            `INSERT INTO invoices (sample_id, patient_name_snapshot, referring_doctor_snapshot,
                subtotal, discount_amount, discount_percentage, discount_reason, net_payable, amount_paid, balance_due, payment_method, payment_status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [sample.id, patient?.name, patient?.referring_doctor,
                subtotal, disc, discPercentage, discount_reason || '', netPayable, paid, balanceDue, payment_method, paymentStatus]
        );

        // 6. Create invoice items
        for (const t of tests) {
            const price = parseFloat(t.price || 0);
            await client.query(
                `INSERT INTO invoice_items (invoice_id, test_name_snapshot, price_snapshot, quantity, line_total)
                 VALUES ($1,$2,$3,1,$3)`,
                [invoice.id, t.name, price]
            );
        }

        await client.query('COMMIT');
        await logAudit('samples', sample.id, 'status', null, 'Registered', 'INSERT', req.user.id);

        // Return enriched
        const { rows: [enriched] } = await pool.query(
            `SELECT s.*, p.name as patient_name, p.patient_id as patient_ref
       FROM samples s LEFT JOIN patients p ON s.patient_id = p.id WHERE s.id=$1`,
            [sample.id]
        );
        res.status(201).json({ ...enriched, invoice });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sample create error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Helper: count filled results vs total components for a sample
async function getResultProgress(sampleId) {
    const { rows } = await pool.query(
        `SELECT 
            COUNT(tc.id) as total_components,
            COUNT(tr.id) FILTER (WHERE tr.value IS NOT NULL AND tr.value != '') as filled_components
        FROM sample_tests st
        JOIN test_components tc ON tc.test_id = st.test_id
        LEFT JOIN test_results tr ON tr.component_id = tc.id AND tr.sample_test_id = st.id
        WHERE st.sample_id = $1`,
        [sampleId]
    );
    return {
        total: parseInt(rows[0].total_components),
        filled: parseInt(rows[0].filled_components),
    };
}

// GET /api/samples/:id - full sample details with results
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid sample ID' });
        const { rows: [sample] } = await pool.query(
            `SELECT s.*, p.name as patient_name, p.patient_id as patient_ref, p.gender, p.dob, p.blood_group, p.cnic, p.referring_doctor, p.age, p.guardian_name,
        u.name as ordered_by_name, v.name as verified_by_name
       FROM samples s
       LEFT JOIN patients p ON s.patient_id = p.id
       LEFT JOIN users u ON s.ordered_by = u.id
       LEFT JOIN users v ON s.verified_by = v.id
       WHERE s.id=$1`,
            [id]
        );
        if (!sample) return res.status(404).json({ error: 'Sample not found' });

        // Get ordered tests with components and results
        const { rows: sampleTests } = await pool.query(
            `SELECT st.id as sample_test_id, t.id as test_id, t.name as test_name, t.category
       FROM sample_tests st JOIN tests t ON st.test_id = t.id
       WHERE st.sample_id=$1`,
            [id]
        );

        for (const st of sampleTests) {
            const { rows: components } = await pool.query(
                `SELECT tc.*, tr.id as result_id, tr.value, tr.is_abnormal, tr.entered_at,
                e.name as entered_by_name
         FROM test_components tc
         LEFT JOIN test_results tr ON tr.component_id = tc.id AND tr.sample_test_id = $1
         LEFT JOIN users e ON tr.entered_by = e.id
         WHERE tc.test_id = $2
         ORDER BY tc.sort_order`,
                [st.sample_test_id, st.test_id]
            );
            st.components = components;
        }

        // Get result progress
        const progress = await getResultProgress(id);

        res.json({ ...sample, tests: sampleTests, progress });
    } catch (err) {
        console.error('Sample detail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/samples/:id/status - manual status change
const STATUS_FLOW = ['Registered', 'In Progress', 'Completed'];
router.put('/:id/status', requireRole('admin', 'technician'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!STATUS_FLOW.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const { rows: [current] } = await pool.query('SELECT status FROM samples WHERE id=$1', [req.params.id]);
        if (!current) return res.status(404).json({ error: 'Sample not found' });

        const extra = status === 'Completed' ? 'completed_at = NOW(),' : '';
        const { rows: [updated] } = await pool.query(
            `UPDATE samples SET ${extra} status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
            [status, req.params.id]
        );

        // If reverting to In Progress from Completed, clear completed_at and is_verified
        if (status === 'In Progress' && current.status === 'Completed') {
            await pool.query(
                `UPDATE samples SET completed_at=NULL, is_verified=false, verified_by=NULL, verified_at=NULL WHERE id=$1`,
                [req.params.id]
            );
        }

        await logAudit('samples', Number(req.params.id), 'status', current.status, status, 'UPDATE', req.user.id);
        res.json(updated);
    } catch (err) {
        console.error('Sample status update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/samples/:id/results - enter results (technician)
router.post('/:id/results', requireRole('admin', 'technician'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { results = [], notes, remarks } = req.body;
        if (!Array.isArray(results)) return res.status(400).json({ error: 'results array required' });

        await client.query('BEGIN');
        const saved = [];

        // 1. Bulk Update Notes & Remarks immediately on the sample
        if (notes !== undefined || remarks !== undefined) {
            const updates = [];
            const params = [];
            let pIdx = 1;

            if (notes !== undefined) { updates.push(`notes = $${pIdx++}`); params.push(notes); }
            if (remarks !== undefined) { updates.push(`remarks = $${pIdx++}`); params.push(remarks); }

            if (updates.length > 0) {
                params.push(req.params.id);
                await client.query(`UPDATE samples SET ${updates.join(', ')} WHERE id = $${pIdx}`, params);
                // Audit log bundle
                await logAudit('samples', Number(req.params.id), null, null, JSON.stringify({ notes, remarks }), 'UPDATE', req.user.id, 'Updated notes/remarks');
            }
        }

        if (results.length > 0) {
            // 2. Pre-fetch all relevant components locally to avoid N+1 queries
            const compIds = [...new Set(results.map(r => r.component_id))];
            let compMap = {};
            if (compIds.length > 0) {
                const { rows: comps } = await client.query('SELECT * FROM test_components WHERE id = ANY($1::int[])', [compIds]);
                compMap = comps.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
            }

            // 3. Pre-fetch all existing results for these sample_test_ids locally
            const stIds = [...new Set(results.map(r => r.sample_test_id))];
            let existingMap = {};
            if (stIds.length > 0) {
                const { rows: existings } = await client.query('SELECT * FROM test_results WHERE sample_test_id = ANY($1::int[])', [stIds]);
                existingMap = existings.reduce((acc, e) => ({ ...acc, [`${e.sample_test_id}_${e.component_id}`]: e }), {});
            }

            const abnormalHits = [];

            // 4. Process in memory then execute
            for (const r of results) {
                const { sample_test_id, component_id, value } = r;
                const comp = compMap[component_id];

                let is_abnormal = false;
                if (comp && value !== '' && value !== null) {
                    const numVal = parseFloat(value);
                    if (!isNaN(numVal)) {
                        if (comp.normal_min !== null && numVal < parseFloat(comp.normal_min)) is_abnormal = true;
                        if (comp.normal_max !== null && numVal > parseFloat(comp.normal_max)) is_abnormal = true;
                    } else if (comp.normal_text && value.toLowerCase() !== comp.normal_text.toLowerCase()) {
                        is_abnormal = true;
                    }
                }

                const existingKey = `${sample_test_id}_${component_id}`;
                const existing = existingMap[existingKey];

                let result;
                if (existing) {
                    const { rows: [updated] } = await client.query(
                        `UPDATE test_results SET value=$1, is_abnormal=$2, entered_by=$3, updated_at=NOW()
               WHERE id=$4 RETURNING *`,
                        [value, is_abnormal, req.user.id, existing.id]
                    );
                    result = updated;
                    await logAudit('test_results', existing.id, 'value', existing.value, value, 'UPDATE', req.user.id,
                        `Component: ${comp?.component_name}`);
                } else {
                    const { rows: [inserted] } = await client.query(
                        `INSERT INTO test_results (sample_test_id, component_id, value, is_abnormal, entered_by)
               VALUES ($1,$2,$3,$4,$5) RETURNING *`,
                        [sample_test_id, component_id, value, is_abnormal, req.user.id]
                    );
                    result = inserted;
                    await logAudit('test_results', inserted.id, 'value', null, value, 'INSERT', req.user.id,
                        `Component: ${comp?.component_name}`);
                }

                if (is_abnormal) abnormalHits.push({ sample_test_id, comp, value });
                saved.push(result);
            }

            // 5. Fire notifications massively if abnormals found
            if (abnormalHits.length > 0) {
                const abnStIds = [...new Set(abnormalHits.map(a => a.sample_test_id))];
                const { rows: sInfos } = await client.query(
                    `SELECT st.id as st_id, s.sample_id, p.name as patient_name 
                         FROM samples s 
                         JOIN sample_tests st ON st.sample_id = s.id 
                         JOIN patients p ON s.patient_id = p.id
                         WHERE st.id = ANY($1::int[])`,
                    [abnStIds]
                );
                const infoMap = sInfos.reduce((acc, s) => ({ ...acc, [s.st_id]: s }), {});

                for (const abn of abnormalHits) {
                    const sInfo = infoMap[abn.sample_test_id];
                    const comp = abn.comp;
                    const refRange = (comp.normal_min !== null && comp.normal_max !== null)
                        ? `${comp.normal_min} - ${comp.normal_max} ${comp.unit || ''}`
                        : (comp.normal_text || 'None');

                    const msg = `Abnormal Result text: ${sInfo?.patient_name} (${sInfo?.sample_id}). ${comp?.component_name}: ${abn.value} ${comp?.unit || ''} (Normal: ${refRange})`;

                    await client.query(
                        `INSERT INTO notifications (type, message, reference_id, reference_type, target_role) 
                         VALUES 
                         ('AbnormalResult', $1, $2, 'Sample', 'admin'),
                         ('AbnormalResult', $1, $2, 'Sample', 'pathologist')`,
                        [msg, req.params.id]
                    );
                }
            }
        }

        await client.query('COMMIT');

        // AUTO-TRANSITION: Check if status should advance
        const { rows: [sample] } = await pool.query('SELECT status FROM samples WHERE id=$1', [req.params.id]);
        const progress = await getResultProgress(req.params.id);

        if (sample.status === 'Registered' && progress.filled > 0) {
            // Auto-transition to In Progress
            await pool.query(`UPDATE samples SET status='In Progress', updated_at=NOW() WHERE id=$1`, [req.params.id]);
            await logAudit('samples', Number(req.params.id), 'status', 'Registered', 'In Progress', 'UPDATE', req.user.id, 'Auto-transition on result entry');
        }

        res.json({ saved, message: `${saved.length} result(s) saved, plus metadata`, progress });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sample results error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});



// PUT /api/samples/:id/verify - toggle verification (pathologist/admin)
router.put('/:id/verify', requireRole('admin', 'pathologist'), async (req, res) => {
    try {
        const { rows: [current] } = await pool.query('SELECT status, is_verified FROM samples WHERE id=$1', [req.params.id]);
        if (!current) return res.status(404).json({ error: 'Sample not found' });
        if (current.status !== 'Completed') return res.status(400).json({ error: 'Sample must be Completed before verification' });

        const newVerified = !current.is_verified;
        const { rows: [updated] } = await pool.query(
            `UPDATE samples SET is_verified=$1, verified_by=$2, verified_at=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
            [newVerified, newVerified ? req.user.id : null, newVerified ? new Date() : null, req.params.id]
        );
        await logAudit('samples', Number(req.params.id), 'is_verified', String(!newVerified), String(newVerified), 'UPDATE', req.user.id);
        res.json(updated);
    } catch (err) {
        console.error('Sample verify error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
