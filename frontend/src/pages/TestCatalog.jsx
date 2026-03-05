import { useState, useEffect, useCallback } from 'react';
import { testsAPI } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, X, Loader2, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';

const EMPTY_COMP = { component_name: '', unit: '', normal_min: '', normal_max: '', normal_text: '' };

function TestModal({ test, onClose, onSaved }) {
    const [form, setForm] = useState(test || { name: '', category: 'Biochemistry', price: '', turnaround_hours: 24, description: '', components: [{ ...EMPTY_COMP }] });
    const [loading, setLoading] = useState(false);

    const updateComp = (i, field, val) => setForm(f => {
        const comps = [...f.components];
        comps[i] = { ...comps[i], [field]: val };
        return { ...f, components: comps };
    });
    const addComp = () => setForm(f => ({ ...f, components: [...f.components, { ...EMPTY_COMP }] }));
    const removeComp = (i) => setForm(f => ({ ...f, components: f.components.filter((_, idx) => idx !== i) }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (test) await testsAPI.update(test.id, form);
            else await testsAPI.create(form);
            toast.success(test ? 'Test updated' : 'Test created');
            onSaved();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal max-w-2xl w-full">
                <div className="modal-header">
                    <h2 className="text-lg font-semibold">{test ? 'Edit Test' : 'Add New Test'}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="label">Test Name *</label>
                            <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                {['Hematology', 'Biochemistry', 'Serology', 'Urinalysis', 'Microbiology', 'Histopathology', 'Other'].map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Price (PKR)</label>
                            <input type="number" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                        </div>
                    </div>

                    {/* Components */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="label mb-0">Test Components / Parameters</label>
                            <button type="button" onClick={addComp} className="btn-ghost text-xs"><Plus className="w-3 h-3" /> Add Component</button>
                        </div>
                        <div className="space-y-2">
                            <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                                <span className="col-span-3">Component</span><span className="col-span-2">Unit</span>
                                <span className="col-span-2">Min</span><span className="col-span-2">Max</span>
                                <span className="col-span-2">Normal Text</span><span className="col-span-1"></span>
                            </div>
                            {form.components.map((c, i) => (
                                <div key={i} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 items-start sm:items-center relative bg-slate-50 sm:bg-transparent dark:bg-slate-800/50 sm:dark:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-slate-200 dark:border-slate-700">
                                    <div className="w-full sm:col-span-3">
                                        <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1 block">Component Name *</label>
                                        <input className="input text-xs" placeholder="e.g. Hemoglobin" value={c.component_name} onChange={e => updateComp(i, 'component_name', e.target.value)} required />
                                    </div>
                                    <div className="w-full sm:col-span-2">
                                        <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1 block">Unit</label>
                                        <input className="input text-xs" placeholder="g/dL" value={c.unit} onChange={e => updateComp(i, 'unit', e.target.value)} />
                                    </div>
                                    <div className="w-full sm:col-span-2">
                                        <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1 block">Min Value</label>
                                        <input type="number" className="input text-xs" placeholder="12.0" value={c.normal_min} onChange={e => updateComp(i, 'normal_min', e.target.value)} />
                                    </div>
                                    <div className="w-full sm:col-span-2">
                                        <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1 block">Max Value</label>
                                        <input type="number" className="input text-xs" placeholder="17.5" value={c.normal_max} onChange={e => updateComp(i, 'normal_max', e.target.value)} />
                                    </div>
                                    <div className="w-full sm:col-span-2">
                                        <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1 block">Normal Text</label>
                                        <input className="input text-xs" placeholder="Negative" value={c.normal_text} onChange={e => updateComp(i, 'normal_text', e.target.value)} />
                                    </div>
                                    <button type="button" onClick={() => removeComp(i)} className="sm:col-span-1 absolute sm:relative top-2 right-2 sm:top-auto sm:right-auto text-slate-400 hover:text-red-500 p-1 bg-white sm:bg-transparent dark:bg-slate-700 sm:dark:bg-transparent rounded sm:rounded-none border sm:border-0 border-slate-200 dark:border-transparent">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {test ? 'Update Test' : 'Create Test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function TestCatalog() {
    const { user } = useAuth();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [modal, setModal] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { const { data } = await testsAPI.list(); setTests(data); }
        catch { toast.error('Failed to load tests'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        if (!confirm('Deactivate this test?')) return;
        try { await testsAPI.remove(id); toast.success('Test deactivated'); load(); }
        catch { toast.error('Failed'); }
    };

    const byCategory = tests.reduce((acc, t) => {
        const cat = t.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(t);
        return acc;
    }, {});

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Test Catalog</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{tests.length} active test{tests.length !== 1 ? 's' : ''}</p>
                </div>
                {user.role === 'admin' && (
                    <button id="add-test-btn" onClick={() => setModal('new')} className="btn-primary w-full sm:w-auto justify-center min-h-[44px]">
                        <Plus className="w-4 h-4" /> Add Test
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12"><LabLoader text="Loading Tests" /></div>
            ) : (
                Object.entries(byCategory).map(([category, catTests]) => (
                    <div key={category}>
                        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{category}</h2>
                        <div className="space-y-2">
                            {catTests.map(test => (
                                <div key={test.id} className="card p-0 overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-4">
                                        <button
                                            className="flex items-start sm:items-center gap-3 text-left flex-1 min-w-0"
                                            onClick={() => setExpanded(e => ({ ...e, [test.id]: !e[test.id] }))}
                                        >
                                            <div className="w-8 h-8 shrink-0 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                                <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="min-w-0 flex-1 pr-2">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{test.name}</p>
                                                <p className="text-xs text-slate-400 truncate break-words whitespace-normal sm:whitespace-nowrap line-clamp-2 sm:line-clamp-none">
                                                    {test.components?.length || 0} prm · PKR {parseFloat(test.price || 0).toLocaleString()} · {test.turnaround_hours}h TAT
                                                </p>
                                            </div>
                                        </button>
                                        <div className="flex items-center shrink-0">
                                            {user.role === 'admin' && <>
                                                <button onClick={(e) => { e.stopPropagation(); setModal(test); }} className="btn-ghost text-xs p-1.5 sm:px-3 sm:py-1.5"><Edit2 className="w-4 h-4 sm:w-3 sm:h-3" /><span className="hidden sm:inline ml-1">Edit</span></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(test.id); }} className="btn-ghost text-xs text-red-500 hover:text-red-700 p-1.5 sm:px-3 sm:py-1.5"><Trash2 className="w-4 h-4 sm:w-3 sm:h-3" /></button>
                                            </>}
                                            <div onClick={(e) => { e.stopPropagation(); setExpanded(e_state => ({ ...e_state, [test.id]: !e_state[test.id] })); }} className="cursor-pointer ml-1 p-1">
                                                {expanded[test.id] ? <ChevronUp className="w-5 h-5 sm:w-4 sm:h-4 text-slate-400" /> : <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4 text-slate-400" />}
                                            </div>
                                        </div>
                                    </div>

                                    {expanded[test.id] && (
                                        <div className="border-t border-slate-100 dark:border-slate-700/50 table-container">
                                            <table className="table text-sm">
                                                <thead><tr>
                                                    <th>#</th><th className="sticky-col">Component</th><th>Unit</th><th>Normal Range</th>
                                                </tr></thead>
                                                <tbody>
                                                    {test.components?.map((c, i) => (
                                                        <tr key={c.id}>
                                                            <td className="text-slate-400 text-xs">{i + 1}</td>
                                                            <td className="sticky-col font-medium text-slate-800 dark:text-slate-200">{c.component_name}</td>
                                                            <td className="text-slate-500 dark:text-slate-400">{c.unit || '—'}</td>
                                                            <td className="text-slate-600 dark:text-slate-300">
                                                                {c.normal_text || (c.normal_min !== null && c.normal_max !== null
                                                                    ? `${c.normal_min} – ${c.normal_max}` : '—')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {modal && (
                <TestModal
                    test={modal === 'new' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
        </div>
    );
}
