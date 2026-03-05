import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);
router.use(requireRole('admin'));

// GET /api/invoices — list with search, filters, pagination
router.get('/', async (req, res) => {
    try {
        const { search, payment_status } = req.query;
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);
        let conditions = [];
        let params = [];
        let i = 1;

        if (payment_status) { conditions.push(`i.payment_status = $${i++}`); params.push(payment_status); }
        if (search) {
            conditions.push(`(i.patient_name_snapshot ILIKE $${i} OR i.invoice_number ILIKE $${i})`);
            params.push(`%${search}%`); i++;
        }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

        const { rows } = await pool.query(
            `SELECT i.*, 
                    (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) as test_count
             FROM invoices i ${where}
             ORDER BY i.created_at DESC
             LIMIT $${i} OFFSET $${i + 1}`,
            [...params, limit, offset]
        );
        const countResult = await pool.query(`SELECT COUNT(*) FROM invoices i ${where}`, params);
        res.json({ invoices: rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) { console.error('Invoice list error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/invoices/stats/dashboard — kept for backward compat
router.get('/stats/dashboard', async (req, res) => {
    try {
        const totalRes = await pool.query('SELECT COUNT(*) FROM invoices');
        const revRes = await pool.query("SELECT SUM(amount_paid) FROM invoices");
        const unpaidRes = await pool.query("SELECT COUNT(*) FROM invoices WHERE payment_status = 'Unpaid' OR payment_status = 'Partial'");

        res.json({
            total_invoices: parseInt(totalRes.rows[0].count) || 0,
            revenue_collected: parseFloat(revRes.rows[0].sum) || 0,
            unpaid_invoices: parseInt(unpaidRes.rows[0].count) || 0,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/invoices/analytics — time-filtered revenue analytics
router.get('/analytics', async (req, res) => {
    try {
        const { period = 'today', from, to } = req.query;

        // Calculate date range based on period
        let startDate, endDate;
        const now = new Date();

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'week': {
                const dayOfWeek = now.getDay();
                const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            }
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'custom':
                startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = to ? new Date(to + 'T23:59:59.999') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }

        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();
        const startDateOnly = startDate.toISOString().slice(0, 10);
        const endDateOnly = endDate.toISOString().slice(0, 10);

        // ── Run ALL queries in parallel for speed ──
        const metricsP = pool.query(
            `SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(amount_paid), 0) as revenue_collected,
                COUNT(*) FILTER (WHERE payment_status = 'Unpaid') as unpaid_invoices,
                COUNT(*) FILTER (WHERE payment_status = 'Partial') as partial_payments,
                COALESCE(SUM(balance_due) FILTER (WHERE payment_status IN ('Unpaid', 'Partial')), 0) as outstanding_balance,
                CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(net_payable) / COUNT(*), 0) ELSE 0 END as avg_invoice_value
             FROM invoices
             WHERE created_at >= $1 AND created_at <= $2`,
            [startISO, endISO]
        );

        const expenseTotalP = pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE date >= $1 AND date <= $2`,
            [startDateOnly, endDateOnly]
        );

        // Chart queries
        let incomeChartP, expenseChartP;
        if (period === 'today') {
            incomeChartP = pool.query(
                `SELECT EXTRACT(HOUR FROM created_at) as hour, COALESCE(SUM(amount_paid), 0) as income
                 FROM invoices WHERE created_at >= $1 AND created_at <= $2
                 GROUP BY hour ORDER BY hour`, [startISO, endISO]);
            expenseChartP = pool.query(
                `SELECT EXTRACT(HOUR FROM created_at) as hour, COALESCE(SUM(amount), 0) as expenses
                 FROM expenses WHERE date = $1
                 GROUP BY hour ORDER BY hour`, [startDateOnly]);
        } else if (period === 'year') {
            incomeChartP = pool.query(
                `SELECT EXTRACT(MONTH FROM created_at) as month, COALESCE(SUM(amount_paid), 0) as income
                 FROM invoices WHERE created_at >= $1 AND created_at <= $2
                 GROUP BY month ORDER BY month`, [startISO, endISO]);
            expenseChartP = pool.query(
                `SELECT EXTRACT(MONTH FROM date) as month, COALESCE(SUM(amount), 0) as expenses
                 FROM expenses WHERE date >= $1 AND date <= $2
                 GROUP BY month ORDER BY month`, [startDateOnly, endDateOnly]);
        } else {
            incomeChartP = pool.query(
                `SELECT created_at::date as day, COALESCE(SUM(amount_paid), 0) as income
                 FROM invoices WHERE created_at >= $1 AND created_at <= $2
                 GROUP BY day ORDER BY day`, [startISO, endISO]);
            expenseChartP = pool.query(
                `SELECT date as day, COALESCE(SUM(amount), 0) as expenses
                 FROM expenses WHERE date >= $1 AND date <= $2
                 GROUP BY day ORDER BY day`, [startDateOnly, endDateOnly]);
        }

        // Daily breakdown queries
        const dailyIncomeP = pool.query(
            `SELECT created_at::date as date,
                    COUNT(DISTINCT patient_name_snapshot) as patients_seen,
                    COUNT(*) as invoices_created,
                    COALESCE(SUM(amount_paid), 0) as income_collected
             FROM invoices
             WHERE created_at >= $1 AND created_at <= $2
             GROUP BY date ORDER BY date`, [startISO, endISO]);
        const dailyExpensesP = pool.query(
            `SELECT date, COALESCE(SUM(amount), 0) as expenses_logged
             FROM expenses
             WHERE date >= $1 AND date <= $2
             GROUP BY date ORDER BY date`, [startDateOnly, endDateOnly]);

        // Await ALL at once
        const [metricsQuery, expenseTotalQuery, incomeChart, expenseChart, dailyIncome, dailyExpenses] =
            await Promise.all([metricsP, expenseTotalP, incomeChartP, expenseChartP, dailyIncomeP, dailyExpensesP]);

        const metrics = metricsQuery.rows[0];
        const totalExpenses = parseFloat(expenseTotalQuery.rows[0].total_expenses);
        const revenueCollected = parseFloat(metrics.revenue_collected);

        // ── CHART DATA ──
        let chartData = [];

        if (period === 'today') {
            const incomeMap = {};
            incomeChart.rows.forEach(r => { incomeMap[parseInt(r.hour)] = parseFloat(r.income); });
            const expenseMap = {};
            expenseChart.rows.forEach(r => { expenseMap[parseInt(r.hour)] = parseFloat(r.expenses); });
            for (let h = 0; h < 24; h++) {
                chartData.push({ label: `${h.toString().padStart(2, '0')}:00`, income: incomeMap[h] || 0, expenses: expenseMap[h] || 0 });
            }
        } else if (period === 'year') {
            const incomeMap = {};
            incomeChart.rows.forEach(r => { incomeMap[parseInt(r.month)] = parseFloat(r.income); });
            const expenseMap = {};
            expenseChart.rows.forEach(r => { expenseMap[parseInt(r.month)] = parseFloat(r.expenses); });
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonth = now.getMonth() + 1;
            for (let m = 1; m <= currentMonth; m++) {
                chartData.push({ label: monthNames[m - 1], income: incomeMap[m] || 0, expenses: expenseMap[m] || 0 });
            }
        } else {
            const incomeMap = {};
            incomeChart.rows.forEach(r => { incomeMap[r.day.toISOString().slice(0, 10)] = parseFloat(r.income); });
            const expenseMap = {};
            expenseChart.rows.forEach(r => {
                const key = typeof r.day === 'string' ? r.day : r.day.toISOString().slice(0, 10);
                expenseMap[key] = parseFloat(r.expenses);
            });
            const d = new Date(startDate);
            while (d <= endDate) {
                const key = d.toISOString().slice(0, 10);
                chartData.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), income: incomeMap[key] || 0, expenses: expenseMap[key] || 0 });
                d.setDate(d.getDate() + 1);
            }
        }

        const incomeByDate = {};
        dailyIncome.rows.forEach(r => {
            incomeByDate[r.date.toISOString().slice(0, 10)] = r;
        });
        const expenseByDate = {};
        dailyExpenses.rows.forEach(r => {
            const key = typeof r.date === 'string' ? r.date : r.date.toISOString().slice(0, 10);
            expenseByDate[key] = parseFloat(r.expenses_logged);
        });

        // Merge all dates
        const allDates = new Set([...Object.keys(incomeByDate), ...Object.keys(expenseByDate)]);
        const dailyBreakdown = [...allDates].sort().map(date => {
            const inc = incomeByDate[date] || {};
            const exp = expenseByDate[date] || 0;
            const income = parseFloat(inc.income_collected || 0);
            return {
                date,
                patients_seen: parseInt(inc.patients_seen || 0),
                invoices_created: parseInt(inc.invoices_created || 0),
                income_collected: income,
                expenses_logged: exp,
                net_balance: Math.round((income - exp) * 100) / 100
            };
        });

        res.json({
            metrics: {
                revenue_collected: revenueCollected,
                total_invoices: parseInt(metrics.total_invoices),
                unpaid_invoices: parseInt(metrics.unpaid_invoices),
                partial_payments: parseInt(metrics.partial_payments),
                outstanding_balance: parseFloat(metrics.outstanding_balance),
                avg_invoice_value: Math.round(parseFloat(metrics.avg_invoice_value) * 100) / 100,
                total_expenses: totalExpenses,
                net_balance: Math.round((revenueCollected - totalExpenses) * 100) / 100
            },
            chart_data: chartData,
            daily_breakdown: dailyBreakdown
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/invoices/:id — detail with items
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid invoice ID' });
        const { rows: [invoice] } = await pool.query('SELECT * FROM invoices WHERE id=$1', [id]);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const { rows: items } = await pool.query(
            'SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY id', [id]
        );
        res.json({ ...invoice, items });
    } catch (err) { console.error('Invoice detail error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// PUT /api/invoices/:id/payment — update payment
router.put('/:id/payment', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid invoice ID' });
        const { amount_paid, payment_method } = req.body;
        const { rows: [inv] } = await pool.query('SELECT net_payable FROM invoices WHERE id=$1', [id]);
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });

        const paid = parseFloat(amount_paid) || 0;
        const net = parseFloat(inv.net_payable);
        const balance = Math.max(0, net - paid);
        const status = paid <= 0 ? 'Unpaid' : paid >= net ? 'Paid' : 'Partial';

        const { rows: [updated] } = await pool.query(
            `UPDATE invoices SET amount_paid=$1, balance_due=$2, payment_status=$3, payment_method=$4, updated_at=NOW()
             WHERE id=$5 RETURNING *`,
            [paid, balance, status, payment_method || 'Cash', id]
        );
        res.json(updated);
    } catch (err) { console.error('Invoice payment error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
