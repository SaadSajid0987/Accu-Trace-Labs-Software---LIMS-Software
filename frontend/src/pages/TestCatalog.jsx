import React, { useState, useEffect, useCallback } from 'react';
import { testsAPI } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, X, Loader2, FlaskConical, Search, Database, Layers, Activity, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';

const EMPTY_COMP = { component_name: '', unit: '', normal_min: '', normal_max: '', normal_text: '' };

const CATEGORY_COLORS = {
    'Biochemistry': { text: 'text-[#38bdf8]', bg: 'bg-[#38bdf8]/15', border: 'border-[#38bdf8]/50', hex: '#38bdf8', glow: 'shadow-[0_0_10px_rgba(56,189,248,0.4)]' },
    'Hematology': { text: 'text-[#f87171]', bg: 'bg-[#f87171]/15', border: 'border-[#f87171]/50', hex: '#f87171', glow: 'shadow-[0_0_10px_rgba(248,113,113,0.4)]' },
    'Serology': { text: 'text-[#a78bfa]', bg: 'bg-[#a78bfa]/15', border: 'border-[#a78bfa]/50', hex: '#a78bfa', glow: 'shadow-[0_0_10px_rgba(167,139,250,0.4)]' },
    'Immunology': { text: 'text-[#a78bfa]', bg: 'bg-[#a78bfa]/15', border: 'border-[#a78bfa]/50', hex: '#a78bfa', glow: 'shadow-[0_0_10px_rgba(167,139,250,0.4)]' },
    'Microbiology': { text: 'text-[#fb923c]', bg: 'bg-[#fb923c]/15', border: 'border-[#fb923c]/50', hex: '#fb923c', glow: 'shadow-[0_0_10px_rgba(251,146,60,0.4)]' },
    'Parasitology': { text: 'text-[#fb923c]', bg: 'bg-[#fb923c]/15', border: 'border-[#fb923c]/50', hex: '#fb923c', glow: 'shadow-[0_0_10px_rgba(251,146,60,0.4)]' },
    'Endocrinology': { text: 'text-[#34d399]', bg: 'bg-[#34d399]/15', border: 'border-[#34d399]/50', hex: '#34d399', glow: 'shadow-[0_0_10px_rgba(52,211,153,0.4)]' },
    'Pregnancy': { text: 'text-[#f472b6]', bg: 'bg-[#f472b6]/15', border: 'border-[#f472b6]/50', hex: '#f472b6', glow: 'shadow-[0_0_10px_rgba(244,114,182,0.4)]' },
    'Urinalysis': { text: 'text-[#f472b6]', bg: 'bg-[#f472b6]/15', border: 'border-[#f472b6]/50', hex: '#f472b6', glow: 'shadow-[0_0_10px_rgba(244,114,182,0.4)]' },
    'Other': { text: 'text-[#fbbf24]', bg: 'bg-[#fbbf24]/15', border: 'border-[#fbbf24]/50', hex: '#fbbf24', glow: 'shadow-[0_0_10px_rgba(251,191,36,0.4)]' }
};

