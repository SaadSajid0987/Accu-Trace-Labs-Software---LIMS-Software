import React, { useState, useEffect, useCallback } from 'react';
import { auditAPI, usersAPI } from '../api/index.js';
import { Loader2, ClipboardList, RefreshCw, Download, ChevronDown, ChevronRight, Archive, Clock } from 'lucide-react';
import LabLoader from '../components/LabLoader.jsx';
import toast from 'react-hot-toast';

const ACTION_COLORS = { INSERT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', DELETE: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' };

function formatTableName(table) {
    if (!table) return '—';
    return table.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [systemUsers, setSystemUsers] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [tableFilter, setTableFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [archiveMode, setArchiveMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const LOGS_PER_PAGE = 25;
    const totalPages = Math.ceil(total / LOGS_PER_PAGE);

    const loadUsers = async () => {
        try { const { data } = await usersAPI.list(); setSystemUsers(data); }
        catch (err) { console.error('Failed to load users for filter'); }
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await auditAPI.list({
                page,
                limit: LOGS_PER_PAGE,
                table: tableFilter || undefined,
                action: actionFilter || undefined,
                userId: userFilter || undefined,
                search: search || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                archive: archiveMode
            });
            setLogs(data.logs);
            setTotal(data.total);
            setExpandedRow(null); // Reset expansion on page load
        } catch (err) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    }, [page, tableFilter, actionFilter, userFilter, search, startDate, endDate, archiveMode]);

    useEffect(() => { loadUsers(); }, []);

    // Auto-reload on filter dependencies except raw typing for search (handled via button/enter)
    useEffect(() => { load(); }, [load]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        load();
    };

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            // Fetch everything with current filters using limit='all'
            const { data } = await auditAPI.list({
                page: 1, limit: 'all', table: tableFilter || undefined, action: actionFilter || undefined,
                userId: userFilter || undefined, search: search || undefined, startDate: startDate || undefined,
                endDate: endDate || undefined, archive: archiveMode
            });

            if (!data.logs || data.logs.length === 0) {
                toast("No log entries to export");
                return;
            }

            const header = ["Timestamp,User Name,User Email,Action,Table,Description"];
            const rows = data.logs.map(log => {
                const ts = new Date(log.changed_at).toLocaleString().replace(/,/g, '');
                const uname = (log.user_name || '').replace(/,/g, '');
                const uemail = (log.user_email || '').replace(/,/g, '');
                const action = log.action;
                const tbl = formatTableName(log.table_name);
                // Quote description to handle commas in the descriptive text
                const desc = `"${(log.description || '').replace(/"/g, '""')}"`;
                return `${ts},${uname},${uemail},${action},${tbl},${desc}`;
            });

            const csvContent = header.concat(rows).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Audit_Log_${archiveMode ? 'Archive_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Audit Log exported successfully");

        } catch (err) {
            toast.error("Failed to export logs");
        } finally {
            setIsExporting(false);
        }
    };

    const toggleRow = (id) => {
        setExpandedRow(prev => prev === id ? null : id);
    };

    const isSensitiveUpdate = (log) => {
        if (log.action !== 'UPDATE') return false;
        const fn = log.field_name || '';
        const tn = log.table_name || '';
        if (tn === 'invoices' && fn === 'status') return true;
        if (tn === 'users' && fn === 'role') return true;
        if (tn === 'test_results' && fn === 'value') return true;
        return false;
    };

    const renderRawJsonSafe = (val) => {
        if (!val) return '—';
        try {
            const parsed = JSON.parse(val);
            return <pre className="text-[10px] font-mono whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>;
        } catch (e) {
            return val;
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                            {archiveMode ? 'Archived Audit Logs' : 'Audit Log'}
                        </h1>
                        {archiveMode && <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Read-Only Archive</span>}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Tracking {total} {archiveMode ? 'historical' : 'recent'} events across the system</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <button onClick={handleExportCSV} disabled={isExporting || total === 0} className="btn-secondary w-full sm:w-auto justify-center">
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export CSV
                    </button>
                    <button onClick={() => { setPage(1); load(); }} className="btn-primary w-full sm:w-auto justify-center">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card p-4 flex flex-col sm:flex-row sm:flex-wrap gap-3 items-start sm:items-end bg-white/50 dark:bg-slate-800/50">
                <form onSubmit={handleSearch} className="w-full sm:flex-1 sm:min-w-[200px]">
                    <label className="label text-xs">Search Context</label>
                    <div className="flex gap-2">
                        <input type="text" className="input w-full" placeholder="Search names, IDs, emails..." value={search} onChange={e => setSearch(e.target.value)} />
                        <button type="submit" className="btn-secondary px-3">Go</button>
                    </div>
                </form>

                <div className="w-full sm:w-auto">
                    <label className="label text-xs">From Date</label>
                    <input type="date" className="input" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
                </div>
                <div className="w-full sm:w-auto">
                    <label className="label text-xs">To Date</label>
                    <input type="date" className="input" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
                </div>

                <div className="w-full sm:w-auto">
                    <label className="label text-xs">Action</label>
                    <select className="input" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
                        <option value="">All Actions</option>
                        <option value="INSERT">Create (INSERT)</option>
                        <option value="UPDATE">Update (UPDATE)</option>
                        <option value="DELETE">Delete (DELETE)</option>
                    </select>
                </div>

                <div className="w-full sm:w-auto">
                    <label className="label text-xs">Module (Table)</label>
                    <select className="input" value={tableFilter} onChange={e => { setTableFilter(e.target.value); setPage(1); }}>
                        <option value="">All Modules</option>
                        <option value="patients">Patients</option>
                        <option value="samples">Samples</option>
                        <option value="invoices">Invoices</option>
                        <option value="test_results">Test Results</option>
                        <option value="users">Users</option>
                        <option value="email_settings">Email Settings</option>
                    </select>
                </div>

                <div className="w-full sm:w-auto">
                    <label className="label text-xs">User</label>
                    <select className="input" value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(1); }}>
                        <option value="">All Users</option>
                        {systemUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card p-0">
                {loading ? (
                    <div className="flex items-center justify-center p-12"><LabLoader text={archiveMode ? "Loading Archive..." : "Loading Audit Logs"} /></div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No audit entries match the current filters.</p>
                        {(search || tableFilter || actionFilter || startDate || userFilter) && (
                            <button onClick={() => {
                                setSearch(''); setTableFilter(''); setActionFilter(''); setUserFilter(''); setStartDate(''); setEndDate(''); setPage(1);
                            }} className="mt-4 text-sm text-blue-500 hover:text-blue-600 transition-colors">Clear all filters</button>
                        )}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table text-sm whitespace-nowrap">
                            <thead><tr>
                                <th className="w-10 sticky-col z-10 bg-inherit hidden sm:table-cell"></th>
                                <th className="w-48">Timestamp</th>
                                <th className="w-56">User</th>
                                <th className="w-32">Action</th>
                                <th className="w-32">Module</th>
                                <th className="min-w-[300px]">Description</th>
                            </tr></thead>
                            <tbody>
                                {logs.map(log => {
                                    const isDelete = log.action === 'DELETE';
                                    const isSensUpdate = isSensitiveUpdate(log);

                                    // Row Highlighting Styles
                                    let rowClasses = "transition-colors cursor-pointer ";
                                    if (isDelete) rowClasses += "bg-red-50/50 hover:bg-red-50 dark:bg-red-500/5 dark:hover:bg-red-500/10";
                                    else if (isSensUpdate) rowClasses += "bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-500/5 dark:hover:bg-amber-500/10";
                                    else rowClasses += "hover:bg-slate-50 dark:hover:bg-slate-800/50";

                                    const isExpanded = expandedRow === log.id;

                                    return (
                                        <React.Fragment key={log.id}>
                                            <tr className={rowClasses} onClick={() => toggleRow(log.id)}>
                                                <td className="text-slate-400 sticky-col z-10 bg-inherit hidden sm:table-cell">
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </td>
                                                <td className="text-slate-600 dark:text-slate-300 font-medium">
                                                    {new Date(log.changed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </td>
                                                <td>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{log.user_name || 'System / Deleted User'}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{log.user_email || '—'}</div>
                                                </td>
                                                <td>
                                                    <span className={`badge border-transparent ${ACTION_COLORS[log.action]}`}>{log.action}</span>
                                                </td>
                                                <td className="font-medium text-slate-600 dark:text-slate-300">
                                                    {formatTableName(log.table_name)}
                                                </td>
                                                <td className="text-slate-700 dark:text-slate-300">
                                                    {log.description}
                                                </td>
                                            </tr>

                                            {/* Expandable Details Row */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/50">
                                                    <td colSpan={6} className="p-0">
                                                        <div className="px-4 sm:px-12 py-4 animate-in slide-in-from-top-2 fade-in duration-200 whitespace-normal">
                                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Technical Context</h4>
                                                                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200/60 dark:border-slate-700 font-mono text-xs space-y-2 break-all">
                                                                            <p><span className="text-slate-500">Log ID:</span> {log.id}</p>
                                                                            <p><span className="text-slate-500">Record ID:</span> {log.record_id || '—'}</p>
                                                                            <p><span className="text-slate-500">Target Field:</span> {log.field_name || '—'}</p>
                                                                            <p><span className="text-slate-500">IP Address:</span> {log.ip_address || '—'}</p>
                                                                        </div>
                                                                    </div>
                                                                    {log.notes && (
                                                                        <div>
                                                                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">System Notes</h4>
                                                                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200/60 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                                                                {log.notes}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Old Value (Pre-Action)</h4>
                                                                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 border border-slate-200/60 dark:border-slate-700 h-full overflow-x-auto text-slate-700 dark:text-slate-300">
                                                                        {renderRawJsonSafe(log.old_value)}
                                                                    </div>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">New Value (Post-Action)</h4>
                                                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200/60 dark:border-slate-700 shadow-sm h-full overflow-x-auto text-slate-700 dark:text-slate-300 font-medium">
                                                                        {renderRawJsonSafe(log.new_value)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination & Footer toggles */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">

                {/* Archive Toggle Link */}
                <div>
                    <button
                        onClick={() => {
                            setArchiveMode(!archiveMode);
                            setPage(1);
                        }}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
                    >
                        {archiveMode ? <Clock className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        {archiveMode ? 'Return to Current Audit Logs' : 'View Archived Logs (> 12 Months)'}
                    </button>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <button
                            className="px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            Previous
                        </button>
                        <span className="px-3 text-sm font-medium text-slate-600 dark:text-slate-300 border-x border-slate-200 dark:border-slate-700">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className="px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
