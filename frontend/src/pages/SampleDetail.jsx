import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { samplesAPI } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ArrowLeft, Save, CheckCircle2, ShieldCheck, Loader2, AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';

function ResultRow({ component, sampleTestId, value, isAbnormal, onChange, disabled }) {
    const hasNormalRange = component.normal_min !== null || component.normal_max !== null || component.normal_text;
    const normalDisplay = component.normal_text || (component.normal_min !== null && component.normal_max !== null
        ? `${component.normal_min} – ${component.normal_max}` : '');

    return (
        <tr className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
            <td className="sticky-col px-5 py-4 font-medium text-slate-700 dark:text-slate-300">{component.component_name}</td>
            <td className="px-5 py-4">
                <input
                    className={`w-full px-3 py-1.5 rounded-md border text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50
                    ${isAbnormal
                            ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-900 dark:text-red-200 focus:ring-red-200 dark:focus:ring-red-500/30'
                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500'}`}
                    value={value || ''}
                    onChange={e => onChange(sampleTestId, component.id, e.target.value)}
                    placeholder="Text result"
                    disabled={disabled}
                />
            </td>
            <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">{component.unit || '—'}</td>
            <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">{normalDisplay || '—'}</td>
            <td className="px-5 py-4">
                {isAbnormal && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-semibold">
                        <AlertTriangle className="w-3 h-3" /> ABNORMAL
                    </span>
                )}
            </td>
        </tr>
    );
}

const WORKFLOW_STEPS = ['Registered', 'In Progress', 'Completed'];