const getCategoryColor = (cat) => {
    if (!cat) return CATEGORY_COLORS['Other'];
    const key = Object.keys(CATEGORY_COLORS).find(k => cat.includes(k));
    return key ? CATEGORY_COLORS[key] : CATEGORY_COLORS['Other'];
};

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
    const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');

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

    let filteredTests = tests.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (activeCategoryFilter !== 'All') {
        filteredTests = filteredTests.filter(t => {
            if (!t.category) return false;
            // Handle partial matching for 'Serology / Immunology' etc just in case
            return t.category.includes(activeCategoryFilter);
        });
    }

    const panels = filteredTests.filter(t => t.type === 'Panel' || !t.type); // fallback to Panel if missing
    const individuals = filteredTests.filter(t => t.type === 'Individual');

    // Stats calculations
    const statPanelsCount = tests.filter(t => t.type === 'Panel' || !t.type).length;
    const statIndivCount = tests.filter(t => t.type === 'Individual').length;
    const categoriesCount = new Set(tests.map(t => t.category).filter(Boolean)).size;
    const activeCount = tests.length;

    // Search filter shortcuts
    const filterShortcuts = ['All', 'Biochemistry', 'Hematology', 'Serology', 'Microbiology'];

    return (
        <div className="p-6 space-y-6">
            <style>{`
                @keyframes slideUpFade {
                    0% { opacity: 0; transform: translateY(15px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slideUpFade 0.3s ease-out forwards;
                    opacity: 0;
                }
            `}</style>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Test Catalog</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{tests.length} active test{tests.length !== 1 ? 's' : ''}</p>
                </div>
                {user.role === 'admin' && (
                    <button id="add-test-btn" onClick={() => setModal({ type: 'TypeSelection' })} className="btn-primary w-full sm:w-auto justify-center min-h-[44px] shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4" /> Add Test
                    </button>
                )}
            </div>

            {/* Enhancement 1 — Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Test Panels', count: statPanelsCount, colorMap: CATEGORY_COLORS['Hematology'], icon: <Layers className="w-5 h-5 opacity-70" /> },
                    { label: 'Individual Tests', count: statIndivCount, colorMap: CATEGORY_COLORS['Biochemistry'], icon: <FlaskConical className="w-5 h-5 opacity-70" /> },
                    { label: 'Categories', count: categoriesCount, colorMap: CATEGORY_COLORS['Serology'], icon: <Database className="w-5 h-5 opacity-70" /> },
                    { label: 'Active Tests', count: activeCount, colorMap: CATEGORY_COLORS['Endocrinology'], icon: <Activity className="w-5 h-5 opacity-70" /> }
                ].map((stat, i) => (
                    <div key={stat.label} className="card p-0 overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800/80 group">
                        <div className="h-1 w-full" style={{ backgroundColor: stat.colorMap.hex }}></div>
                        <div className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.count}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.colorMap.bg} ${stat.colorMap.text}`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Enhancement 5 — Search and Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
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
                <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar pt-1">
                    {filterShortcuts.map(f => {
                        const isActive = activeCategoryFilter === f;
                        return (
                            <button
                                key={f}
                                onClick={() => setActiveCategoryFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${isActive ? 'bg-[#00d4aa]/10 border-[#00d4aa] text-[#00d4aa]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                            >
                                {f}
                            </button>
                        );
                    })}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12"><LabLoader text="Loading Tests" /></div>
            ) : filteredTests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center card bg-white dark:bg-slate-800/50">
                    <Search className="w-12 h-12 mb-4 text-slate-400 dark:text-slate-600 opacity-50" />
                    <p className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-1">No tests found</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters or search term.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* SECTION 1 - PANELS */}
                    {panels.length > 0 && (
                        <div>
                            {/* Enhancement 6 — Section Headers */}
                            <div className="flex items-center gap-4 mb-5">
                                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wide">
                                    TEST PANELS
                                </h2>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700">
                                    {panels.length}
                                </span>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/80"></div>
                            </div>

                            <div className="space-y-3">
                                {panels.map((p, index) => {
                                    const cCol = getCategoryColor(p.category);
                                    const isExpanded = expanded[p.id];
                                    return (
                                        <div key={p.id} className={`card p-0 overflow-hidden transition-all duration-300 animate-slide-up hover:border-slate-300 dark:hover:border-slate-600 ${isExpanded ? `ring-1 ring-inset ${cCol.text.replace('text', 'ring')}` : ''}`} style={{ animationDelay: `${index * 40}ms` }}>
                                            <div
                                                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-700/20`}
                                                onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cCol.glow}`} style={{ backgroundColor: cCol.hex }}></div>

                                                    <div className="flex-1 min-w-0 pr-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate text-base">{p.name}</h3>
                                                        <div className="flex items-center gap-3 shrink-0 flex-wrap">
                                                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${cCol.bg} ${cCol.text} ${cCol.border}`}>
                                                                {p.category}
                                                            </span>
                                                            <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                                                                {p.components?.length || 0} components
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0">
                                                    <span className="font-mono font-medium text-[#00d4aa]">
                                                        PKR {parseFloat(p.price || 0).toLocaleString()}
                                                    </span>

                                                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-4 ml-2" onClick={e => e.stopPropagation()}>
                                                        {user.role === 'admin' && (
                                                            <>
                                                                <button onClick={() => setModal({ type: 'Test', testType: 'Panel', test: p })} className="btn-ghost p-1.5"><Edit2 className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDelete(p.id)} className="btn-ghost p-1.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setExpanded(v => ({ ...v, [p.id]: !v[p.id] })); }}
                                                            className="btn-ghost p-1.5 ml-1"
                                                        >
                                                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Panel Components Expanded View */}
                                            {isExpanded && (
                                                <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 p-5">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Parameters within this panel</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {p.components?.map(c => (
                                                            <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm group hover:border-transparent transition-colors" style={{ '--hover-color': cCol.hex }}>
                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 group-hover:dark:text-white transition-colors">{c.component_name}</span>
                                                                {(c.normal_text || (c.normal_min !== null && c.normal_max !== null)) && (
                                                                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                                                                )}
                                                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-600 group-hover:dark:text-slate-300">
                                                                    {c.normal_text || (c.normal_min !== null && c.normal_max !== null ? `${c.normal_min} – ${c.normal_max} ${c.unit || ''}` : '')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SECTION 2 - INDIVIDUAL TESTS */}
                    {individuals.length > 0 && (
                        <div>
                            {/* Enhancement 6 — Section Headers */}
                            <div className="flex items-center gap-4 mb-5">
                                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wide">
                                    INDIVIDUAL TESTS
                                </h2>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700">
                                    {individuals.length}
                                </span>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/80"></div>
                            </div>

                            <div className="card p-0 overflow-hidden animate-slide-up" style={{ animationDelay: `${panels.length * 40}ms` }}>
                                <div className="table-container border-0 rounded-none bg-transparent">
                                    <table className="table w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                                <th className="font-mono text-[10px] tracking-widest text-slate-500 uppercase py-3 px-5 border-b border-slate-200 dark:border-slate-700 text-left">Test Name</th>
                                                <th className="font-mono text-[10px] tracking-widest text-slate-500 uppercase py-3 px-5 border-b border-slate-200 dark:border-slate-700 text-left">Category</th>
                                                <th className="font-mono text-[10px] tracking-widest text-slate-500 uppercase py-3 px-5 border-b border-slate-200 dark:border-slate-700 text-left">Normal Range</th>
                                                <th className="font-mono text-[10px] tracking-widest text-slate-500 uppercase py-3 px-5 border-b border-slate-200 dark:border-slate-700 text-left">Price</th>
                                                <th className="font-mono text-[10px] tracking-widest text-slate-500 uppercase py-3 px-5 border-b border-slate-200 dark:border-slate-700 text-center">Status</th>
                                                <th className="font-mono text-[10px] tracking-widest text-slate-500 uppercase py-3 px-5 border-b border-slate-200 dark:border-slate-700 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {individuals.map((t, index) => {
                                                const comp = t.components?.[0] || {};
                                                const cCol = getCategoryColor(t.category);
                                                return (
                                                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                        <td className="py-3 px-5 whitespace-nowrap">
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{t.name}</span>
                                                        </td>
                                                        <td className="py-3 px-5 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide border ${cCol.text} ${cCol.bg} ${cCol.border}`}>
                                                                {t.category || 'Other'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-5 whitespace-nowrap">
                                                            <div className="font-mono text-xs text-slate-500 dark:text-slate-400 p-1 bg-slate-50 dark:bg-slate-800/50 rounded inline-block">
                                                                {comp.normal_text || (comp.normal_min !== null && comp.normal_max !== null ? `${comp.normal_min} – ${comp.normal_max} ${comp.unit || ''}` : '—')}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-5 whitespace-nowrap">
                                                            <span className="font-mono font-medium text-[#00d4aa]">
                                                                PKR {parseFloat(t.price || 0).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-5 whitespace-nowrap text-center">
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                </span>
                                                                Active
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-5 whitespace-nowrap text-right">
                                                            {user.role === 'admin' ? (
                                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => setModal({ type: 'Test', testType: 'Individual', test: t })} className="btn-ghost p-1.5"><Edit2 className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleDelete(t.id)} className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
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
