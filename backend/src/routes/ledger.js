import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);
router.use(requireRole('admin'));

// GET /api/ledger — unified income + expense list with running balance
router.get('/', async (req, res) => {
    try {
        const { from, to, type, category } = req.query;

        // Build income query (from invoices where amount_paid > 0)
        let incomeConditions = ['i.amount_paid > 0'];
        let incomeParams = [];
        let ii = 1;

        if (from) { incomeConditions.push(`i.created_at::date >= $${ii++}`); incomeParams.push(from); }
        if (to) { incomeConditions.push(`i.created_at::date <= $${ii++}`); incomeParams.push(to); }

        const incomeWhere = incomeConditions.join(' AND ');

        // Build expense query
        let expenseConditions = [];
        let expenseParams = [];
        let ei = 1;

        if (from) { expenseConditions.push(`e.date >= $${ei++}`); expenseParams.push(from); }
        if (to) { expenseConditions.push(`e.date <= $${ei++}`); expenseParams.push(to); }
        if (category && category !== 'All') {
            expenseConditions.push(`e.category = $${ei++}`); expenseParams.push(category);
        }

        const expenseWhere = expenseConditions.length ? 'WHERE ' + expenseConditions.join(' AND ') : '';

        let entries = [];

        // Fetch income entries (unless filtered to expenses only)
        if (type !== 'Expense') {
            const { rows: incomeRows } = await pool.query(
                `SELECT 
                    i.created_at::date as date,
                    i.created_at as sort_date,
                    'Income' as type,
                    'Patient Payment' as category,
                    CONCAT('Invoice #', i.invoice_number, ' — ', i.patient_name_snapshot) as description,
                    i.amount_paid as amount
                 FROM invoices i
                 WHERE ${incomeWhere}
                 ORDER BY i.created_at`,
                incomeParams
            );
            entries = entries.concat(incomeRows);
        }

        // Fetch expense entries (unless filtered to income only)
        if (type !== 'Income') {
            const { rows: expenseRows } = await pool.query(
                `SELECT 
                    e.date as date,
                    e.created_at as sort_date,
                    'Expense' as type,
                    e.category,
                    e.item_description as description,
                    e.amount
                 FROM expenses e
                 ${expenseWhere}
                 ORDER BY e.date, e.created_at`,
                expenseParams
            );
            entries = entries.concat(expenseRows);
        }

        // Sort chronologically
        entries.sort((a, b) => new Date(a.sort_date) - new Date(b.sort_date));

        // Calculate running balance
        let runningBalance = 0;
        entries = entries.map(entry => {
            if (entry.type === 'Income') {
                runningBalance += parseFloat(entry.amount);
            } else {
                runningBalance -= parseFloat(entry.amount);
            }
            return {
                ...entry,
                amount: parseFloat(entry.amount),
                running_balance: Math.round(runningBalance * 100) / 100
            };
        });

        res.json({ entries, total: entries.length });
    } catch (err) {
        console.error('Ledger error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/ledger/export — CSV download
router.get('/export', async (req, res) => {
    try {
        const { from, to, type, category } = req.query;

        // Reuse the same logic — fetch all entries
        let incomeConditions = ['i.amount_paid > 0'];
        let incomeParams = [];
        let ii = 1;

        if (from) { incomeConditions.push(`i.created_at::date >= $${ii++}`); incomeParams.push(from); }
        if (to) { incomeConditions.push(`i.created_at::date <= $${ii++}`); incomeParams.push(to); }

        let expenseConditions = [];
        let expenseParams = [];
        let ei = 1;

        if (from) { expenseConditions.push(`e.date >= $${ei++}`); expenseParams.push(from); }
        if (to) { expenseConditions.push(`e.date <= $${ei++}`); expenseParams.push(to); }
        if (category && category !== 'All') {
            expenseConditions.push(`e.category = $${ei++}`); expenseParams.push(category);
        }

        let entries = [];

        if (type !== 'Expense') {
            const incomeWhere = incomeConditions.join(' AND ');
            const { rows } = await pool.query(
                `SELECT i.created_at::date as date, i.created_at as sort_date,
                    'Income' as type, 'Patient Payment' as category,
                    CONCAT('Invoice #', i.invoice_number, ' — ', i.patient_name_snapshot) as description,
                    i.amount_paid as amount
                 FROM invoices i WHERE ${incomeWhere} ORDER BY i.created_at`,
                incomeParams
            );
            entries = entries.concat(rows);
        }

        if (type !== 'Income') {
            const expenseWhere = expenseConditions.length ? 'WHERE ' + expenseConditions.join(' AND ') : '';
            const { rows } = await pool.query(
                `SELECT e.date, e.created_at as sort_date, 'Expense' as type, e.category,
                    e.item_description as description, e.amount
                 FROM expenses e ${expenseWhere} ORDER BY e.date, e.created_at`,
                expenseParams
            );
            entries = entries.concat(rows);
        }

        entries.sort((a, b) => new Date(a.sort_date) - new Date(b.sort_date));

        // Build CSV
        let runningBalance = 0;
        const csvRows = [['Date', 'Type', 'Category', 'Description', 'Amount (PKR)', 'Running Balance (PKR)']];

        for (const entry of entries) {
            const amt = parseFloat(entry.amount);
            if (entry.type === 'Income') {
                runningBalance += amt;
            } else {
                runningBalance -= amt;
            }
            csvRows.push([
                new Date(entry.date).toLocaleDateString('en-PK'),
                entry.type,
                entry.category,
                `"${(entry.description || '').replace(/"/g, '""')}"`,
                amt.toFixed(2),
                (Math.round(runningBalance * 100) / 100).toFixed(2)
            ]);
        }

        const csv = csvRows.map(r => r.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ledger-export-${new Date().toISOString().slice(0, 10)}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Ledger export error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
