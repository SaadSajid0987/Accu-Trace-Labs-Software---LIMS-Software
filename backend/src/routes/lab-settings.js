import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `lab-logo-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
    storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
        if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file.originalname)) cb(null, true);
        else cb(new Error('Only image files allowed'));
    }
});

const router = express.Router();

// GET /api/lab-settings — public (needed for invoice printing)
router.get('/', async (_req, res) => {
    try {
        const { rows: [settings] } = await pool.query('SELECT * FROM lab_settings WHERE id=1');
        res.json(settings || {});
    } catch (err) { console.error('Settings fetch error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// PUT /api/lab-settings — admin only
router.put('/', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { lab_name, tagline, address, phone1, phone2, phone3, email, license_number } = req.body;
        const { rows: [updated] } = await pool.query(
            `UPDATE lab_settings SET lab_name=$1, tagline=$2, address=$3, phone1=$4, phone2=$5, phone3=$6, email=$7, license_number=$8, updated_at=NOW()
             WHERE id=1 RETURNING *`,
            [lab_name, tagline, address, phone1, phone2, phone3, email, license_number]
        );
        res.json(updated);
    } catch (err) { console.error('Settings update error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/lab-settings/logo — admin only, file upload
router.post('/logo', verifyToken, requireRole('admin'), upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const logoPath = `/uploads/${req.file.filename}`;
        const { rows: [updated] } = await pool.query(
            'UPDATE lab_settings SET lab_logo=$1, updated_at=NOW() WHERE id=1 RETURNING *',
            [logoPath]
        );
        res.json(updated);
    } catch (err) { console.error('Logo upload error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
