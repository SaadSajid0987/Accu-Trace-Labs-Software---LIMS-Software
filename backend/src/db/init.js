import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function initDB() {
    const client = await pool.connect();
    try {
        console.log('🔧 Running schema migration...');
        const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
        await client.query(schema);
        console.log('✅ Schema applied.');

        console.log('🌱 Running seed data...');
        const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
        await client.query(seed);
        console.log('✅ Seed data applied.');

        console.log('\n🎉 Database initialized successfully!');
        console.log('📧 Default accounts:');
        console.log('   admin@openlab.com  / admin123  (Admin)');
        console.log('   tech@openlab.com   / tech123   (Technician)');
        console.log('   path@openlab.com   / path123   (Pathologist)');
    } catch (err) {
        console.error('❌ DB init error:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

initDB();
