import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ol_user')); } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('ol_token');
        if (token) {
            authAPI.me()
                .then(r => { setUser(r.data); localStorage.setItem('ol_user', JSON.stringify(r.data)); })
                .catch(() => { localStorage.removeItem('ol_token'); localStorage.removeItem('ol_user'); setUser(null); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await authAPI.login({ email, password });
        localStorage.setItem('ol_token', data.token);
        localStorage.setItem('ol_user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('ol_token');
        localStorage.removeItem('ol_user');
        setUser(null);
    }, []);

    const updateUser = useCallback((userData) => {
        const updated = { ...user, ...userData };
        setUser(updated);
        localStorage.setItem('ol_user', JSON.stringify(updated));
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