export default function SampleDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sample, setSample] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [results, setResults] = useState({});
    const [collapsed, setCollapsed] = useState({});
    const [progress, setProgress] = useState({ total: 0, filled: 0 });
    const [notes, setNotes] = useState('');
    const [remarks, setRemarks] = useState('');
    const [showConfirmComplete, setShowConfirmComplete] = useState(false);

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await samplesAPI.get(id);
            setSample(data);
            setProgress(data.progress || { total: 0, filled: 0 });
            setNotes(data.notes || '');
            setRemarks(data.remarks || '');

            const init = {};
            data.tests?.forEach(t => {
                t.components?.forEach(c => {
                    if (c.value !== null && c.value !== undefined) {
                        init[`${t.sample_test_id}_${c.id}`] = c.value;
                    }
                });
            });
            setResults(init);
        } catch { toast.error('Sample not found'); }
        finally { if (!silent) setLoading(false); }
    };

    useEffect(() => { load(); }, [id]);

    const handleChange = (stId, compId, val) => {
        setResults(r => ({ ...r, [`${stId}_${compId}`]: val }));
    };

    const saveResults = async () => {
        setSaving(true);
        try {
            const payload = {
                results: [],
                notes: notes,
                remarks: remarks
            };
            sample.tests?.forEach(t => {
                t.components?.forEach(c => {
                    const key = `${t.sample_test_id}_${c.id}`;
                    if (results[key] !== undefined) {
                        payload.results.push({ sample_test_id: t.sample_test_id, component_id: c.id, value: results[key] });
                    }
                });
            });
            const { data } = await samplesAPI.saveResults(id, payload);
            if (data.progress) setProgress(data.progress);
            toast.success('Results saved');
            load(true);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Save failed');
        } finally { setSaving(false); }
    };

    const markComplete = async () => {
        try {
            await samplesAPI.updateStatus(id, 'Completed');
            toast.success('Sample marked as Completed');
            setShowConfirmComplete(false);
            load(true);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    const editResults = async () => {
        try {
            await samplesAPI.updateStatus(id, 'In Progress');
            toast.success('Sample reverted to In Progress for editing');
            load(true);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    const verifySample = async () => {
        try {
            await samplesAPI.verify(id);
            toast.success(sample.is_verified ? 'Verification removed' : 'Sample verified');
            load(true);
        } catch (err) { toast.error(err.response?.data?.error || 'Verification failed'); }
    };

    if (loading) return <LabLoader text="Loading Details" />;
    if (!sample) return <div className="p-6 text-slate-500">Sample not found.</div>;

    const canEnterResults = ['admin', 'technician'].includes(user.role) && ['Registered', 'In Progress'].includes(sample.status);
    const canVerify = ['admin', 'pathologist'].includes(user.role) && sample.status === 'Completed';
    const canComplete = ['admin', 'technician'].includes(user.role) && ['Registered', 'In Progress'].includes(sample.status);

    const currentIdx = WORKFLOW_STEPS.indexOf(sample.status);

    // Formatting dates
    const createdDate = new Date(sample.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const verifiedDate = sample.verified_at ? new Date(sample.verified_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">

            {/* Top Navigation */}
            <div>
                <button onClick={() => navigate('/samples')} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Samples
                </button>
            </div>

            {/* Title Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{sample.sample_id}</h1>

                        {sample.priority === 'Urgent' || sample.priority === 'STAT' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded shadow-sm">
                                <Flag className="w-3 h-3" /> {sample.priority}
                            </span>
                        ) : null}

                        {sample.is_verified && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded shadow-sm">
                                <ShieldCheck className="w-3 h-3" /> Verified
                            </span>
                        )}
                        {!sample.is_verified && sample.status === 'Completed' && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 dark:bg-emerald-600 lg text-white text-xs font-bold rounded shadow-sm">
                                Completed
                            </span>
                        )}
                    </div>

                    <div className="text-sm text-slate-500 dark:text-slate-400 space-y-0.5 mt-2">
                        <p>Created {createdDate}</p>
                        {sample.is_verified && (
                            <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <span className="text-xs">✓</span> Verified by {sample.verified_by_name} on {verifiedDate}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {sample.status === 'Completed' && (
                        <Link to={`/report/${id}`} className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-sm font-semibold rounded-lg shadow-sm transition-colors text-center inline-block">
                            View Report
                        </Link>
                    )}

                    {canEnterResults && (
                        <button onClick={saveResults} disabled={saving} className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
                        </button>
                    )}

                    {canComplete && progress.filled > 0 && (
                        <button onClick={() => setShowConfirmComplete(true)} className="px-4 py-2 bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
                            Mark as Complete
                        </button>
                    )}

                    {sample.status === 'Completed' && ['admin', 'technician'].includes(user.role) && !sample.is_verified && (
                        <button onClick={editResults} className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg shadow-sm transition-colors">
                            Edit Results
                        </button>
                    )}

                    {canVerify && (
                        <button onClick={verifySample} className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 
                            ${sample.is_verified
                                ? 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
                                : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white'}`}>
                            {sample.is_verified ? 'Remove Verification' : 'Verify'}
                        </button>
                    )}
                </div>
            </div>

            {/* Workflow Progress Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 sm:p-8">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-8">Workflow Progress</h3>

                <div className="relative flex items-center justify-between max-w-3xl mx-auto px-2 sm:px-12">
                    {/* Thin connecting blue line background */}
                    <div className="absolute top-4 left-6 right-6 sm:left-10 sm:right-10 h-[2px] bg-slate-200 dark:bg-slate-700 -z-0"></div>

                    {/* Active connecting line */}
                    <div
                        className="absolute top-4 left-6 sm:left-10 h-[2px] bg-blue-600 dark:bg-blue-500 -z-0 transition-all duration-500"
                        style={{ width: currentIdx > 0 ? (currentIdx === 1 ? '50%' : 'calc(100% - 1.5rem)') : '0%' }}
                    ></div>

                    {WORKFLOW_STEPS.map((s, i) => {
                        const isReached = i <= currentIdx;
                        return (
                            <div key={s} className="flex flex-col items-center relative z-10 bg-white dark:bg-slate-800 px-2 transition-colors">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300
                                  ${isReached ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'}`}>
                                    <CheckCircle2 className={`w-5 h-5 ${isReached ? 'opacity-100' : 'opacity-0'}`} />
                                </div>
                                <span className={`absolute top-10 text-xs sm:text-sm font-semibold whitespace-nowrap
                                    ${isReached ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {s}
                                </span>
                            </div>
                        );
                    })}
                </div>
                {/* Spacer for absolute positioned labels */}
                <div className="h-6"></div>
            </div>

            {/* Patient & Visit Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">Patient & Visit</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 text-sm gap-y-4 gap-x-8">
                    <div className="flex gap-2">
                        <span className="text-slate-500 dark:text-slate-400 w-24">Patient:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{sample.patient_name}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-slate-500 dark:text-slate-400 w-24">Patient ID:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{sample.patient_ref}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-slate-500 dark:text-slate-400 w-24">Visit Date:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{createdDate}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-slate-500 dark:text-slate-400 w-24">Referring Dr:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{sample.referring_doctor || '—'}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-slate-500 dark:text-slate-400 w-24">Gender/DOB:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{sample.gender || '—'} · {sample.dob ? new Date(sample.dob).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-slate-500 dark:text-slate-400 w-24">CNIC:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{sample.cnic || '—'}</span>
                    </div>
                </div>
            </div>

            {/* Notes & Remarks Entry Cards */}
            {(canEnterResults || notes || remarks) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 space-y-3 flex flex-col">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Findings</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Clinical findings printed on the final patient laboratory report.</p>
                        {canEnterResults ? (
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex-1 w-full min-h-[100px] p-3 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-colors resize-y"
                                placeholder="Enter clinical findings for the patient here..."
                            />
                        ) : (
                            <p className="flex-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 whitespace-pre-wrap">{notes || 'No findings'}</p>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 space-y-3 flex flex-col">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">Pathologist Remarks <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 text-[10px] rounded uppercase font-bold tracking-wider">Public</span></h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Official remarks printed on the final patient laboratory report.</p>
                        {canEnterResults ? (
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="flex-1 w-full min-h-[100px] p-3 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-colors resize-y"
                                placeholder="Enter clinical remarks for the patient here..."
                            />
                        ) : (
                            <p className="flex-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 whitespace-pre-wrap">{remarks || 'No clinical remarks'}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Results Cards */}
            <div className="space-y-4">
                {sample.tests?.map(test => {
                    const filledCount = test.components?.filter(c => {
                        const val = results[`${test.sample_test_id}_${c.id}`];
                        return val !== undefined && val !== '';
                    }).length || 0;
                    const totalCount = test.components?.length || 0;
                    const isOpen = !collapsed[test.sample_test_id];
                    const testPct = totalCount > 0 ? (filledCount / totalCount) * 100 : 0;

                    return (
                        <div key={test.sample_test_id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                            <button
                                className="w-full flex flex-col justify-center px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative"
                                onClick={() => setCollapsed(c => ({ ...c, [test.sample_test_id]: !c[test.sample_test_id] }))}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{test.test_name}</h3>
                                        <div className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/50 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/50">
                                            {filledCount}/{totalCount} entered
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300" style={{ width: `${testPct}%` }} />
                                </div>
                            </button>

                            {isOpen && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left min-w-[600px]">
                                        <thead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/50">
                                            <tr>
                                                <th className="sticky-col px-5 py-4 w-1/3">Component</th>
                                                <th className="px-5 py-4 w-1/4">Value</th>
                                                <th className="px-5 py-4">Unit</th>
                                                <th className="px-5 py-4">Normal Range</th>
                                                <th className="px-5 py-4">Flag</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {test.components?.map(c => {
                                                const key = `${test.sample_test_id}_${c.id}`;
                                                const currentVal = results[key] !== undefined ? results[key] : (c.value || '');

                                                let isAbn = false;
                                                const num = parseFloat(currentVal);
                                                if (currentVal !== '' && !isNaN(num)) {
                                                    if (c.normal_min !== null && num < parseFloat(c.normal_min)) isAbn = true;
                                                    if (c.normal_max !== null && num > parseFloat(c.normal_max)) isAbn = true;
                                                } else if (c.normal_text && currentVal && currentVal.toLowerCase() !== c.normal_text.toLowerCase()) {
                                                    isAbn = true;
                                                }
                                                return (
                                                    <ResultRow
                                                        key={c.id}
                                                        component={c}
                                                        sampleTestId={test.sample_test_id}
                                                        value={currentVal}
                                                        isAbnormal={isAbn}
                                                        onChange={handleChange}
                                                        disabled={!canEnterResults}
                                                    />
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Custom Confirm Modal */}
            {showConfirmComplete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-1">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Mark as Completed</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Are you sure everything is correct? This will mark the sample as completed and prepare it for final verification.
                                </p>
                            </div>
                            <div className="flex w-full gap-3 pt-4">
                                <button
                                    onClick={() => setShowConfirmComplete(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg transition-colors border border-transparent"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={markComplete}
                                    className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors border border-transparent"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
