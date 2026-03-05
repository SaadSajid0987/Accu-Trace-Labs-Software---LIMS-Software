import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { authAPI, labSettingsAPI, emailSettingsAPI } from '../api/index.js';
import { Loader2, Upload, Building2, Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';

export default function Settings() {
    const { user, updateUser } = useAuth();

    const [profile, setProfile] = useState({
        email: user?.email || '',
        displayName: user?.name || '',
    });

    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    // Lab Settings
    const [lab, setLab] = useState({ lab_name: '', tagline: '', address: '', phone1: '', phone2: '', phone3: '', email: '', license_number: '' });
    const [labLogo, setLabLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [labLoading, setLabLoading] = useState(true);
    const [labSaving, setLabSaving] = useState(false);

    // Email Settings
    const [emailSettings, setEmailSettings] = useState({ recipient_email: '', daily_enabled: false, weekly_enabled: false });
    const [emailLoading, setEmailLoading] = useState(true);
    const [emailSaving, setEmailSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            labSettingsAPI.get(),
            emailSettingsAPI.get().catch(() => ({ data: {} })) // Fail gracefully if not admin
        ]).then(([labRes, emailRes]) => {
            const data = labRes.data;
            setLab({
                lab_name: data.lab_name || '',
                tagline: data.tagline || '',
                address: data.address || '',
                phone1: data.phone1 || '',
                phone2: data.phone2 || '',
                phone3: data.phone3 || '',
                email: data.email || '',
                license_number: data.license_number || '',
            });
            if (data.lab_logo) setLogoPreview(data.lab_logo);

            if (emailRes.data && emailRes.data.id) {
                setEmailSettings({
                    recipient_email: emailRes.data.recipient_email || '',
                    daily_enabled: emailRes.data.daily_enabled || false,
                    weekly_enabled: emailRes.data.weekly_enabled || false
                });
            }
        }).catch(() => { }).finally(() => {
            setLabLoading(false);
            setEmailLoading(false);
        });
    }, []);

    const handleSaveProfile = async () => {
        try {
            const res = await authAPI.updateProfile({ name: profile.displayName, email: profile.email });
            updateUser(res.data);
            toast.success("Profile settings saved successfully");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save profile");
        }
    };

    const handleChangePassword = async () => {
        if (!passwords.newPassword || !passwords.confirmPassword) {
            toast.error("Please fill in both password fields");
            return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        try {
            await authAPI.updatePassword({ newPassword: passwords.newPassword });
            toast.success("Password changed successfully");
            setPasswords({ newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to change password");
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLabLogo(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleSaveLab = async () => {
        setLabSaving(true);
        try {
            // Upload logo first if changed
            if (labLogo) {
                const fd = new FormData();
                fd.append('logo', labLogo);
                const { data } = await labSettingsAPI.uploadLogo(fd);
                setLogoPreview(data.lab_logo);
                setLabLogo(null);
            }
            await labSettingsAPI.update(lab);
            toast.success("Lab profile saved successfully");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save lab settings");
        } finally { setLabSaving(false); }
    };

    const handleSaveEmailSettings = async () => {
        setEmailSaving(true);
        try {
            await emailSettingsAPI.update(emailSettings);
            toast.success("Email settings saved successfully");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save email settings");
        } finally { setEmailSaving(false); }
    };

    const handleTestEmail = async () => {
        if (!emailSettings.recipient_email) {
            toast.error("Please provide a recipient email");
            return;
        }
        const promise = emailSettingsAPI.test({ recipient_email: emailSettings.recipient_email });
        toast.promise(promise, {
            loading: 'Sending test email...',
            success: (r) => {
                if (r.data?.previewUrl) {
                    console.log("Test URL: ", r.data.previewUrl);
                    window.open(r.data.previewUrl, '_blank');
                    return "Test email preview generated (opens in new tab)";
                }
                return "Test email sent successfully";
            },
            error: 'Failed to send test email'
        });
    };

    const inputClass = "w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] transition-colors duration-300">
            <div className="max-w-4xl mx-auto py-12 px-6">

                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Manage your account settings</p>
                </div>

                <div className="space-y-8">
                    {/* Profile Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors duration-300">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Profile</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Update your display name and email</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Display Name</label>
                                <input
                                    type="text"
                                    value={profile.displayName}
                                    onChange={(e) => setProfile(p => ({ ...p, displayName: e.target.value }))}
                                    className={`${inputClass} font-medium`}
                                    placeholder="Enter your display name"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handleSaveProfile}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm justify-center flex"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors duration-300">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Change Password</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Update your account password</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                                <input
                                    type="password"
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Enter new password"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handleChangePassword}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm justify-center flex"
                                >
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lab Profile Section */}
                    {user?.role === 'admin' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors duration-300">
                            <div className="mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Lab Profile</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Configure your lab branding for invoices and reports</p>
                                </div>
                            </div>

                            {labLoading ? (
                                <div className="flex justify-center py-8"><LabLoader text="Loading Settings" /></div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Logo Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lab Logo</label>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                            {logoPreview ? (
                                                <img src={logoPreview.startsWith('blob:') ? logoPreview : `http://localhost:3001${logoPreview}`} alt="Lab Logo" className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700 object-contain bg-white dark:bg-slate-900 top-1 p-1 shrink-0" />
                                            ) : (
                                                <div className="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center">
                                                    <Upload className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                                                </div>
                                            )}
                                            <label className="cursor-pointer text-center w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors">
                                                Choose Image
                                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lab Name *</label>
                                            <input className={inputClass} value={lab.lab_name} onChange={e => setLab(l => ({ ...l, lab_name: e.target.value }))} placeholder="e.g. Accu Trace Labs" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tagline / Slogan</label>
                                            <input className={inputClass} value={lab.tagline} onChange={e => setLab(l => ({ ...l, tagline: e.target.value }))} placeholder="Optional" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Address</label>
                                        <input className={inputClass} value={lab.address} onChange={e => setLab(l => ({ ...l, address: e.target.value }))} placeholder="Full lab address" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone 1</label>
                                            <input className={inputClass} value={lab.phone1} onChange={e => setLab(l => ({ ...l, phone1: e.target.value }))} placeholder="+92 300 1234567" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone 2</label>
                                            <input className={inputClass} value={lab.phone2} onChange={e => setLab(l => ({ ...l, phone2: e.target.value }))} placeholder="Optional" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone 3</label>
                                            <input className={inputClass} value={lab.phone3} onChange={e => setLab(l => ({ ...l, phone3: e.target.value }))} placeholder="Optional" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                                            <input type="email" className={inputClass} value={lab.email} onChange={e => setLab(l => ({ ...l, email: e.target.value }))} placeholder="info@lab.com" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Registration / License Number</label>
                                            <input className={inputClass} value={lab.license_number} onChange={e => setLab(l => ({ ...l, license_number: e.target.value }))} placeholder="License #" />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button onClick={handleSaveLab} disabled={labSaving} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center sm:justify-start gap-2">
                                            {labSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                            Save Lab Profile
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Email Settings Section */}
                    {user?.role === 'admin' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors duration-300">
                            <div className="mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Automated Summary Emails</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Configure daily and weekly lab summary reports</p>
                                </div>
                            </div>

                            {emailLoading ? (
                                <div className="flex justify-center py-8"><LabLoader text="Loading Email Settings" /></div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Recipient Email Address</label>
                                        <input
                                            type="email"
                                            className={inputClass}
                                            value={emailSettings.recipient_email}
                                            onChange={e => setEmailSettings(s => ({ ...s, recipient_email: e.target.value }))}
                                            placeholder="admin@example.com"
                                        />
                                        <p className="mt-2 text-xs font-medium tracking-wide max-w-lg text-slate-500">
                                            The summary reports will be sent to this email address. A valid SMTP configuration is required in backend environment variables.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <label className="flex items-center gap-3 group w-max cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={emailSettings.daily_enabled}
                                                onChange={e => setEmailSettings(s => ({ ...s, daily_enabled: e.target.checked }))}
                                                className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-900 transition-colors"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                Enable Daily Summary
                                                <span className="block text-xs font-normal text-slate-500 mt-0.5">Sent every day at 08:00 AM</span>
                                            </span>
                                        </label>

                                        <label className="flex items-center gap-3 group w-max cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={emailSettings.weekly_enabled}
                                                onChange={e => setEmailSettings(s => ({ ...s, weekly_enabled: e.target.checked }))}
                                                className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-900 transition-colors"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                Enable Weekly Summary
                                                <span className="block text-xs font-normal text-slate-500 mt-0.5">Sent every Monday at 08:00 AM</span>
                                            </span>
                                        </label>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <button
                                            onClick={handleSaveEmailSettings}
                                            disabled={emailSaving}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center sm:justify-start gap-2"
                                        >
                                            {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                            Save Preferences
                                        </button>
                                        <button
                                            onClick={handleTestEmail}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-white dark:bg-slate-900 text-slate-700 border border-slate-200 dark:border-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center sm:justify-start gap-2"
                                        >
                                            <Send className="w-4 h-4 text-slate-400" />
                                            Send Test Email
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
