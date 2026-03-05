import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import {
    LayoutDashboard, Users, FlaskConical, TestTube2, ClipboardList,
    LogOut, User, Shield, FileText, ChevronRight, Activity, Settings, Moon, Sun, BookOpen, Menu, X
} from 'lucide-react';
import NotificationBell from './NotificationBell.jsx';

const NAV_ITEMS = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'technician', 'pathologist'], exact: true },
    { to: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'pathologist'] },
    { to: '/samples', label: 'Samples', icon: TestTube2, roles: ['admin', 'technician', 'pathologist'] },
    { to: '/tests', label: 'Test Catalog', icon: FlaskConical, roles: ['admin'] },
    { to: '/invoices', label: 'Invoices', icon: FileText, roles: ['admin'] },
    { to: '/ledger', label: 'Ledger', icon: BookOpen, roles: ['admin'] },
    { separator: true, label: 'Administration', roles: ['admin'] },
    { to: '/users', label: 'User Management', icon: User, roles: ['admin'] },
    { to: '/audit', label: 'Audit Log', icon: ClipboardList, roles: ['admin'] },
];

const ROLE_COLORS = {
    admin: 'bg-red-500/20 text-red-300',
    technician: 'bg-blue-500/20 text-blue-300',
    pathologist: 'bg-purple-500/20 text-purple-300',
};

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = () => { logout(); navigate('/login'); };

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const visibleItems = NAV_ITEMS.filter(item =>
        !item.roles || item.roles.includes(user?.role)
    );

    return (
        <div className="flex h-screen overflow-hidden relative">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 lg:static w-64 flex-shrink-0 bg-slate-50/95 dark:bg-[#0b1015]/95 backdrop-blur-3xl flex flex-col border-r border-slate-200/60 dark:border-white/5 z-50 lg:z-20 shadow-2xl lg:shadow-[4px_0_24px_-10px_rgba(0,0,0,0.1)] dark:shadow-none transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo & Close (Mobile) */}
                <div className="p-6 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between lg:block">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20 dark:border-white/10">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-slate-800 dark:text-white font-black text-lg tracking-tight leading-none">Accu Trace Labs</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-bold tracking-widest text-[10px] mt-1 uppercase">LIMS v1.0</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {visibleItems.map((item, i) => {
                        if (item.separator) return (
                            <div key={i} className="pt-6 pb-2 px-3">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{item.label}</p>
                            </div>
                        );
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.exact}
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `sidebar-link group relative overflow-hidden ${isActive ? ' active' : ''}`
                                }
                            >
                                <Icon className="w-4 h-4 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                <span className="z-10 relative">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Theme Toggle Button */}
                <div className="p-4">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50 rounded-xl transition-all shadow-sm hover:shadow-md group"
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        <span className="text-slate-600 dark:text-slate-300 text-sm font-bold group-hover:text-slate-900 shadow-sm dark:group-hover:text-white transition-colors">
                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </span>
                        {theme === 'light' ? (
                            <Moon className="w-4 h-4 text-slate-500 group-hover:text-indigo-500 transition-colors" />
                        ) : (
                            <Sun className="w-4 h-4 text-amber-500 transition-colors" />
                        )}
                    </button>
                </div>

                {/* User footer */}
                <div className="p-4 border-t border-slate-200/50 dark:border-white/5 relative flex items-center gap-2" ref={dropdownRef}>

                    <NotificationBell />

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute bottom-full left-4 z-50 mb-2 w-[calc(100%-32px)] bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 py-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                            {user?.role === 'admin' && (
                                <button
                                    onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <Settings className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                                    Settings
                                </button>
                            )}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                                <LogOut className="w-4 h-4 text-rose-500 opacity-70" />
                                Sign out
                            </button>
                        </div>
                    )}

                    {/* Profile Toggle */}
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors group text-left border border-transparent dark:border-transparent min-w-0"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-white/50 dark:border-slate-600">
                            <span className="text-slate-700 dark:text-white text-sm font-black">
                                {user?.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-800 dark:text-white font-bold text-sm truncate leading-tight group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">{user?.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 mt-0.5 inline-block rounded font-black uppercase tracking-wider ${ROLE_COLORS[user?.role]}`}>
                                {user?.role}
                            </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-90' : ''}`} />
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-900 transition-colors duration-200 relative">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md border border-white/20">
                                <Activity className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-slate-800 dark:text-white font-black text-lg tracking-tight leading-none">Accu Trace</h1>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto w-full relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
