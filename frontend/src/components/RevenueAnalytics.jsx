import { useState, useEffect, useCallback } from 'react';
import { invoicesAPI, expensesAPI } from '../api/index.js';
import { DollarSign, Receipt, AlertCircle, Clock, TrendingDown, Calculator, Wallet, Plus, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'custom', label: 'Custom' },
];

const EXPENSE_CATEGORIES = ['Supplies', 'Equipment', 'Utilities', 'Rent', 'Salaries', 'Maintenance', 'Other'];

function formatPKR(val) {
    const n = parseFloat(val) || 0;
    return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function MetricCard({ label, value, icon: Icon, positive, negative, theme = 'indigo' }) {
    const bgThemes = {
        indigo: 'from-indigo-500/5 to-indigo-500/10 border-indigo-500/10 hover:border-indigo-500/20',
        emerald: 'from-emerald-500/5 to-emerald-500/10 border-emerald-500/10 hover:border-emerald-500/20',
        rose: 'from-rose-500/5 to-rose-500/10 border-rose-500/10 hover:border-rose-500/20',
        amber: 'from-amber-500/5 to-amber-500/10 border-amber-500/10 hover:border-amber-500/20',
    };
    const iconThemes = {
        indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    };

    let valueColor = 'text-slate-900 dark:text-white';
    if (positive) valueColor = 'text-emerald-600 dark:text-emerald-400';
    if (negative) valueColor = 'text-rose-600 dark:text-rose-400';

    return (
        <div className={`group relative overflow-hidden rounded-2xl border p-4 xl:p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white/40 dark:bg-slate-800/40 dark:border-slate-700/50 bg-gradient-to-br ${bgThemes[theme]}`}>
            <div className="flex items-center gap-3 xl:gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconThemes[theme]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400/80 leading-tight mb-1 whitespace-normal break-words">
                        {label}
                    </p>
                    <p className={`text-xl font-black tracking-tight ${valueColor} truncate`}>
                        {value ?? '—'}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ExpenseModal({ onClose, onSaved }) {
    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        category: 'Supplies',
        item_description: '',
        amount: '',
        note: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.item_description.trim()) return toast.error('Description is required');
        if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Amount must be > 0');
        setSaving(true);
        try {
            await expensesAPI.create(form);
            toast.success('Expense logged');
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Log Expense</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Date</label>
                        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Category</label>
                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
                            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                        <input type="text" placeholder="e.g. 50 syringes" value={form.item_description} onChange={e => setForm({ ...form, item_description: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Amount (PKR)</label>
                        <input type="number" min="1" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Note (optional)</label>
                        <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm" />
                    </div>
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors">{saving ? 'Saving...' : 'Save Expense'}</button>
                </div>
            </div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl bg-white dark:bg-slate-800 p-3 shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
            <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {formatPKR(p.value)}</p>
            ))}
        </div>
    );
};

export default function RevenueAnalytics() {
    const [period, setPeriod] = useState('today');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { period };
            if (period === 'custom' && customFrom) params.from = customFrom;
            if (period === 'custom' && customTo) params.to = customTo;
            const res = await invoicesAPI.analytics(params);
            setData(res.data);
        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally { setLoading(false); }
    }, [period, customFrom, customTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const m = data?.metrics || {};

    return (
        <div className="relative">
            <div className="absolute inset-0 -z-10 -mx-6 -my-8 rounded-[3rem] bg-slate-50/50 dark:bg-slate-800/50 xl:-mx-8" />

            {/* Header + Time Filter */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Revenue Analytics</h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Real-time financial dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap bg-slate-100/50 dark:bg-slate-800/80 p-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/50 backdrop-blur-md">
                    {PERIODS.map(p => (
                        <button key={p.key} onClick={() => setPeriod(p.key)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${period === p.key
                                ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                            {p.label}
                        </button>
                    ))}
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <button onClick={() => setShowExpenseModal(true)} className="px-4 py-1.5 text-xs font-bold rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all duration-300 shadow-[0_4px_14px_0_rgba(244,63,94,0.39)] hover:shadow-[0_6px_20px_rgba(244,63,94,0.23)] hover:-translate-y-0.5 flex items-center gap-1.5 ml-1">
                        <Plus className="w-3.5 h-3.5" /> Log Expense
                    </button>
                </div>
            </div>

            {/* Custom date inputs */}
            {period === 'custom' && (
                <div className="flex gap-3 mb-5">
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm" />
                    <span className="text-slate-400 self-center text-sm">to</span>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm" />
                </div>
            )}

            {loading ? (
                <div className="animate-pulse space-y-6">
                    {/* Skeleton metric cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="rounded-2xl border border-slate-200/40 dark:border-slate-700/30 bg-white/30 dark:bg-slate-800/30 p-5">
                                <div className="flex items-start gap-4">
                                    <div className="h-11 w-11 rounded-xl bg-slate-200/60 dark:bg-slate-700/40 shimmer" />
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-2.5 w-16 rounded-full bg-slate-200/60 dark:bg-slate-700/40 shimmer" />
                                        <div className="h-5 w-20 rounded-lg bg-slate-200/80 dark:bg-slate-700/60 shimmer" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Skeleton chart */}
                    <div className="rounded-2xl border border-slate-200/40 dark:border-slate-700/30 bg-white/30 dark:bg-slate-800/30 p-6">
                        <div className="h-4 w-32 rounded-full bg-slate-200/60 dark:bg-slate-700/40 mb-4 shimmer" />
                        <div className="flex items-end gap-2 h-52">
                            {[40, 65, 30, 80, 55, 70, 45, 85, 50, 60, 35, 75].map((h, i) => (
                                <div key={i} className="flex-1 rounded-t-md bg-slate-200/50 dark:bg-slate-700/30 shimmer" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
                        <MetricCard label="Revenue Collected" value={formatPKR(m.revenue_collected)} icon={DollarSign} theme="emerald" />
                        <MetricCard label="Total Invoices" value={m.total_invoices} icon={Receipt} theme="indigo" />
                        <MetricCard label="Unpaid Invoices" value={m.unpaid_invoices} icon={AlertCircle} theme="rose" />
                        <MetricCard label="Partial Payments" value={m.partial_payments} icon={Clock} theme="amber" />
                        <MetricCard label="Outstanding" value={formatPKR(m.outstanding_balance)} icon={TrendingDown} theme="rose" />
                        <MetricCard label="Avg Invoice" value={formatPKR(m.avg_invoice_value)} icon={Calculator} theme="indigo" />
                        <MetricCard label="Net Balance" value={formatPKR(m.net_balance)} icon={Wallet}
                            theme={m.net_balance >= 0 ? 'emerald' : 'rose'}
                            positive={m.net_balance >= 0} negative={m.net_balance < 0} />
                    </div>

                    {/* Chart */}
                    {data?.chart_data?.length > 0 && (
                        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6 mb-6">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Income vs Expenses</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={data.chart_data} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Daily Breakdown Table */}
                    {data?.daily_breakdown?.length > 0 && (
                        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-6">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Daily Breakdown</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                                            <th className="pb-3 font-semibold px-2">Date</th>
                                            <th className="pb-3 font-semibold px-2">Patients</th>
                                            <th className="pb-3 font-semibold px-2">Invoices</th>
                                            <th className="pb-3 font-semibold px-2">Income</th>
                                            <th className="pb-3 font-semibold px-2">Expenses</th>
                                            <th className="pb-3 font-semibold px-2">Net Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {data.daily_breakdown.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="py-3 px-2 font-medium text-slate-700 dark:text-slate-200">{new Date(row.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                                <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{row.patients_seen}</td>
                                                <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{row.invoices_created}</td>
                                                <td className="py-3 px-2 font-semibold text-emerald-600 dark:text-emerald-400">{formatPKR(row.income_collected)}</td>
                                                <td className="py-3 px-2 font-semibold text-rose-600 dark:text-rose-400">{formatPKR(row.expenses_logged)}</td>
                                                <td className={`py-3 px-2 font-black ${row.net_balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {row.net_balance < 0 ? `-${formatPKR(Math.abs(row.net_balance))}` : formatPKR(row.net_balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} onSaved={fetchData} />}
        </div>
    );
}
