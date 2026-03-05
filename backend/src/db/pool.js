import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Explicitly resolve .env path relative to THIS file (backend/src/db/pool.js → backend/.env)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL is not set in backend/.env\n');
    process.exit(1);
}

// Auto-detect SSL: Supabase needs it, localhost doesn't
const isLocal = process.env.DATABASE_URL.includes('localhost') ||
    process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
    console.error('❌ Unexpected DB error:', err.message);
});

// Test connection on startup
pool.connect()
    .then(client => {
        console.log('✅ Database connected successfully');
        client.release();
    })
    .catch(err => {
        console.error('\n❌ Database connection failed:', err.message);
        console.error('   Check DATABASE_URL in backend/.env\n');
    });

export default pool;
