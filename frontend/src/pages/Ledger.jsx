import React, { useState, useEffect, Fragment } from 'react';
import { ledgerAPI, expensesAPI } from '../api/index.js';
import { BookOpen, Download, Filter, Plus } from 'lucide-react';
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
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [savingExpense, setSavingExpense] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        category: 'Supplies',
        item_description: '',
        amount: '',
        note: ''
    });

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

    const handleSaveExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.item_description || !expenseForm.amount) return toast.error('Please fill required fields');
        setSavingExpense(true);
        try {
            await expensesAPI.create(expenseForm);
            toast.success('Expense logged successfully');
            setIsExpenseModalOpen(false);
            setExpenseForm({ date: new Date().toISOString().slice(0, 10), category: 'Supplies', item_description: '', amount: '', note: '' });
            fetchEntries(); // Refresh ledger
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to log expense');
        } finally {
            setSavingExpense(false);
        }
    };

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

    const totalTransactions = entries.length;
    const totalIncome = entries.filter(e => e.type === 'Income').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalExpenses = entries.filter(e => e.type === 'Expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const netBalance = totalIncome - totalExpenses;

    const groupedEntries = [];
    let currentGroup = null;
    entries.forEach(e => {
        const dateStr = new Date(e.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!currentGroup || currentGroup.date !== dateStr) {
            currentGroup = {
                date: dateStr,
                items: [],
                net: 0
            };
            groupedEntries.push(currentGroup);
        }
        currentGroup.items.push(e);
        currentGroup.net += (e.type === 'Income' ? parseFloat(e.amount) : -parseFloat(e.amount));
    });

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
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 w-full sm:w-auto text-sm font-bold rounded-xl transition-colors shadow-sm hover:opacity-80" style={{ backgroundColor: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.35)' }}>
                        <Plus className="w-4 h-4" /> Log Expense
                    </button>
                    <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 w-full sm:w-auto text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-500/25">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
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

            {/* Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#34d399]"></div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Income</p>
                    <p className="text-2xl font-bold text-[#34d399]">{formatPKR(totalIncome)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#f87171]"></div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-[#f87171]">-{formatPKR(totalExpenses)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#00d4aa]"></div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Net Balance</p>
                    <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-[#00d4aa]' : 'text-[#f87171]'}`}>
                        {netBalance < 0 ? '-' : ''}{formatPKR(Math.abs(netBalance))}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#4f8ef7]"></div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-[#4f8ef7]">{totalTransactions}</p>
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
                                {groupedEntries.map((group, gi) => (
                                    <Fragment key={gi}>
                                        {/* Date Divider */}
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700">
                                            <td colSpan="6" className="py-2.5 px-4 whitespace-nowrap">
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{group.date}</span>
                                                    <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1 mx-4"></div>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${group.net >= 0 ? 'bg-[#34d399]/10 text-[#34d399]' : 'bg-[#f87171]/10 text-[#f87171]'}`}>
                                                        Net: {group.net < 0 ? '-' : '+'}{formatPKR(Math.abs(group.net))}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Group Items */}
                                        {group.items.map((e, i) => {
                                            const isIncome = e.type === 'Income';
                                            return (
                                                <tr key={i}
                                                    className={`transition-colors border-b border-slate-100 dark:border-slate-700/50 ${isIncome 
                                                        ? 'bg-[linear-gradient(90deg,rgba(52,211,153,0.04)_0%,transparent_40%)] hover:bg-[linear-gradient(90deg,rgba(52,211,153,0.08)_0%,transparent_40%)]' 
                                                        : 'bg-[linear-gradient(90deg,rgba(248,113,113,0.04)_0%,transparent_40%)] hover:bg-[linear-gradient(90deg,rgba(248,113,113,0.08)_0%,transparent_40%)]'}`}
                                                    style={{ borderLeft: `3px solid ${isIncome ? '#34d399' : '#f87171'}` }}
                                                >
                                                    <td className="sticky-col py-3 px-4 text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                        {new Date(e.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                                            isIncome
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                            {e.type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{e.category}</td>
                                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">{e.description}</td>
                                                    <td className={`py-3 px-4 font-bold text-right whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {isIncome ? '+' : '-'}{formatPKR(e.amount)}
                                                    </td>
                                                    <td className={`py-3 px-4 text-base font-black text-right whitespace-nowrap tracking-wide ${e.running_balance >= 0 ? 'text-[#00d4aa]' : 'text-[#f87171]'}`}>
                                                        {e.running_balance < 0 ? `-${formatPKR(Math.abs(e.running_balance))}` : formatPKR(e.running_balance)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Log Expense Modal */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Log Expense</h2>
                        </div>
                        <form onSubmit={handleSaveExpense} className="p-6 space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                                <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                                <select required value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                                    {['Supplies', 'Equipment', 'Rent', 'Utilities', 'Salaries', 'Maintenance', 'Other'].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item Description *</label>
                                <input type="text" required value={expenseForm.item_description} onChange={e => setExpenseForm({...expenseForm, item_description: e.target.value})} placeholder="e.g. 50 syringes" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (PKR) *</label>
                                <input type="number" min="0" step="0.01" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="e.g. 1500" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note (Optional)</label>
                                <textarea value={expenseForm.note} onChange={e => setExpenseForm({...expenseForm, note: e.target.value})} rows="2" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" disabled={savingExpense} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50">
                                    {savingExpense ? 'Saving...' : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
