import { useState, useEffect } from 'react';
import { ledgerAPI } from '../api/index.js';
import { BookOpen, Download, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Supplies', 'Equipment', 'Utilities', 'Rent', 'Salaries', 'Maintenance', 'Other'];
const TYPES = ['All', 'Income', 'Expense'];

function formatPKR(val) {
    const n = parseFloat(val) || 0;
    return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function Ledger() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ from: '', to: '', type: 'All', category: 'All' });

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.from) params.from = filters.from;
            if (filters.to) params.to = filters.to;
            if (filters.type !== 'All') params.type = filters.type;
            if (filters.category !== 'All') params.category = filters.category;
            const res = await ledgerAPI.list(params);
            setEntries(res.data.entries || []);
        } catch (err) {
            toast.error('Failed to load ledger');
            console.error(err);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchEntries(); }, [filters]);

    const handleExport = async () => {
        try {
            const params = {};
            if (filters.from) params.from = filters.from;
            if (filters.to) params.to = filters.to;
            if (filters.type !== 'All') params.type = filters.type;
            if (filters.category !== 'All') params.category = filters.category;
            const res = await ledgerAPI.exportCSV(params);
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Ledger exported');
        } catch (err) {
            toast.error('Export failed');
            console.error(err);
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <BookOpen className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">Income & Expense Ledger</h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Unified financial record</p>
                    </div>
                </div>
                <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 w-full sm:w-auto text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-500/25">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-1 sm:mb-0 text-slate-500 font-medium text-sm">
                    <Filter className="w-4 h-4" /> <span className="sm:hidden">Filters:</span>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto flex-wrap">
                    <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })}
                        className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm" placeholder="From" />
                    <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })}
                        className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm" placeholder="To" />
                    <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}
                        className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}
                        className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : entries.length === 0 ? (
                    <p className="text-center py-16 text-slate-400 dark:text-slate-500 font-medium">No entries found for the selected filter.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                                    <th className="sticky-col py-3 px-4 font-semibold">Date</th>
                                    <th className="py-3 px-4 font-semibold">Type</th>
                                    <th className="py-3 px-4 font-semibold">Category</th>
                                    <th className="py-3 px-4 font-semibold">Description</th>
                                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                                    <th className="py-3 px-4 font-semibold text-right">Running Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {entries.map((e, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="sticky-col py-3 px-4 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                            {new Date(e.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${e.type === 'Income'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                                                }`}>{e.type}</span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{e.category}</td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">{e.description}</td>
                                        <td className={`py-3 px-4 font-bold text-right whitespace-nowrap ${e.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {e.type === 'Income' ? '+' : '-'}{formatPKR(e.amount)}
                                        </td>
                                        <td className={`py-3 px-4 font-black text-right whitespace-nowrap ${e.running_balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {e.running_balance < 0 ? `-${formatPKR(Math.abs(e.running_balance))}` : formatPKR(e.running_balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
