import React, { useState, useEffect, useCallback } from 'react';
import { testsAPI } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, X, Loader2, FlaskConical, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';

const EMPTY_COMP = { component_name: '', unit: '', normal_min: '', normal_max: '', normal_text: '' };

function TypeSelectionModal({ onSelect, onClose }) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal max-w-sm w-full p-6 text-center">
                <h2 className="text-xl font-bold mb-6">What type of test are you adding?</h2>
                <div className="flex flex-col gap-4">
                    <button onClick={() => onSelect('Panel')} className="btn-primary py-3 text-base justify-center">Panel</button>
                    <button onClick={() => onSelect('Individual')} className="btn-secondary py-3 text-base justify-center">Individual Test</button>
                </div>
                <button onClick={onClose} className="mt-6 text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
        </div>
    );
}

function TestModal({ test, type, onClose, onSaved }) {
    const isIndividual = type === 'Individual';

    const [form, setForm] = useState(() => {
        if (test) return { ...test };
        return {
            name: '', category: 'Biochemistry', price: '', turnaround_hours: 24, description: '', type,
            components: isIndividual ? [{ ...EMPTY_COMP }] : [{ ...EMPTY_COMP }]
        };
    });
    const [loading, setLoading] = useState(false);

    const indComp = form.components?.[0] || { ...EMPTY_COMP };

    const updateComp = (i, field, val) => setForm(f => {
        const comps = [...f.components];
        comps[i] = { ...comps[i], [field]: val };
        return { ...f, components: comps };
    });

    const setIndComp = (field, val) => {
        setForm(f => ({
            ...f,
            components: [{ ...(f.components?.[0] || {}), component_name: f.name, [field]: val }]
        }));
    };

    const handleNameChange = (e) => {
        const val = e.target.value;
        setForm(f => {
            const newF = { ...f, name: val };
            if (isIndividual) {
                newF.components = [{ ...(f.components?.[0] || {}), component_name: val }];
            }
            return newF;
        });
    };

    const addComp = () => setForm(f => ({ ...f, components: [...f.components, { ...EMPTY_COMP }] }));
    const removeComp = (i) => setForm(f => ({ ...f, components: f.components.filter((_, idx) => idx !== i) }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Ensure single component name is in sync for individual tests
            let dataToSubmit = { ...form };
            if (isIndividual) {
                dataToSubmit.components = [{ ...indComp, component_name: form.name }];
            }

            if (test) await testsAPI.update(test.id, dataToSubmit);
            else await testsAPI.create(dataToSubmit);

            toast.success(test ? 'Test updated' : 'Test created');
            onSaved();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal max-w-2xl w-full">
                <div className="modal-header">
                    <h2 className="text-lg font-semibold">{test ? `Edit ${type}` : `Add New ${type}`}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`${isIndividual ? 'md:col-span-1' : 'md:col-span-2'}`}>
                            <label className="label">Test Name *</label>
                            <input className="input" required value={form.name} onChange={handleNameChange} />
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
                        <div>
                            <label className="label">Turnaround (Hours)</label>
                            <input type="number" className="input" value={form.turnaround_hours} onChange={e => setForm(f => ({ ...f, turnaround_hours: e.target.value }))} />
                        </div>
                    </div>

                    {isIndividual ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Unit</label>
                                    <input className="input" placeholder="e.g. g/dL" value={indComp.unit} onChange={e => setIndComp('unit', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label">Min Value</label>
                                    <input type="number" className="input" placeholder="0.0" value={indComp.normal_min || ''} onChange={e => setIndComp('normal_min', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label">Max Value</label>
                                    <input type="number" className="input" placeholder="10.0" value={indComp.normal_max || ''} onChange={e => setIndComp('normal_max', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="label">Normal Text (e.g. Negative)</label>
                                <input className="input" placeholder="Negative" value={indComp.normal_text || ''} onChange={e => setIndComp('normal_text', e.target.value)} />
                            </div>
                        </>
                    ) : (
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
                                            <input className="input text-xs" placeholder="g/dL" value={c.unit || ''} onChange={e => updateComp(i, 'unit', e.target.value)} />
                                        </div>
                                        <div className="w-full sm:col-span-2">
                                            <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1 block">Min Value</label>
                                            <input type="number" className="input text-xs" placeholder="12.0" value={c.normal_min || ''} onChange={e => updateComp(i, 'normal_min', e.target.value)} />
                                        </div>
                                        <div className="w-full sm:col-span-2">
                                            <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1 block">Max Value</label>
                                            <input type="number" className="input text-xs" placeholder="17.5" value={c.normal_max || ''} onChange={e => updateComp(i, 'normal_max', e.target.value)} />
                                        </div>
                                        <div className="w-full sm:col-span-2">
                                            <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1 block">Normal Text</label>
                                            <input className="input text-xs" placeholder="Negative" value={c.normal_text || ''} onChange={e => updateComp(i, 'normal_text', e.target.value)} />
                                        </div>
                                        <button type="button" onClick={() => removeComp(i)} className="sm:col-span-1 absolute sm:relative top-2 right-2 sm:top-auto sm:right-auto text-slate-400 hover:text-red-500 p-1 bg-white sm:bg-transparent dark:bg-slate-700 sm:dark:bg-transparent rounded sm:rounded-none border sm:border-0 border-slate-200 dark:border-transparent">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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

    // modal can be: null, { type: 'TypeSelection' }, { type: 'Test', testType: 'Panel'|'Individual', test: testObj|null }
    const [modal, setModal] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try { const { data } = await testsAPI.list(); setTests(data); }
        catch { toast.error('Failed to load tests'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        if (!window.confirm('Deactivate this test?')) return;
        try { await testsAPI.remove(id); toast.success('Test deactivated'); load(); }
        catch { toast.error('Failed'); }
    };

    const filteredTests = tests.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const panels = filteredTests.filter(t => t.type === 'Panel' || !t.type); // fallback to Panel if missing
    const individuals = filteredTests.filter(t => t.type === 'Individual');

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Test Catalog</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{tests.length} active test{tests.length !== 1 ? 's' : ''}</p>
                </div>
                {user.role === 'admin' && (
                    <button id="add-test-btn" onClick={() => setModal({ type: 'TypeSelection' })} className="btn-primary w-full sm:w-auto justify-center min-h-[44px]">
                        <Plus className="w-4 h-4" /> Add Test
                    </button>
                )}
            </div>

            <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    className="input w-full pl-10"
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12"><LabLoader text="Loading Tests" /></div>
            ) : filteredTests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Search className="w-10 h-10 mb-3 text-slate-400 dark:text-slate-600 opacity-50" />
                    <p className="text-lg font-medium text-slate-600 dark:text-slate-300">No tests found</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* SECTION 1 - PANELS */}
                    {panels.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase">TEST PANELS ({panels.length})</h2>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th className="w-8"></th>
                                            <th className="whitespace-nowrap">Panel Name</th>
                                            <th>Category</th>
                                            <th>Components</th>
                                            <th>Price (PKR)</th>
                                            <th>Status</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {panels.map(p => (
                                            <React.Fragment key={p.id}>
                                                <tr className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}>
                                                    <td>{expanded[p.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</td>
                                                    <td className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</td>
                                                    <td className="text-slate-600 dark:text-slate-300">{p.category}</td>
                                                    <td className="text-slate-600 dark:text-slate-300"><span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">{p.components?.length || 0} components</span></td>
                                                    <td className="text-slate-600 dark:text-slate-300">{parseFloat(p.price || 0).toLocaleString()}</td>
                                                    <td><span className="text-green-600 dark:text-green-400 font-medium text-sm">Active</span></td>
                                                    <td className="text-right" onClick={e => e.stopPropagation()}>
                                                        {user.role === 'admin' && (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={() => setModal({ type: 'Test', testType: 'Panel', test: p })} className="btn-ghost p-1.5"><Edit2 className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDelete(p.id)} className="btn-ghost p-1.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                {expanded[p.id] && (
                                                    <tr>
                                                        <td colSpan="7" className="p-0 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20">
                                                            <div className="p-4 pl-12">
                                                                <table className="table text-sm bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                                                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                                        <tr>
                                                                            <th>#</th>
                                                                            <th>Component</th>
                                                                            <th>Unit</th>
                                                                            <th>Normal Range</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {p.components?.map((c, i) => (
                                                                            <tr key={c.id}>
                                                                                <td className="text-slate-400 text-xs">{i + 1}</td>
                                                                                <td className="font-medium text-slate-800 dark:text-slate-200">{c.component_name}</td>
                                                                                <td className="text-slate-500 dark:text-slate-400">{c.unit || '—'}</td>
                                                                                <td className="text-slate-600 dark:text-slate-300">
                                                                                    {c.normal_text || (c.normal_min !== null && c.normal_max !== null ? `${c.normal_min} – ${c.normal_max}` : '—')}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2 - INDIVIDUAL TESTS */}
                    {individuals.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 uppercase">INDIVIDUAL TESTS ({individuals.length})</h2>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Test Name</th>
                                            <th>Category</th>
                                            <th>Unit</th>
                                            <th>Normal Range</th>
                                            <th>Price (PKR)</th>
                                            <th>Status</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {individuals.map(t => {
                                            const comp = t.components?.[0] || {};
                                            return (
                                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="font-semibold text-slate-800 dark:text-slate-200">{t.name}</td>
                                                    <td className="text-slate-600 dark:text-slate-300">{t.category}</td>
                                                    <td className="text-slate-600 dark:text-slate-300">{comp.unit || '—'}</td>
                                                    <td className="text-slate-600 dark:text-slate-300">
                                                        {comp.normal_text || (comp.normal_min !== null && comp.normal_max !== null ? `${comp.normal_min} – ${comp.normal_max}` : '—')}
                                                    </td>
                                                    <td className="text-slate-600 dark:text-slate-300">{parseFloat(t.price || 0).toLocaleString()}</td>
                                                    <td><span className="text-green-600 dark:text-green-400 font-medium text-sm">Active</span></td>
                                                    <td className="text-right">
                                                        {user.role === 'admin' && (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={() => setModal({ type: 'Test', testType: 'Individual', test: t })} className="btn-ghost p-1.5"><Edit2 className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDelete(t.id)} className="btn-ghost p-1.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {modal?.type === 'TypeSelection' && (
                <TypeSelectionModal
                    onClose={() => setModal(null)}
                    onSelect={(type) => setModal({ type: 'Test', testType: type, test: null })}
                />
            )}

            {modal?.type === 'Test' && (
                <TestModal
                    type={modal.testType}
                    test={modal.test}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
        </div>
    );
}
