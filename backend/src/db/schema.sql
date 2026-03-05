-- OpenLab LIMS Database Schema
-- Run: psql -U postgres -d openlab -f schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
-- AUDIT LOG
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

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON samples(sample_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_patient_id ON samples(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_sample_test ON test_results(sample_test_id);
