import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsAPI, samplesAPI, invoicesAPI } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Clock, Users, FlaskConical, AlertTriangle, AlertCircle, Activity, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import LabLoader from '../components/LabLoader.jsx';
import RevenueAnalytics from '../components/RevenueAnalytics.jsx';

function BentoCard({ title, subtitle, icon: Icon, iconColor = 'text-indigo-500', action, children, className = '' }) {
    return (
        <div className={`group relative overflow-hidden rounded-[2rem] border bg-white/40 p-6 sm:p-8 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl border-slate-200/60 dark:border-slate-700/50 dark:bg-slate-800/40 ${className}`}>
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-slate-100/50 blur-3xl transition-all duration-700 group-hover:scale-110 opacity-50 pointer-events-none dark:bg-slate-700/50" />
            <div className="relative z-10">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                <Icon className={`w-5 h-5 ${iconColor}`} />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight dark:text-slate-100">{title}</h2>
                            {subtitle && <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
                        </div>
                    </div>
                    {action && <div>{action}</div>}
                </div>
                {children}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none dark:via-slate-600/50" />
        </div>
    );
}

function ModernStatCard({ label, value, icon: Icon, theme = 'indigo' }) {
    const themeStyles = {
        indigo: {
            wrapper: 'bg-gradient-to-br from-indigo-500/5 via-indigo-500/5 to-indigo-500/10 border-indigo-500/10 hover:border-indigo-500/20 hover:shadow-indigo-500/10',
            iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
            value: 'text-indigo-950 dark:text-indigo-100',
            label: 'text-indigo-600/80 dark:text-indigo-400/80',
            glow: 'bg-indigo-500/20 dark:bg-indigo-500/10'
        },
        emerald: {
            wrapper: 'bg-gradient-to-br from-emerald-500/5 via-emerald-500/5 to-emerald-500/10 border-emerald-500/10 hover:border-emerald-500/20 hover:shadow-emerald-500/10',
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            value: 'text-emerald-950 dark:text-emerald-100',
            label: 'text-emerald-600/80 dark:text-emerald-400/80',
            glow: 'bg-emerald-500/20 dark:bg-emerald-500/10'
        },
        rose: {
            wrapper: 'bg-gradient-to-br from-rose-500/5 via-rose-500/5 to-rose-500/10 border-rose-500/10 hover:border-rose-500/20 hover:shadow-rose-500/10',
            iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
            value: 'text-rose-950 dark:text-rose-100',
            label: 'text-rose-600/80 dark:text-rose-400/80',
            glow: 'bg-rose-500/20 dark:bg-rose-500/10'
        },
        amber: {
            wrapper: 'bg-gradient-to-br from-amber-500/5 via-amber-500/5 to-amber-500/10 border-amber-500/10 hover:border-amber-500/20 hover:shadow-amber-500/10',
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            value: 'text-amber-950 dark:text-amber-100',
            label: 'text-amber-600/80 dark:text-amber-400/80',
            glow: 'bg-amber-500/20 dark:bg-amber-500/10'
        }
    };

    const current = themeStyles[theme];

    return (
        <div className={`group relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl bg-white/40 dark:bg-slate-800/40 dark:border-slate-700/50 ${current.wrapper}`}>
            {/* Decorative Glow */}
            <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-70 pointer-events-none ${current.glow}`} />

            <div className="relative z-10 flex items-start gap-5">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${current.iconBg}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-1.5 self-center">
                    <p className={`text-xs font-black uppercase tracking-[0.2em] ${current.label}`}>
                        {label}
                    </p>
                    <p className={`text-3xl sm:text-4xl font-black tracking-tight ${current.value}`}>
                        {value ?? '—'}
                    </p>
                </div>
            </div>

            {/* Bottom highlight */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
        </div>
    );
}

// Sort samples by urgency: STAT first, then Urgent, then Routine
function sortByUrgency(samples) {
    const priority = { 'STAT': 0, 'Urgent': 1, 'Routine': 2 };
    return [...samples].sort((a, b) => (priority[a.priority] ?? 2) - (priority[b.priority] ?? 2));
}

function SampleTable({ samples, title, subtitle, icon, iconColor, emptyText, showStatus = true }) {
    return (
        <BentoCard title={title} subtitle={subtitle} icon={icon} iconColor={iconColor}
            action={<Link to="/samples" className="text-sm text-indigo-600 dark:text-white hover:text-indigo-700 dark:hover:text-slate-200 font-bold flex items-center gap-1 transition-colors">View all <span aria-hidden="true">&rarr;</span></Link>}
        >
            {samples.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">{emptyText}</p>
            ) : (
                <div className="table-container mt-2 bg-transparent">
                    <table className="table w-full text-left bg-transparent shadow-none border-none">
                        <thead><tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                            <th className="pb-3 font-semibold px-2">Sample ID</th>
                            <th className="pb-3 font-semibold px-2">Patient</th>
                            <th className="pb-3 font-semibold px-2">Priority</th>
                            {showStatus && <th className="pb-3 font-semibold px-2">Status</th>}
                            <th className="pb-3 font-semibold px-2">Date</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {samples.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="py-3 px-2"><Link to={`/samples/${s.id}`} className="text-indigo-600 dark:text-white hover:underline font-mono text-xs font-bold">{s.sample_id}</Link></td>
                                    <td className="py-3 px-2"><div className="font-bold text-sm text-slate-800 dark:text-slate-100">{s.patient_name}</div><div className="text-xs text-slate-400 font-medium">{s.patient_ref}</div></td>
                                    <td className="py-3 px-2">
                                        {s.priority === 'STAT' && <span className="badge bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">STAT</span>}
                                        {s.priority === 'Urgent' && <span className="badge bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">Urgent</span>}
                                        {s.priority === 'Routine' && <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300">Routine</span>}
                                    </td>
                                    {showStatus && <td className="py-3 px-2"><span className={`badge badge-${s.status?.toLowerCase().replace(/ /g, '-')}`}>{s.status}</span>{s.is_verified && <span className="ml-1.5 text-emerald-600 text-xs font-bold">✓</span>}</td>}
                                    <td className="py-3 px-2 text-xs font-medium text-slate-400">{new Date(s.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </BentoCard>
    );
}

// ─── PATHOLOGIST DASHBOARD ───
function PathologistDashboard({ user }) {
    const [pendingVerification, setPendingVerification] = useState([]);
    const [recentCompleted, setRecentCompleted] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            samplesAPI.list({ status: 'Completed', limit: 20 }),
        ]).then(([completedRes]) => {
            const completed = completedRes.data.samples || [];
            setPendingVerification(sortByUrgency(completed.filter(s => !s.is_verified)));
            setRecentCompleted(sortByUrgency(completed.filter(s => s.is_verified)).slice(0, 10));
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LabLoader />;

    return (
        <div className="p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Welcome back, Dr. {user?.name?.split(' ')[0]} 🔬</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Samples awaiting your verification and sign-off.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <ModernStatCard label="Pending Verification" value={pendingVerification.length} icon={AlertCircle} theme="amber" />
                <ModernStatCard label="Verified Today" value={recentCompleted.length} icon={FlaskConical} theme="emerald" />
                <ModernStatCard label="Total Completed" value={pendingVerification.length + recentCompleted.length} icon={Activity} theme="indigo" />
            </div>

            <SampleTable
                samples={pendingVerification}
                title="Pending Verifications"
                subtitle="Completed samples awaiting your sign-off"
                icon={AlertCircle}
                iconColor="text-amber-500"
                emptyText="No samples pending verification. All caught up! ✅"
                showStatus={false}
            />

            <SampleTable
                samples={recentCompleted}
                title="Recently Verified"
                subtitle="Samples you've signed off on"
                icon={TrendingUp}
                iconColor="text-emerald-500"
                emptyText="No recently verified samples."
                showStatus={false}
            />
        </div>
    );
}

// ─── TECHNICIAN DASHBOARD ───
function TechnicianDashboard({ user }) {
    const [registered, setRegistered] = useState([]);
    const [inProgress, setInProgress] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            samplesAPI.list({ status: 'Registered', limit: 20 }),
            samplesAPI.list({ status: 'In Progress', limit: 20 }),
        ]).then(([regRes, ipRes]) => {
            setRegistered(sortByUrgency(regRes.data.samples || []));
            setInProgress(sortByUrgency(ipRes.data.samples || []));
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LabLoader />;

    return (
        <div className="p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Welcome back, {user?.name?.split(' ')[0]} 🧪</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Your lab worklist — samples waiting for results.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ModernStatCard label="New Samples" value={registered.length} icon={FlaskConical} theme="indigo" />
                <ModernStatCard label="In Progress" value={inProgress.length} icon={Clock} theme="amber" />
            </div>

            <SampleTable
                samples={registered}
                title="New Samples"
                subtitle="Registered samples waiting to be started"
                icon={FlaskConical}
                iconColor="text-indigo-500"
                emptyText="No new samples waiting. 🎉"
                showStatus={false}
            />

            <SampleTable
                samples={inProgress}
                title="In Progress"
                subtitle="Samples currently being worked on"
                icon={Clock}
                iconColor="text-amber-500"
                emptyText="No samples in progress."
                showStatus={false}
            />
        </div>
    );
}

// ─── ADMIN DASHBOARD ───
function AdminDashboard({ user }) {
    const [stats, setStats] = useState(null);
    const [invoiceStats, setInvoiceStats] = useState(null);
    const [recentSamples, setRecentSamples] = useState([]);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            reportsAPI.stats(),
            samplesAPI.list({ limit: 5 }),
            invoicesAPI.stats(),
            invoicesAPI.list({ limit: 5 })
        ]).then(([statsRes, samplesRes, invStatsRes, invListRes]) => {
            setStats(statsRes.data);
            setRecentSamples(samplesRes.data.samples);
            setInvoiceStats(invStatsRes.data);
            setRecentInvoices(invListRes.data.invoices);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LabLoader />;

    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Here's what's happening in the lab today.</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <ModernStatCard label="Total Patients" value={stats?.patients} icon={Users} theme="indigo" />
                <ModernStatCard label="Today's Samples" value={stats?.today_samples} icon={FlaskConical} theme="emerald" />
                <ModernStatCard label="Registered / In Progress" value={(stats?.Registered || 0) + (stats?.['In Progress'] || 0)} icon={Clock} theme="amber" />
                <ModernStatCard label="Abnormal Results" value={stats?.abnormal_results} icon={AlertTriangle} theme="rose" />
            </div>

            {/* Revenue Analytics Dashboard */}
            <RevenueAnalytics />

            {/* Status breakdown */}
            <BentoCard title="Sample Pipeline" subtitle="Real-time lab progress track" icon={Activity} iconColor="text-indigo-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Registered', 'In Progress', 'Completed'].map(status => (
                        <div key={status} className="group relative overflow-hidden flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-100 dark:border-slate-700/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 relative z-10 badge-${status.toLowerCase().replace(/ /g, '-')}`}>{status}</span>
                            <p className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mt-2 relative z-10 group-hover:scale-105 transition-transform">{stats?.[status] ?? 0}</p>
                        </div>
                    ))}
                    <div className="group relative overflow-hidden flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-emerald-50/50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-100 dark:border-emerald-800/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 relative z-10 text-emerald-700 dark:text-emerald-400">✓ Verified</span>
                        <p className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mt-2 relative z-10 group-hover:scale-105 transition-transform">{stats?.verified ?? 0}</p>
                    </div>
                </div>
            </BentoCard>

            {/* Recent Items Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <BentoCard title="Recent Samples" icon={TrendingUp} iconColor="text-indigo-500"
                    action={<Link to="/samples" className="text-sm text-indigo-600 dark:text-white hover:text-indigo-700 dark:hover:text-slate-200 font-bold flex items-center gap-1 transition-colors">View all <span aria-hidden="true">&rarr;</span></Link>}
                >
                    {recentSamples.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">No samples yet. <Link to="/samples" className="text-blue-600 dark:text-white">Create one</Link></p>
                    ) : (
                        <div className="table-container mt-2 bg-transparent">
                            <table className="table w-full text-left bg-transparent shadow-none border-none">
                                <thead><tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50"><th className="pb-3 font-semibold px-2">Sample ID</th><th className="pb-3 font-semibold px-2">Patient</th><th className="pb-3 font-semibold px-2">Status</th><th className="pb-3 font-semibold px-2">Date</th></tr></thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {recentSamples.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="py-3 px-2"><Link to={`/samples/${s.id}`} className="text-indigo-600 dark:text-white hover:underline font-mono text-xs font-bold">{s.sample_id}</Link></td>
                                            <td className="py-3 px-2"><div className="font-bold text-sm text-slate-800 dark:text-slate-100">{s.patient_name}</div><div className="text-xs text-slate-400 font-medium">{s.patient_ref}</div></td>
                                            <td className="py-3 px-2"><span className={`badge badge-${s.status?.toLowerCase().replace(/ /g, '-')}`}>{s.status}</span>{s.is_verified && <span className="ml-1.5 text-emerald-600 text-xs font-bold">✓</span>}</td>
                                            <td className="py-3 px-2 text-xs font-medium text-slate-400">{new Date(s.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </BentoCard>

                <BentoCard title="Recent Invoices" icon={Receipt} iconColor="text-emerald-500"
                    action={<Link to="/invoices" className="text-sm text-indigo-600 dark:text-white hover:text-indigo-700 dark:hover:text-slate-200 font-bold flex items-center gap-1 transition-colors">View all <span aria-hidden="true">&rarr;</span></Link>}
                >
                    {recentInvoices.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">No invoices yet.</p>
                    ) : (
                        <div className="table-container mt-2 bg-transparent">
                            <table className="table w-full text-left bg-transparent shadow-none border-none">
                                <thead><tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50"><th className="pb-3 font-semibold px-2">Invoice #</th><th className="pb-3 font-semibold px-2">Patient</th><th className="pb-3 font-semibold px-2">Amount</th><th className="pb-3 font-semibold px-2">Status</th></tr></thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {recentInvoices.map(i => (
                                        <tr key={i.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="py-3 px-2"><Link to="/invoices" className="text-indigo-600 dark:text-white hover:underline font-mono text-xs font-bold">{i.invoice_number}</Link></td>
                                            <td className="py-3 px-2"><div className="font-bold text-sm text-slate-800 dark:text-slate-100">{i.patient_name_snapshot}</div></td>
                                            <td className="py-3 px-2 text-sm font-black text-slate-700 dark:text-slate-300">Rs {parseFloat(i.net_payable).toLocaleString()}</td>
                                            <td className="py-3 px-2"><span className={`badge badge-${i.payment_status?.toLowerCase().replace(/ /g, '-')}`}>{i.payment_status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </BentoCard>
            </div>
        </div>
    );
}

// ─── MAIN DASHBOARD ROUTER ───
export default function Dashboard() {
    const { user } = useAuth();

    if (user?.role === 'pathologist') return <PathologistDashboard user={user} />;
    if (user?.role === 'technician') return <TechnicianDashboard user={user} />;
    return <AdminDashboard user={user} />;
}

