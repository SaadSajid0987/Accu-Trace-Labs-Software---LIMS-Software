import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import patientsRouter from './routes/patients.js';
import testsRouter from './routes/tests.js';
import samplesRouter from './routes/samples.js';
import reportsRouter from './routes/reports.js';
import auditRouter from './routes/audit.js';
import labSettingsRouter from './routes/lab-settings.js';
import emailSettingsRouter from './routes/email-settings.js';
import invoicesRouter from './routes/invoices.js';
import expensesRouter from './routes/expenses.js';
import ledgerRouter from './routes/ledger.js';
import portalRouter from './routes/portal.js';
import notificationsRouter from './routes/notifications.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize scheduled cron jobs
import './cron/emailJobs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security Middleware ──
app.use(helmet());
app.disable('x-powered-by');

const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Body parsing with size limits to prevent payload flooding
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logger (dev only)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
        next();
    });
}

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/tests', testsRouter);
app.use('/api/samples', samplesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/lab-settings', labSettingsRouter);
app.use('/api/email-settings', emailSettingsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/portal', portalRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0', service: 'Accu Trace Labs API' });
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler — NEVER leak internal details
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`\n🧪 Accu Trace Labs API running on http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health\n`);
});

export default app;
