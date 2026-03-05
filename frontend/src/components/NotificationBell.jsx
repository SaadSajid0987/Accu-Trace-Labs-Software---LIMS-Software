import { useState, useEffect, useRef } from 'react';
import { Bell, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { notificationsAPI } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function NotificationBell() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Only Admin and Pathologist should see this
    if (!['admin', 'pathologist'].includes(user?.role)) return null;

    const fetchNotifications = async () => {
        try {
            const { data } = await notificationsAPI.list();
            setNotifications(data);
        } catch (err) {
            console.error('Failed to fetch notifications');
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds for new alerts
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleMarkAllRead = async () => {
        setLoading(true);
        try {
            await notificationsAPI.markAllRead();
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            toast.success('All notifications marked as read');
        } catch (err) {
            toast.error('Failed to mark read');
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            try {
                await notificationsAPI.markRead(notification.id);
                setNotifications(notifications.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            } catch (err) {
                console.error(err);
            }
        }
        setIsOpen(false);
        if (notification.reference_type === 'Sample') {
            navigate(`/samples/${notification.reference_id}`);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
            >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[100] overflow-hidden animate-in fade-in zoom-in-95 origin-bottom-left">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={loading}
                                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 hover:underline flex items-center gap-1"
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                                <Bell className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                No notifications
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 flex gap-3
                                            ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}
                                    >
                                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 
                                            ${n.type === 'AbnormalResult' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-blue-100 text-blue-600'}`}>
                                            {n.type === 'AbnormalResult' ? <AlertTriangle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className={`text-sm ${!n.is_read ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-slate-300'} line-clamp-2 leading-snug`}>
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-semibold tracking-wider">
                                                {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
