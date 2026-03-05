import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function runTest() {
    try {
        const email = 'saadisherewhy21@gmail.com';
        const password = 'admin123';

        const { rows } = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email.toLowerCase().trim()]
        );

        console.log("ROWS:", JSON.stringify(rows, null, 2));

        if (rows.length === 0) {
            console.log('Invalid credentials (not found)');
            return;
        }

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);

        console.log("Password valid?", valid);

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        console.log("Token generated successfully:", token.substring(0, 20) + "...");
    } catch (err) {
        console.error('Caught error:', err);
    } finally {
        await pool.end();
    }
}

runTest();
