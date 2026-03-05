import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function run() {
    const email = 'test_admin@openlab.com';
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);

    try {
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
            ['Test Admin', email, hash, 'admin']
        );
        console.log(`✅ Created test admin user: ${email} with password: ${password}`);
    } catch (err) {
        console.error('Error inserting user:', err.message);
    }
    await pool.end();
}
run();
