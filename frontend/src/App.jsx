import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Patients from './pages/Patients.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Samples from './pages/Samples.jsx';
import SampleDetail from './pages/SampleDetail.jsx';
import TestCatalog from './pages/TestCatalog.jsx';
import ReportPage from './pages/ReportPage.jsx';
import AuditLog from './pages/AuditLog.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Settings from './pages/Settings.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoicePrint from './pages/InvoicePrint.jsx';
import Ledger from './pages/Ledger.jsx';
import PatientPortal from './pages/PatientPortal.jsx';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();
    const toastShown = useRef(false);

    useEffect(() => {
        if (!loading && user && roles && !roles.includes(user.role) && !toastShown.current) {
            toastShown.current = true;
            toast.error('Access Denied — you do not have permission to view that page.');
        }
    }, [loading, user, roles]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading Accu Trace Labs...</p>
            </div>
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
    return children;
}

function AppRoutes() {
    const { user } = useAuth();
    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="patients" element={<ProtectedRoute roles={['admin', 'pathologist']}><Patients /></ProtectedRoute>} />
                <Route path="patients/:id" element={<ProtectedRoute roles={['admin', 'pathologist']}><PatientDetail /></ProtectedRoute>} />
                <Route path="samples" element={<Samples />} />
                <Route path="samples/:id" element={<SampleDetail />} />
                <Route path="tests" element={<ProtectedRoute roles={['admin']}><TestCatalog /></ProtectedRoute>} />
                <Route path="report/:sampleId" element={<ProtectedRoute roles={['admin', 'pathologist']}><ReportPage /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />
                <Route path="invoices" element={<ProtectedRoute roles={['admin']}><Invoices /></ProtectedRoute>} />
                <Route path="invoices/:id/print" element={<ProtectedRoute roles={['admin']}><InvoicePrint /></ProtectedRoute>} />
                <Route path="ledger" element={<ProtectedRoute roles={['admin']}><Ledger /></ProtectedRoute>} />
                <Route path="audit" element={<ProtectedRoute roles={['admin']}><AuditLog /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
            </Route>
            <Route path="/portal/:token" element={<PatientPortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </ThemeProvider>
    );
}
