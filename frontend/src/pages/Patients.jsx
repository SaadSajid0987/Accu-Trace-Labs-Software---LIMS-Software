import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { patientsAPI, samplesAPI } from '../api/index.js';
import { Plus, Search, User, ChevronRight, Loader2, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const EMPTY_FORM = { name: '', age: '', gender: 'Male', phone: '', cnic: '', referring_doctor: '', guardian_name: '' };

function PatientModal({ patient, onClose, onSaved, onDeleted }) {
    const { user } = useAuth();
    const [form, setForm] = useState(patient ? { 
        name: patient.name, 
        age: patient.age, 
        gender: patient.gender, 
        phone: patient.phone, 
        cnic: patient.cnic, 
        referring_doctor: patient.referring_doctor, 
        guardian_name: patient.guardian_name 
    } : EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (patient) await patientsAPI.update(patient.id, form);
            else await patientsAPI.create(form);
            toast.success(patient ? 'Patient updated' : 'Patient registered');
            onSaved();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed');
        } finally { setLoading(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await patientsAPI.delete(patient.id);
            toast.success('Patient deleted permanently');
            setShowDeleteConfirm(false);
            if (onDeleted) onDeleted();
            else onSaved();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Delete failed');
        } finally { setDeleting(false); }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal max-w-lg w-full">
                <div className="modal-header">
                    <h2 className="text-lg font-semibold">{patient ? 'Edit Patient' : 'Register Patient'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="label">Full Name *</label>
                            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">S/O or W/O</label>
                            <input className="input" value={form.guardian_name || ''} onChange={e => setForm(p => ({ ...p, guardian_name: e.target.value }))} placeholder="e.g. Muhammad Sajid" />
                        </div>
                        <div>
                            <label className="label">Age</label>
                            <input type="number" className="input" min="0" max="150" value={form.age || ''} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} placeholder="e.g. 25" />
                        </div>
                        <div>
                            <label className="label">Gender</label>
                            <select className="input" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                                <option>Male</option><option>Female</option><option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Phone</label>
                            <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+92-300-..." />
                        </div>

                        <div>
                            <label className="label">CNIC Number</label>
                            <input className="input" value={form.cnic || ''} onChange={e => setForm(p => ({ ...p, cnic: e.target.value }))} placeholder="12345-1234567-1" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Referring Doctor</label>
                            <input className="input" value={form.referring_doctor || ''} onChange={e => setForm(p => ({ ...p, referring_doctor: e.target.value }))} placeholder="e.g. Dr. Muhammad Ahmed" />
                        </div>

                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <div>
                            {patient && user.role === 'admin' && (
                                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                                    Delete Patient
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {patient ? 'Update' : 'Register Patient'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 w-full max-w-md p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-1">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Patient</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Are you sure you want to permanently delete <strong className="text-slate-700 dark:text-slate-300">{patient.name}</strong> and all their records? This cannot be undone.
                                </p>
                            </div>
                            <div className="flex w-full gap-3 pt-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Delete Permanently
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Patients() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | 'new' | patient
    const [stats, setStats] = useState({ total: 0, newThisMonth: 0, activeSamples: 0, totalTests: 0 });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [patientsData, allPatientsObj, allSamplesObj] = await Promise.all([
                patientsAPI.list({ search, limit: 50 }),
                patientsAPI.list({ limit: 10000 }),
                samplesAPI.list({ limit: 10000 })
            ]);

            setPatients(patientsData.data.patients);
            setTotal(patientsData.data.total);

            const allP = allPatientsObj.data.patients || [];
            const allS = allSamplesObj.data.samples || [];

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const newThisMonth = allP.filter(p => {
                if (!p.created_at) return false;
                const d = new Date(p.created_at);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            }).length;

            const activePatientIds = new Set(
                allS.filter(s => s.status === 'Registered' || s.status === 'In Progress').map(s => s.patient_id)
            );

            let totalTests = 0;
            allS.forEach(s => {
                if (Array.isArray(s.tests)) {
                    totalTests += s.tests.length;
                }
            });

            setStats({
                total: allPatientsObj.data.total || allP.length,
                newThisMonth,
                activeSamples: activePatientIds.size,
                totalTests
            });

        } catch { toast.error('Failed to load patients'); }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Patients</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{total} patient{total !== 1 ? 's' : ''} in database</p>
                </div>
                <button id="register-patient-btn" onClick={() => setModal('new')} className="btn-primary w-full sm:w-auto justify-center min-h-[44px]">
                    <Plus className="w-4 h-4" /> Register Patient
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-0 overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800/80 group">
                    <div className="h-1 w-full bg-[#4f8ef7]"></div>
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Patients</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.total}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Registered</p>
                    </div>
                </div>
                <div className="card p-0 overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800/80 group">
                    <div className="h-1 w-full bg-[#00d4aa]"></div>
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">New This Month</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.newThisMonth}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">This month</p>
                    </div>
                </div>
                <div className="card p-0 overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800/80 group">
                    <div className="h-1 w-full bg-[#fbbf24]"></div>
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Samples</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.activeSamples}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">With open samples</p>
                    </div>
                </div>
                <div className="card p-0 overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800/80 group">
                    <div className="h-1 w-full bg-[#a78bfa]"></div>
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Tests Ordered</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalTests}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">All time</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    className="input pl-9"
                    placeholder="Search name, ID, phone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="card p-0">
                {loading ? (
                    <div className="flex items-center justify-center p-12"><LabLoader text="Loading Patients" /></div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No patients found</p>
                        <button onClick={() => setModal('new')} className="btn-primary mt-4">Register First Patient</button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead><tr>
                                <th>Patient ID</th><th className="sticky-col">Name</th><th>Age/Gender</th><th>Phone</th><th>Registered</th><th></th>
                            </tr></thead>
                            <tbody>
                                {patients.map(p => {
                                    return (
                                        <tr key={p.id}>
                                            <td><span className="font-mono text-[13px] text-slate-800 dark:text-slate-200 font-medium">{p.patient_id}</span></td>
                                            <td className="sticky-col"><div className="font-medium text-slate-800 dark:text-slate-200">{p.name}</div></td>
                                            <td className="text-sm">{p.age !== null && p.age !== undefined ? `${p.age}yr` : '—'} / {p.gender || '—'}</td>
                                            <td className="text-sm">{p.phone || '—'}</td>
                                            <td className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setModal(p)} className="btn-ghost text-xs">Edit</button>
                                                    <Link to={`/patients/${p.id}`} className="btn-ghost text-xs">
                                                        View <ChevronRight className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modal && (
                <PatientModal
                    patient={modal === 'new' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                    onDeleted={() => { setModal(null); load(); navigate('/patients'); }}
                />
            )}
        </div>
    );
}
