import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { patientsAPI } from '../api/index.js';
import { ArrowLeft, Plus, User, Calendar, DollarSign, Activity, FileText, CheckCircle2 } from 'lucide-react';
import LabLoader from '../components/LabLoader.jsx';

export default function PatientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [timelineData, setTimelineData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            patientsAPI.get(id),
            patientsAPI.getTimeline(id)
        ])
            .then(([r1, r2]) => {
                setData(r1.data);
                setTimelineData(r2.data);
            })
            .catch(() => navigate('/patients'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <LabLoader text="Loading Patient Data" />;
    if (!data || !timelineData) return null;

    const { patient } = data;
    const { stats, timeline } = timelineData;
    const age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob)) / 31557600000) : null;

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="btn-ghost shrink-0"><ArrowLeft className="w-5 h-5" /></button>
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">{patient.name}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-mono truncate">{patient.patient_id}</p>
                </div>
            </div>

            {/* Top Summary Stats for Timeline */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg"><Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Visits</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalVisits}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg"><DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lifetime Spent</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">Rs {stats.totalSpent.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg"><Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">First Visit</p>
                    </div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{stats.firstVisit ? new Date(stats.firstVisit).toLocaleDateString() : '—'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg"><Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Visit</p>
                    </div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{stats.mostRecentVisit ? new Date(stats.mostRecentVisit).toLocaleDateString() : '—'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm col-span-2 md:col-span-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg"><FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Top Test</p>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2">{stats.mostOrderedTest || '—'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Patient Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/60 dark:border-white/5 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-bl-full pointer-events-none"></div>
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <User className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{patient.name}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{patient.gender || 'Unknown'} • {age !== null ? `${age} yrs` : 'Unknown Age'}</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { label: 'Patient ID', value: patient.patient_id, mono: true },
                                { label: 'CNIC', value: patient.cnic || '—', mono: true },
                                { label: 'Phone', value: patient.phone || '—' },
                                { label: 'Blood Group', value: patient.blood_group || '—' },
                                { label: 'Referring Doctor', value: patient.referring_doctor || 'Self' },
                                { label: 'Registered', value: new Date(patient.created_at).toLocaleDateString() },
                            ].map(({ label, value, mono }) => (
                                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 pb-0">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                                    <span className={`text-sm font-medium text-slate-800 dark:text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Lifetime Timeline */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">Patient History</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Chronological timeline of all visits</p>
                            </div>
                            <Link to={`/samples?patient_id=${patient.id}`} className="btn-primary text-sm py-2 px-4 shadow-sm w-full sm:w-auto justify-center min-h-[44px]">
                                <Plus className="w-4 h-4 mr-2" /> New Request
                            </Link>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            {timeline.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                                    <Activity className="w-12 h-12 opacity-20" />
                                    <p>No visit history found.</p>
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-slate-100 dark:border-slate-700/50 ml-4 space-y-10 py-2">
                                    {timeline.map((visit, idx) => (
                                        <div key={visit.sample_internal_id} className="relative pl-8 sm:pl-10">
                                            {/* Timeline Node */}
                                            <div className="absolute -left-[9px] top-1.5 w-4 h-4 bg-white dark:bg-slate-800 border-4 border-blue-500 rounded-full shadow-sm ring-4 ring-white dark:ring-slate-800"></div>

                                            {/* Visit Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                                <div>
                                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-600/50">
                                                        {new Date(visit.visit_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-3">
                                                        {new Date(visit.visit_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <Link to={`/samples/${visit.sample_internal_id}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium hover:underline flex items-center">
                                                    Open Sample <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                                                </Link>
                                            </div>

                                            {/* Visit Card */}
                                            <div className="bg-slate-50 dark:bg-[#0f1520] border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
                                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-slate-200/50 dark:border-slate-700/50 pb-4">
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-semibold">Sample ID</p>
                                                        <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{visit.sample_id}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-semibold">Status</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`badge badge-${visit.sample_status?.toLowerCase().replace(' ', '-')}`}>{visit.sample_status}</span>
                                                            {visit.is_verified && (
                                                                <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> VERIFIED BY {visit.verified_by_name?.toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-semibold">Invoice</p>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                            Rs {parseFloat(visit.invoice_amount || 0).toLocaleString()}
                                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${visit.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'}`}>
                                                                {visit.payment_status}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-semibold">Tests Ordered</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {visit.tests_ordered.length > 0 ? visit.tests_ordered.map((t, i) => (
                                                            <span key={i} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md font-medium shadow-sm">
                                                                {t}
                                                            </span>
                                                        )) : <span className="text-xs text-slate-400">None</span>}
                                                    </div>
                                                </div>

                                                {visit.results && visit.results.length > 0 && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-semibold">Key Results</p>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            {visit.results.map((r, i) => (
                                                                <div key={i} className={`p-2.5 rounded-lg border ${r.is_abnormal ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'} shadow-sm`}>
                                                                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mb-1" title={r.component}>{r.component}</p>
                                                                    <p className="text-sm font-bold whitespace-nowrap flex items-center gap-1.5">
                                                                        <span className={r.is_abnormal ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}>
                                                                            {r.value}
                                                                        </span>
                                                                        {r.unit && <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">{r.unit}</span>}
                                                                        {r.is_abnormal && <span className="text-[9px] bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ml-auto">Abnl</span>}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
