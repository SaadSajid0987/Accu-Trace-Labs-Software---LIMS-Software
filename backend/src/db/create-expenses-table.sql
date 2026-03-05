-- Create expenses table for Income & Expense Ledger
-- Run: psql -U postgres -d openlab -f create-expenses-table.sql

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('Supplies','Equipment','Utilities','Rent','Salaries','Maintenance','Other')),
  item_description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note VARCHAR(500),
  logged_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
