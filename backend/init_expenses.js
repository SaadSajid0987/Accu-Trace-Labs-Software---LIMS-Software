import pool from './src/db/pool.js';
pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date DATE,
        category VARCHAR(50) CHECK (category IN ('Supplies', 'Equipment', 'Rent', 'Utilities', 'Salaries', 'Maintenance', 'Other')),
        item_description TEXT,
        amount DECIMAL(10,2),
        note TEXT,
        logged_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
`).then(() => {
    console.log('Expenses table ready');
    process.exit(0);
}).catch(e => {
    console.error('Err:', e);
    process.exit(1);
});
