// One-time password fixer — updates all demo user passwords in the DB
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const accounts = [
    { email: 'admin@openlab.com', password: 'password' },
    { email: 'tech@openlab.com', password: 'password' },
    { email: 'path@openlab.com', password: 'password' },
];

async function fixPasswords() {
    console.log('🔑 Updating user passwords...');
    for (const { email, password } of accounts) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password_hash=$1 WHERE email=$2', [hash, email]);
        console.log(`✅ Updated: ${email}`);
    }
    console.log('\n🎉 Done! All users now have password: password');
    await pool.end();
}

fixPasswords().catch(err => { console.error('❌', err.message); process.exit(1); });
