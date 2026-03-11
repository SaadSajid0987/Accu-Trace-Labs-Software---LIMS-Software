-- OpenLab LIMS Database Schema
-- Run: psql -U postgres -d openlab -f schema.sql
--   or: npm run db:init

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_type_enum') THEN
    CREATE TYPE test_type_enum AS ENUM ('Panel', 'Individual');
  END IF;
END
$$;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'technician', 'pathologist')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(20) UNIQUE NOT NULL,  -- e.g. OL-000001
  name VARCHAR(100) NOT NULL,
  dob DATE,
  gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
  phone VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  blood_group VARCHAR(5),
  cnic VARCHAR(20),
  referring_doctor VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate patient_id sequence
CREATE SEQUENCE IF NOT EXISTS patient_seq START 1;

-- Function to generate patient ID
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_id IS NULL OR NEW.patient_id = '' THEN
    NEW.patient_id := 'PAT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('patient_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patient_id_trigger ON patients;
CREATE TRIGGER patient_id_trigger
  BEFORE INSERT ON patients
  FOR EACH ROW EXECUTE FUNCTION generate_patient_id();

-- ============================================================
-- TEST CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10,2) DEFAULT 0,
  turnaround_hours INTEGER DEFAULT 24,
  description TEXT,
  type test_type_enum DEFAULT 'Individual',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_components (
  id SERIAL PRIMARY KEY,
  test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
  component_name VARCHAR(100) NOT NULL,
  unit VARCHAR(50),
  normal_min DECIMAL(10,4),
  normal_max DECIMAL(10,4),
  normal_text TEXT,    -- for non-numeric ranges like "Negative"
  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- SAMPLES (Job Queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS samples (
  id SERIAL PRIMARY KEY,
  sample_id VARCHAR(20) UNIQUE NOT NULL,  -- e.g. S-000001
  patient_id INTEGER REFERENCES patients(id),
  ordered_by INTEGER REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Registered'
    CHECK (status IN ('Registered','In Progress','Completed')),
  priority VARCHAR(10) DEFAULT 'Routine' CHECK (priority IN ('Routine','Urgent','STAT')),
  notes TEXT,
  remarks TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  completed_at TIMESTAMPTZ,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS sample_seq START 1;

CREATE OR REPLACE FUNCTION generate_sample_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sample_id IS NULL OR NEW.sample_id = '' THEN
    NEW.sample_id := 'S-' || LPAD(nextval('sample_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sample_id_trigger ON samples;
CREATE TRIGGER sample_id_trigger
  BEFORE INSERT ON samples
  FOR EACH ROW EXECUTE FUNCTION generate_sample_id();

-- Link samples to ordered tests
CREATE TABLE IF NOT EXISTS sample_tests (
  id SERIAL PRIMARY KEY,
  sample_id INTEGER REFERENCES samples(id) ON DELETE CASCADE,
  test_id INTEGER REFERENCES tests(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEST RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS test_results (
  id SERIAL PRIMARY KEY,
  sample_test_id INTEGER REFERENCES sample_tests(id) ON DELETE CASCADE,
  component_id INTEGER REFERENCES test_components(id),
  value TEXT,
  is_abnormal BOOLEAN DEFAULT false,
  entered_by INTEGER REFERENCES users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES & INVOICE ITEMS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(30) UNIQUE NOT NULL DEFAULT ('INV-' || LPAD(nextval('invoice_seq')::TEXT, 6, '0')),
  sample_id INTEGER REFERENCES samples(id),
  patient_id INTEGER REFERENCES patients(id),
  patient_name_snapshot TEXT,
  referring_doctor_snapshot TEXT,
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_reason TEXT,
  net_payable DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(30) DEFAULT 'Cash',
  payment_status VARCHAR(20) DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid','Partial','Paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  test_name_snapshot TEXT,
  price_snapshot DECIMAL(10,2) DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  line_total DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- ============================================================
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

-- ============================================================
-- AUDIT LOG & ARCHIVE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id INTEGER,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(50),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS audit_log_archive (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id INTEGER,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(50),
  notes TEXT
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  reference_id VARCHAR(50),
  reference_type VARCHAR(50),
  target_role VARCHAR(20) NOT NULL CHECK (target_role IN ('admin', 'pathologist')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMAIL SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_settings (
  id SERIAL PRIMARY KEY,
  recipient_email VARCHAR(150),
  daily_summary_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PATIENT PORTAL LINKS
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_portal_links (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  link_type VARCHAR(10) NOT NULL CHECK (link_type IN ('Report', 'Invoice')),
  reference_id INTEGER NOT NULL,
  patient_name TEXT,
  patient_phone TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LAB SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_settings (
  id SERIAL PRIMARY KEY,
  lab_name VARCHAR(200) DEFAULT 'Accu Trace Labs',
  tagline VARCHAR(300),
  address TEXT,
  phone1 VARCHAR(30),
  phone2 VARCHAR(30),
  phone3 VARCHAR(30),
  email VARCHAR(150),
  license_number VARCHAR(100),
  lab_logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON samples(sample_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_patient_id ON samples(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_archive_table ON audit_log_archive(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_archive_changed_at ON audit_log_archive(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_sample_test ON test_results(sample_test_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_notifications_role_read ON notifications(target_role, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_token ON patient_portal_links(token);
