import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

// ============================================================
// Shared audit helper — imported by other routes
// ============================================================
export async function logAudit(tableName, recordId, fieldName, oldValue, newValue, action, userId, notes = null) {
    try {
        await pool.query(
            `INSERT INTO audit_log (table_name, record_id, field_name, old_value, new_value, action, changed_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [tableName, recordId, fieldName, oldValue?.toString() || null, newValue?.toString() || null, action, userId, notes]
        );
    } catch (err) {
        console.error('Audit log error:', err.message);
    }
}

// ============================================================
// Internal Helper: Auto-Archive > 12 Months
// ============================================================
async function autoArchiveAuditLogs() {
    try {
        await pool.query('BEGIN');
        // Move records older than 12 months
        await pool.query(`
            INSERT INTO audit_log_archive (id, table_name, record_id, field_name, old_value, new_value, action, changed_by, changed_at, ip_address, notes)
            SELECT id, table_name, record_id, field_name, old_value, new_value, action, changed_by, changed_at, ip_address, notes
            FROM audit_log
            WHERE changed_at < NOW() - INTERVAL '12 months'
            ON CONFLICT (id) DO NOTHING;
        `);
        // Delete them from main table
        await pool.query(`
            DELETE FROM audit_log
            WHERE changed_at < NOW() - INTERVAL '12 months';
        `);
        await pool.query('COMMIT');
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Auto-archiving error:', err.message);
    }
}

// ============================================================
// Internal Helper: Generate Human-Readable Description
// ============================================================
function generateDescription(log) {
    const { action, table_name, field_name, old_value, new_value } = log;
    let targetStr = '';

    // Extract target metadata from joins
    if (table_name === 'patients') {
        const name = log.p_name || 'Unknown Patient';
        const pId = log.p_id || `ID-${log.record_id}`;
        targetStr = `${name} (${pId})`;
    } else if (table_name === 'samples') {
        targetStr = `sample ${log.s_id || log.record_id}`;
    } else if (table_name === 'users') {
        targetStr = `user account for ${log.u_email || `ID-${log.record_id}`}`;
    } else if (table_name === 'invoices') {
        targetStr = `invoice ${log.i_num || log.record_id}`;
    } else if (table_name === 'test_results') {
        targetStr = `test result for ${log.tr_test_name || 'Unknown Test'} — ${log.tr_comp_name || 'Unknown Component'} on sample ${log.tr_s_id || 'Unknown'}`;
    } else if (table_name === 'email_settings') {
        targetStr = 'email settings';
    } else {
        targetStr = `record in ${table_name}`;
    }

    // Generate sentence
    if (action === 'INSERT') {
        if (table_name === 'patients') return `Added new patient ${targetStr}`;
        if (table_name === 'samples') return `Registered new ${targetStr} for patient ${log.s_p_name || 'Unknown'}`;
        if (table_name === 'users') {
            const role = new_value && new_value !== 'undefined' ? (JSON.parse(new_value)?.role || 'Unknown') : 'Unknown';
            return `Added new ${targetStr} with role ${role}`;
        }
        if (table_name === 'invoices') return `Created ${targetStr} for patient ${log.i_p_name || 'Unknown'} — PKR ${log.i_amount || '0'}`;

        let parsedVal;
        try { parsedVal = JSON.parse(new_value); } catch (e) { parsedVal = new_value; }
        const createdRef = parsedVal?.id || parsedVal?.patient_id || parsedVal?.sample_id || log.record_id || '';
        return `Created new ${targetStr} ${createdRef}`;
    }

    if (action === 'DELETE') {
        if (table_name === 'users' && log.notes === 'deactivated') return `Deactivated ${targetStr}`;
        if (table_name === 'users' && log.notes === 'deleted') return `Deleted ${targetStr}`;
        return `Deleted ${targetStr} from the system`;
    }

    if (action === 'UPDATE') {
        if (!field_name && new_value) {
            // Bulk update payload usually serialized as full JSON
            return `Updated ${targetStr} details`;
        }

        // Single field updates
        const cleanField = field_name ? field_name.replace(/_/g, ' ') : 'details';

        if (table_name === 'samples' && field_name === 'status') {
            return `Changed ${targetStr} status from ${old_value || 'unknown'} to ${new_value || 'unknown'}`;
        }
        if (table_name === 'invoices' && field_name === 'status') {
            return `Updated ${targetStr} payment status from ${old_value || 'unknown'} to ${new_value || 'unknown'}`;
        }
        if (table_name === 'test_results' && field_name === 'value') {
            return `Changed ${targetStr} from ${old_value || 'empty'} to ${new_value || 'empty'}`;
        }
        if (table_name === 'users' && field_name === 'role') {
            return `Changed user role for ${log.u_email || 'unknown'} from ${old_value || 'unknown'} to ${new_value || 'unknown'}`;
        }

        return `Updated ${targetStr}'s ${cleanField} from ${old_value || 'empty'} to ${new_value || 'empty'}`;
    }

    return `${action} performed on ${targetStr}`;
}

// ============================================================
// GET /api/audit — Admin only
// ============================================================
const router = express.Router();
router.use(verifyToken);

router.get('/', requireRole('admin'), async (req, res) => {
    try {
        // Run auto-archive lazily on access
        await autoArchiveAuditLogs();

        const { table, page = 1, startDate, endDate, action, search, userId, archive = 'false', limit: limitParam } = req.query;
        // Provide massive limit if downloading CSV
        const limit = limitParam === 'all' ? 10000 : Math.min(Math.max(parseInt(limitParam) || 50, 1), 100);
        const offset = (Math.max(parseInt(page), 1) - 1) * limit;

        const sourceTable = archive === 'true' ? 'audit_log_archive' : 'audit_log';

        // Get basic logs plus the user who changed it
        let query = `
          SELECT 
            al.*, 
            u.name as user_name, u.email as user_email
          FROM ${sourceTable} al
          LEFT JOIN users u ON al.changed_by = u.id
          WHERE 1=1
        `;
        let countQuery = `SELECT COUNT(*) FROM ${sourceTable} al LEFT JOIN users u ON al.changed_by = u.id WHERE 1=1`;

        const params = [];
        let paramIndex = 1;

        if (table) {
            query += ` AND al.table_name = $${paramIndex}`;
            countQuery += ` AND al.table_name = $${paramIndex}`;
            params.push(table);
            paramIndex++;
        }
        if (action) {
            query += ` AND al.action = $${paramIndex}`;
            countQuery += ` AND al.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }
        if (userId) {
            query += ` AND al.changed_by = $${paramIndex}`;
            countQuery += ` AND al.changed_by = $${paramIndex}`;
            params.push(parseInt(userId));
            paramIndex++;
        }
        if (startDate) {
            query += ` AND al.changed_at >= $${paramIndex}`;
            countQuery += ` AND al.changed_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            // Append 23:59:59 to include the whole end day
            query += ` AND al.changed_at <= $${paramIndex}::timestamp + interval '1 day' - interval '1 second'`;
            countQuery += ` AND al.changed_at <= $${paramIndex}::timestamp + interval '1 day' - interval '1 second'`;
            params.push(endDate);
            paramIndex++;
        }

        const searchTermForOuter = search ? `%${search}%` : null;

        if (search) {
            // Because we only do the complex joins outside the pagination to save performance, 
            // for search we have to subquery or use the same complex joins.
            // Let's attach the complex joins to the main query to allow searching across them.

            query = `
              SELECT 
                al.*, 
                u.name as user_name, u.email as user_email,
                pat.name as p_name, pat.patient_id as p_id,
                sam.sample_id as s_id, sam_pat.name as s_p_name,
                usr.email as u_email,
                inv.invoice_number as i_num, inv_pat.name as i_p_name, inv.total_amount as i_amount
              FROM ${sourceTable} al
              LEFT JOIN users u ON al.changed_by = u.id
              LEFT JOIN patients pat ON al.table_name = 'patients' AND al.record_id = pat.id
              LEFT JOIN samples sam ON al.table_name = 'samples' AND al.record_id = sam.id
              LEFT JOIN patients sam_pat ON sam.patient_id = sam_pat.id
              LEFT JOIN users usr ON al.table_name = 'users' AND al.record_id = usr.id
              LEFT JOIN invoices inv ON al.table_name = 'invoices' AND al.record_id = inv.id
              LEFT JOIN patients inv_pat ON inv.patient_id = inv_pat.id
              WHERE 1=1
            `;

            countQuery = `
              SELECT COUNT(*)
              FROM ${sourceTable} al
              LEFT JOIN users u ON al.changed_by = u.id
              LEFT JOIN patients pat ON al.table_name = 'patients' AND al.record_id = pat.id
              LEFT JOIN samples sam ON al.table_name = 'samples' AND al.record_id = sam.id
              LEFT JOIN patients sam_pat ON sam.patient_id = sam_pat.id
              LEFT JOIN users usr ON al.table_name = 'users' AND al.record_id = usr.id
              LEFT JOIN invoices inv ON al.table_name = 'invoices' AND al.record_id = inv.id
              LEFT JOIN patients inv_pat ON inv.patient_id = inv_pat.id
              WHERE 1=1
            `;

            // re-append filters to the fully joined query
            params.length = 0; // reset params
            paramIndex = 1;

            if (table) { query += ` AND al.table_name = $${paramIndex}`; countQuery += ` AND al.table_name = $${paramIndex}`; params.push(table); paramIndex++; }
            if (action) { query += ` AND al.action = $${paramIndex}`; countQuery += ` AND al.action = $${paramIndex}`; params.push(action); paramIndex++; }
            if (userId) { query += ` AND al.changed_by = $${paramIndex}`; countQuery += ` AND al.changed_by = $${paramIndex}`; params.push(parseInt(userId)); paramIndex++; }
            if (startDate) { query += ` AND al.changed_at >= $${paramIndex}`; countQuery += ` AND al.changed_at >= $${paramIndex}`; params.push(startDate); paramIndex++; }
            if (endDate) {
                query += ` AND al.changed_at <= $${paramIndex}::timestamp + interval '1 day' - interval '1 second'`;
                countQuery += ` AND al.changed_at <= $${paramIndex}::timestamp + interval '1 day' - interval '1 second'`;
                params.push(endDate); paramIndex++;
            }

            query += ` AND (
                u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR
                pat.name ILIKE $${paramIndex} OR pat.patient_id ILIKE $${paramIndex} OR
                sam.sample_id ILIKE $${paramIndex} OR inv.invoice_number ILIKE $${paramIndex} OR
                usr.email ILIKE $${paramIndex}
            )`;
            countQuery += ` AND (
                u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR
                pat.name ILIKE $${paramIndex} OR pat.patient_id ILIKE $${paramIndex} OR
                sam.sample_id ILIKE $${paramIndex} OR inv.invoice_number ILIKE $${paramIndex} OR
                usr.email ILIKE $${paramIndex}
            )`;
            params.push(searchTermForOuter);
            paramIndex++;
        }

        query += ` ORDER BY al.changed_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

        let fetchParams = [...params, limit, offset];

        // Fetch logs
        let { rows } = await pool.query(query, fetchParams);

        // If we didn't search, we need to manually resolve the references for the rows we DID fetch
        // (This saves DB operations by heavily joining only on the ~50 rows we actually return)
        if (!search && rows.length > 0) {
            for (let row of rows) {
                if (row.table_name === 'patients') {
                    const res = await pool.query('SELECT name, patient_id FROM patients WHERE id = $1', [row.record_id]);
                    if (res.rows[0]) { row.p_name = res.rows[0].name; row.p_id = res.rows[0].patient_id; }
                } else if (row.table_name === 'samples') {
                    const res = await pool.query('SELECT s.sample_id, p.name FROM samples s LEFT JOIN patients p ON s.patient_id = p.id WHERE s.id = $1', [row.record_id]);
                    if (res.rows[0]) { row.s_id = res.rows[0].sample_id; row.s_p_name = res.rows[0].name; }
                } else if (row.table_name === 'users') {
                    const res = await pool.query('SELECT email FROM users WHERE id = $1', [row.record_id]);
                    if (res.rows[0]) { row.u_email = res.rows[0].email; }
                } else if (row.table_name === 'invoices') {
                    const res = await pool.query('SELECT i.invoice_number, i.total_amount, p.name FROM invoices i LEFT JOIN patients p ON i.patient_id = p.id WHERE i.id = $1', [row.record_id]);
                    if (res.rows[0]) { row.i_num = res.rows[0].invoice_number; row.i_p_name = res.rows[0].name; row.i_amount = res.rows[0].total_amount; }
                } else if (row.table_name === 'test_results') {
                    const res = await pool.query(`
                        SELECT tc.component_name, t.name as test_name, s.sample_id 
                        FROM test_results tr 
                        LEFT JOIN test_components tc ON tr.component_id = tc.id 
                        LEFT JOIN sample_tests st ON tr.sample_test_id = st.id 
                        LEFT JOIN samples s ON st.sample_id = s.id 
                        LEFT JOIN tests t ON st.test_id = t.id
                        WHERE tr.id = $1
                    `, [row.record_id]);
                    if (res.rows[0]) { row.tr_comp_name = res.rows[0].component_name; row.tr_test_name = res.rows[0].test_name; row.tr_s_id = res.rows[0].sample_id; }
                }
            }
        }

        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Generate human-readable descriptions
        const enhancedLogs = rows.map(row => ({
            id: row.id,
            changed_at: row.changed_at,
            table_name: row.table_name,
            action: row.action,
            user_name: row.user_name,
            user_email: row.user_email,
            description: generateDescription(row),
            // Still returning raw data for expanding rows
            record_id: row.record_id,
            field_name: row.field_name,
            old_value: row.old_value,
            new_value: row.new_value,
            notes: row.notes
        }));

        res.json({ logs: enhancedLogs, total });
    } catch (err) {
        console.error('Audit list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
