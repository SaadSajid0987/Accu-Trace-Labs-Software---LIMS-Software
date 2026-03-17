import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Attach token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ol_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('ol_token');
            localStorage.removeItem('ol_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default api;

// ---- Auth ----
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
    updatePassword: (data) => api.put('/auth/password', data),
};

// ---- Users ----
export const usersAPI = {
    list: () => api.get('/users'),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    remove: (id) => api.delete(`/users/${id}`),
};

// ---- Patients ----
export const patientsAPI = {
    list: (params) => api.get('/patients', { params }),
    get: (id) => api.get(`/patients/${id}`),
    getTimeline: (id) => api.get(`/patients/${id}/timeline`),
    create: (data) => api.post('/patients', data),
    update: (id, data) => api.put(`/patients/${id}`, data),
    delete: (id) => api.delete(`/patients/${id}`),
};

// ---- Tests ----
export const testsAPI = {
    list: () => api.get('/tests'),
    get: (id) => api.get(`/tests/${id}`),
    create: (data) => api.post('/tests', data),
    update: (id, data) => api.put(`/tests/${id}`, data),
    remove: (id) => api.delete(`/tests/${id}`),
};

// ---- Samples ----
export const samplesAPI = {
    list: (params) => api.get('/samples', { params }),
    get: (id) => api.get(`/samples/${id}`),
    create: (data) => api.post('/samples', data),
    updateStatus: (id, status) => api.put(`/samples/${id}/status`, { status }),
    saveResults: (id, payload) => api.post(`/samples/${id}/results`, payload),
    verify: (id) => api.put(`/samples/${id}/verify`),
};

// ---- Reports ----
export const reportsAPI = {
    get: (sampleId) => api.get(`/reports/${sampleId}`),
    stats: () => api.get('/reports/stats/dashboard'),
};

// ---- Audit ----
export const auditAPI = {
    list: (params) => api.get('/audit', { params }),
};

// ---- Lab Settings ----
export const labSettingsAPI = {
    get: () => api.get('/lab-settings'),
    update: (data) => api.put('/lab-settings', data),
    uploadLogo: (formData) => api.post('/lab-settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ---- Invoices ----
export const invoicesAPI = {
    list: (params) => api.get('/invoices', { params }),
    get: (id) => api.get(`/invoices/${id}`),
    updatePayment: (id, data) => api.put(`/invoices/${id}/payment`, data),
    delete: (id) => api.delete(`/invoices/${id}`),
    stats: () => api.get('/invoices/stats/dashboard'),
    analytics: (params) => api.get('/invoices/analytics', { params }),
};

// ---- Expenses ----
export const expensesAPI = {
    create: (data) => api.post('/expenses', data),
    list: (params) => api.get('/expenses', { params }),
};

// ---- Ledger ----
export const ledgerAPI = {
    list: (params) => api.get('/ledger', { params }),
    exportCSV: (params) => api.get('/ledger/export', { params, responseType: 'blob' }),
};

// ---- Portal (Share Links) ----
export const portalAPI = {
    generate: (data) => api.post('/portal/generate', data),
    get: (token) => axios.get(`/api/portal/${token}`),  // public — no auth header
};

// ---- Notifications ----
export const notificationsAPI = {
    list: () => api.get('/notifications'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all'),
};

// ---- Email Settings ----
export const emailSettingsAPI = {
    get: () => api.get('/email-settings'),
    update: (data) => api.put('/email-settings', data),
    test: (data) => api.post('/email-settings/test', data),
};
