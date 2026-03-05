import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Plus, Edit2, Trash2, X, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';

const EMPTY = { name: '', email: '', password: '', role: 'technician', is_active: true };

function UserModal({ user, onClose, onSaved }) {
    const [form, setForm] = useState(user ? { ...user, password: '' } : EMPTY);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (user) await usersAPI.update(user.id, form);
            else await usersAPI.create(form);
            toast.success(user ? 'User updated' : 'User created');
            onSaved();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal max-w-md w-full">
                <div className="modal-header">
                    <h2 className="text-lg font-semibold">{user ? 'Edit User' : 'Add User'}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="label">Full Name *</label>
                        <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label">Email *</label>
                        <input type="email" className="input" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label">Password {user ? '(leave blank to keep)' : '*'}</label>
                        <input type="password" className="input" required={!user} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label">Role *</label>
                        <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                            <option value="admin">Admin</option>
                            <option value="technician">Technician</option>
                            <option value="pathologist">Pathologist</option>
                        </select>
                    </div>
                    {user && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                            <span>Active</span>
                        </label>
                    )}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto justify-center">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto justify-center">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {user ? 'Update' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DeleteModal({ user, onClose, onConfirm, loading }) {
    if (!user) return null;
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal max-w-sm w-full">
                <div className="modal-header">
                    <h2 className="text-lg font-semibold text-rose-600">Delete User?</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6">
                    <p className="text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete <span className="font-bold">{user.name}</span>? This action cannot be undone.
                    </p>
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
                        <button onClick={onClose} disabled={loading} className="btn-secondary w-full sm:w-auto justify-center">Cancel</button>
                        <button onClick={() => onConfirm(user.id)} disabled={loading} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center w-full sm:w-auto gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function UserManagement() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { const { data } = await usersAPI.list(); setUsers(data); }
        catch { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        setDeleteLoading(true);
        try {
            await usersAPI.remove(id);
            toast.success('User deleted successfully');
            setUserToDelete(null);
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete user');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">User Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{users.length} user{users.length !== 1 ? 's' : ''}</p>
                </div>
                <button id="add-user-btn" onClick={() => setModal('new')} className="btn-primary w-full sm:w-auto justify-center min-h-[44px]">
                    <Plus className="w-4 h-4" /> Add User
                </button>
            </div>

            <div className="card p-0">
                {loading ? (
                    <div className="flex items-center justify-center p-12"><LabLoader text="Loading Users" /></div>
                ) : (
                    <div className="table-container">
                        <table className="table whitespace-nowrap">
                            <thead><tr>
                                <th className="sticky-col">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th>
                            </tr></thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td className="sticky-col">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                                                    {u.name?.charAt(0)}
                                                </div>
                                                <span className="font-medium text-slate-800 dark:text-slate-200">{u.name}</span>
                                                {u.id === currentUser.id && <span className="text-xs text-slate-400">(you)</span>}
                                            </div>
                                        </td>
                                        <td className="text-slate-500 dark:text-slate-400">{u.email}</td>
                                        <td><span className={`badge-${u.role}`}>{u.role}</span></td>
                                        <td>
                                            {u.is_active
                                                ? <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-transparent dark:border-emerald-500/20">Active</span>
                                                : <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400 border border-transparent dark:border-slate-500/20">Inactive</span>}
                                        </td>
                                        <td className="text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setModal(u)} className="btn-ghost text-xs"><Edit2 className="w-3 h-3" /> Edit</button>
                                                {u.id !== currentUser.id && (
                                                    <button onClick={() => setUserToDelete(u)} className="btn-ghost text-xs text-red-500 hover:text-red-700">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modal && (
                <UserModal
                    user={modal === 'new' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}

            {userToDelete && (
                <DeleteModal
                    user={userToDelete}
                    onClose={() => setUserToDelete(null)}
                    onConfirm={handleDelete}
                    loading={deleteLoading}
                />
            )}
        </div>
    );
}
