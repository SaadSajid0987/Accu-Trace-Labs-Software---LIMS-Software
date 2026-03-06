import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { samplesAPI, patientsAPI, testsAPI } from '../api/index.js';
import { Plus, Search, Filter, Loader2, X, ChevronRight, TestTube2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext.jsx';
import LabLoader from '../components/LabLoader.jsx';

const STATUSES = ['All', 'Registered', 'In Progress', 'Completed'];

function NewSampleModal({ onClose, onSaved }) {
    const { user } = useAuth();
    const [patients, setPatients] = useState([]);
    const [tests, setTests] = useState([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [testSearch, setTestSearch] = useState('');
    const [form, setForm] = useState({ patient_id: '', test_ids: [], priority: 'Routine', notes: '' });
    const [loading, setLoading] = useState(false);

    // Invoice fields
    const [discountAmount, setDiscountAmount] = useState('');
    const [discountReason, setDiscountReason] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [amountPaid, setAmountPaid] = useState('');

    useEffect(() => {
        Promise.all([
            patientsAPI.list({ search: patientSearch, limit: 20 }),
            testsAPI.list(),
        ]).then(([p, t]) => {
            setPatients(p.data.patients);
            setTests(t.data);
        });
    }, [patientSearch]);

    const toggleTest = (id) => setForm(f => ({
        ...f, test_ids: f.test_ids.includes(id) ? f.test_ids.filter(x => x !== id) : [...f.test_ids, id]
    }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.patient_id) return toast.error('Select a patient');
        if (form.test_ids.length === 0) return toast.error('Select at least one test');
        setLoading(true);
        try {
            const discPercent = Math.min(100, Math.max(0, parseFloat(discountAmount) || 0));
            const calcDiscount = Math.round(subtotal * discPercent / 100);
            await samplesAPI.create({
                ...form,
                discount_amount: calcDiscount,
                discount_reason: discountReason ? `${discPercent}% — ${discountReason}` : `${discPercent}%`,
                payment_method: paymentMethod,
                amount_paid: parseFloat(amountPaid) || 0,
            });
            toast.success('Sample order & invoice created');
            onSaved();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed');
        } finally { setLoading(false); }
    };

    // Real-time invoice calculations
    const selectedTests = tests.filter(t => form.test_ids.includes(t.id));
    const subtotal = selectedTests.reduce((s, t) => s + parseFloat(t.price || 0), 0);
    const discPercent = Math.min(100, Math.max(0, parseFloat(discountAmount) || 0));
    const disc = Math.round(subtotal * discPercent / 100);
    const netPayable = Math.max(0, subtotal - disc);
    const paid = parseFloat(amountPaid) || 0;
    const balanceDue = Math.max(0, netPayable - paid);
    const paymentStatus = paid <= 0 ? 'Unpaid' : paid >= netPayable ? 'Paid' : 'Partial';
    const statusColors = { Unpaid: 'bg-red-50 text-red-700 border-red-200', Partial: 'bg-amber-50 text-amber-700 border-amber-200', Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal max-w-2xl w-full max-h-[92vh] overflow-y-auto">
                <div className="modal-header">
                    <h2 className="text-lg font-semibold">New Sample Order</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Patient search */}
                    <div>
                        <label className="label">Patient *</label>
                        <input className="input mb-2" placeholder="Search by name, ID, or phone..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
                        {patients.length > 0 && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white dark:bg-slate-800 shadow-sm">
                                {patients.map(p => (
                                    <button type="button" key={p.id}
                                        className={`w-full flex items-center justify-between text-left px-4 py-2.5 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${form.patient_id === p.id ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                        onClick={() => setForm(f => ({ ...f, patient_id: p.id }))}
                                    >
                                        <div>
                                            <div className={`font-semibold text-sm ${form.patient_id === p.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{p.name}</div>
                                            <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.patient_id}</div>
                                        </div>
                                        {p.phone && <div className="text-xs text-slate-400 dark:text-slate-500 tracking-wide">{p.phone}</div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tests */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="label mb-0">Tests *</label>
                        </div>
                        <input
                            className="input mb-3"
                            placeholder="Search tests..."
                            value={testSearch}
                            onChange={e => setTestSearch(e.target.value)}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">

                            {(() => {
                                const filteredTests = tests.filter(t => t.name.toLowerCase().includes(testSearch.toLowerCase()));
                                const panels = filteredTests.filter(t => t.type === 'Panel' || !t.type);
                                const individuals = filteredTests.filter(t => t.type === 'Individual');

                                return (
                                    <>
                                        {panels.length > 0 && (
                                            <div className="col-span-1 sm:col-span-2 mt-1">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Test Panels</h4>
                                            </div>
                                        )}
                                        {panels.map(t => (
                                            <label key={t.id} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${form.test_ids.includes(t.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/50' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                                <input type="checkbox" checked={form.test_ids.includes(t.id)} onChange={() => toggleTest(t.id)} className="mt-0.5" />
                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium ${form.test_ids.includes(t.id) ? 'text-blue-900 dark:text-blue-100' : 'text-slate-800 dark:text-slate-200'}`}>{t.name}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 rounded">{t.components?.length || 0} components</span>
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">PKR {parseFloat(t.price).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}

                                        {individuals.length > 0 && (
                                            <div className="col-span-1 sm:col-span-2 mt-3">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Individual Tests</h4>
                                            </div>
                                        )}
                                        {individuals.map(t => (
                                            <label key={t.id} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${form.test_ids.includes(t.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/50' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                                <input type="checkbox" checked={form.test_ids.includes(t.id)} onChange={() => toggleTest(t.id)} className="mt-0.5" />
                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium ${form.test_ids.includes(t.id) ? 'text-blue-900 dark:text-blue-100' : 'text-slate-800 dark:text-slate-200'}`}>{t.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{t.category}</span>
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">•</span>
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">PKR {parseFloat(t.price).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Priority</label>
                            <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                <option>Routine</option><option>Urgent</option><option>STAT</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Notes</label>
                            <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional..." />
                        </div>
                    </div>

                    {/* ── Invoice Preview ── */}
                    {form.test_ids.length > 0 && (
                        <div className="border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Invoice Preview</h3>

                            {/* Itemized tests */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead><tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700"><th className="py-1.5 px-3 text-left text-slate-500 dark:text-slate-400 font-semibold">Test</th><th className="py-1.5 px-3 text-right text-slate-500 dark:text-slate-400 font-semibold">Price</th></tr></thead>
                                    <tbody>
                                        {selectedTests.map(t => (
                                            <tr key={t.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                                                <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">{t.name}</td>
                                                <td className="py-1.5 px-3 text-right font-medium text-slate-800 dark:text-slate-200">PKR {parseFloat(t.price).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Adjustments row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Discount (%)</label>
                                    <input type="number" min="0" max="100" className="input text-xs py-1.5" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Discount Reason</label>
                                    <input className="input text-xs py-1.5" value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="Optional" />
                                </div>
                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Payment Method</label>
                                        <select className="input text-xs py-1.5" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option>Cash</option><option>Card</option><option>Bank Transfer</option><option>Online</option></select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount Paid (PKR)</label>
                                        <input type="number" min="0" className="input text-xs py-1.5" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0" />
                                    </div>
                                </div>
                            </div>

                            {/* Summary box */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-3 space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Subtotal</span><span>PKR {subtotal.toLocaleString()}</span></div>
                                {disc > 0 && <div className="flex justify-between text-red-500 dark:text-red-400"><span>Discount ({discPercent}%)</span><span>- PKR {disc.toLocaleString()}</span></div>}
                                <div className="flex justify-between text-slate-800 dark:text-slate-200 font-bold pt-1 border-t border-slate-100 dark:border-slate-700"><span>Net Payable</span><span>PKR {netPayable.toLocaleString()}</span></div>
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-500 pt-1"><span>Amount Paid</span><span className="font-medium">PKR {paid.toLocaleString()}</span></div>
                                <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-700 mt-1">
                                    <span className="text-slate-500 dark:text-slate-400">Balance Due</span>
                                    <div className="text-right">
                                        <span className="font-bold text-slate-800 dark:text-slate-200 block">PKR {balanceDue.toLocaleString()}</span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-[10px] font-bold uppercase border ${statusColors[paymentStatus]} dark:bg-opacity-10 dark:border-opacity-20`}>
                                            {paymentStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create Order
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Samples() {
    const [samples, setSamples] = useState([]);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { search, limit: 50 };
            if (statusFilter !== 'All') params.status = statusFilter;
            const { data } = await samplesAPI.list(params);
            setSamples(data.samples);
            setTotal(data.total);
        } catch { toast.error('Failed to load samples'); }
        finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Samples</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{total} sample order{total !== 1 ? 's' : ''}</p>
                </div>
                <button id="new-sample-btn" onClick={() => setShowModal(true)} className="btn-primary w-full sm:w-auto justify-center min-h-[44px]">
                    <Plus className="w-4 h-4" /> New Sample
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className="input pl-9 w-full sm:w-64" placeholder="Search sample, patient..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 w-full sm:w-auto">
                    {STATUSES.map(s => (
                        <button key={s}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all flex-1 sm:flex-none ${statusFilter === s ? 'bg-blue-600 text-white shadow dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            onClick={() => setStatusFilter(s)}
                        >{s}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card p-0">
                {loading ? (
                    <div className="flex items-center justify-center p-12"><LabLoader text="Loading Samples" /></div>
                ) : samples.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <TestTube2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No samples found</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead><tr>
                                <th className="sticky-col">Sample ID</th><th>Patient</th><th>Tests</th><th>Priority</th><th>Status</th><th>Date</th><th></th>
                            </tr></thead>
                            <tbody>
                                {samples.map(s => (
                                    <tr key={s.id}>
                                        <td className="sticky-col"><span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">{s.sample_id}</span></td>
                                        <td>
                                            <div className="font-medium text-slate-800 dark:text-slate-200">{s.patient_name}</div>
                                            <div className="text-xs text-slate-400">{s.patient_ref}</div>
                                        </td>
                                        <td className="text-xs text-slate-500 max-w-[180px] truncate">
                                            {Array.isArray(s.tests) ? s.tests.filter(Boolean).join(', ') : '—'}
                                        </td>
                                        <td>
                                            {s.priority === 'STAT' && <span className="badge badge-priority-stat">STAT</span>}
                                            {s.priority === 'Urgent' && <span className="badge badge-priority-urgent">Urgent</span>}
                                            {s.priority === 'Routine' && <span className="badge badge-priority-routine">Routine</span>}
                                        </td>
                                        <td>
                                            {s.is_verified ? (
                                                <span className="badge badge-verified">Verified</span>
                                            ) : (
                                                <span className={`badge badge-${s.status?.toLowerCase().replace(/ /g, '-')}`}>{s.status}</span>
                                            )}
                                        </td>
                                        <td className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <Link to={`/samples/${s.id}`} className="btn-ghost text-xs">
                                                Open <ChevronRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && <NewSampleModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
        </div>
    );
}
