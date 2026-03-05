-- OpenLab LIMS Seed Data
-- Run after schema.sql

-- ============================================================
-- USERS - All passwords: "password" (bcrypt hashed)
-- admin@openlab.com     -> password  (Admin)
-- tech@openlab.com      -> password  (Technician)
-- path@openlab.com      -> password  (Pathologist)
-- ============================================================
INSERT INTO users (name, email, password_hash, role) VALUES
(
  'Dr. Sarah Admin',
  'admin@openlab.com',
  '$2a$10$yjgPS74PDscv6nhjeKXBSuHnaV3ir/wzVkudGHEXD66z5.rdHNuhwi',
  'admin'
),
(
  'Ali Hassan',
  'tech@openlab.com',
  '$2a$10$yjgPS74PDscv6nhjeKXBSuHnaV3ir/wzVkudGHEXD66z5.rdHNuhwi',
  'technician'
),
(
  'Dr. Fatima Khan',
  'path@openlab.com',
  '$2a$10$yjgPS74PDscv6nhjeKXBSuHnaV3ir/wzVkudGHEXD66z5.rdHNuhwi',
  'pathologist'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- TEST CATALOG
-- ============================================================

-- CBC (Complete Blood Count)
INSERT INTO tests (name, category, price, turnaround_hours, description) VALUES
('Complete Blood Count (CBC)', 'Hematology', 500.00, 4, 'A comprehensive test to evaluate overall health and detect a wide variety of disorders.'),
('Blood Glucose (Fasting)', 'Biochemistry', 200.00, 2, 'Measures blood glucose level after fasting for at least 8 hours.'),
('Liver Function Test (LFT)', 'Biochemistry', 1200.00, 6, 'Evaluates liver enzyme levels, bilirubin, and protein levels.'),
('Dengue Profile (NS1 + IgG/IgM)', 'Serology', 2500.00, 6, 'Detects dengue fever through NS1 antigen and antibody testing.'),
('Urinalysis (Complete)', 'Urinalysis', 300.00, 2, 'Complete examination of urine for diagnosis of various conditions.')
ON CONFLICT DO NOTHING;

-- CBC Components
DO $$
DECLARE cbc_id INTEGER;
BEGIN
  SELECT id INTO cbc_id FROM tests WHERE name = 'Complete Blood Count (CBC)';
  INSERT INTO test_components (test_id, component_name, unit, normal_min, normal_max, sort_order) VALUES
  (cbc_id, 'Hemoglobin (Hb)', 'g/dL', 12.0, 17.5, 1),
  (cbc_id, 'RBC Count', 'million/µL', 4.2, 5.9, 2),
  (cbc_id, 'WBC Count', 'thousand/µL', 4.0, 11.0, 3),
  (cbc_id, 'Platelet Count', 'thousand/µL', 150.0, 400.0, 4),
  (cbc_id, 'Hematocrit (HCT)', '%', 36.0, 52.0, 5),
  (cbc_id, 'MCV', 'fL', 80.0, 100.0, 6),
  (cbc_id, 'MCH', 'pg', 27.0, 33.0, 7),
  (cbc_id, 'MCHC', 'g/dL', 32.0, 36.0, 8),
  (cbc_id, 'Neutrophils', '%', 40.0, 70.0, 9),
  (cbc_id, 'Lymphocytes', '%', 20.0, 45.0, 10),
  (cbc_id, 'Monocytes', '%', 2.0, 10.0, 11),
  (cbc_id, 'Basophils', '%', 0.0, 2.0, 12),
  (cbc_id, 'Eosinophils', '%', 1.0, 6.0, 13);
END $$;

-- Blood Glucose Components
DO $$
DECLARE bg_id INTEGER;
BEGIN
  SELECT id INTO bg_id FROM tests WHERE name = 'Blood Glucose (Fasting)';
  INSERT INTO test_components (test_id, component_name, unit, normal_min, normal_max, sort_order) VALUES
  (bg_id, 'Blood Glucose (Fasting)', 'mg/dL', 70.0, 99.0, 1);
END $$;

-- LFT Components
DO $$
DECLARE lft_id INTEGER;
BEGIN
  SELECT id INTO lft_id FROM tests WHERE name = 'Liver Function Test (LFT)';
  INSERT INTO test_components (test_id, component_name, unit, normal_min, normal_max, sort_order) VALUES
  (lft_id, 'ALT (SGPT)', 'U/L', 0.0, 56.0, 1),
  (lft_id, 'AST (SGOT)', 'U/L', 0.0, 40.0, 2),
  (lft_id, 'ALP', 'U/L', 44.0, 147.0, 3),
  (lft_id, 'Total Bilirubin', 'mg/dL', 0.1, 1.2, 4),
  (lft_id, 'Direct Bilirubin', 'mg/dL', 0.0, 0.3, 5),
  (lft_id, 'Indirect Bilirubin', 'mg/dL', 0.1, 0.9, 6),
  (lft_id, 'Total Protein', 'g/dL', 6.0, 8.3, 7),
  (lft_id, 'Albumin', 'g/dL', 3.5, 5.0, 8),
  (lft_id, 'Globulin', 'g/dL', 2.0, 3.5, 9),
  (lft_id, 'GGT', 'U/L', 0.0, 61.0, 10);
END $$;

-- Dengue Components
DO $$
DECLARE dng_id INTEGER;
BEGIN
  SELECT id INTO dng_id FROM tests WHERE name = 'Dengue Profile (NS1 + IgG/IgM)';
  INSERT INTO test_components (test_id, component_name, unit, normal_min, normal_max, normal_text, sort_order) VALUES
  (dng_id, 'Dengue NS1 Antigen', NULL, NULL, NULL, 'Negative', 1),
  (dng_id, 'Dengue IgG Antibody', NULL, NULL, NULL, 'Negative', 2),
  (dng_id, 'Dengue IgM Antibody', NULL, NULL, NULL, 'Negative', 3);
END $$;

-- Urinalysis Components
DO $$
DECLARE ua_id INTEGER;
BEGIN
  SELECT id INTO ua_id FROM tests WHERE name = 'Urinalysis (Complete)';
  INSERT INTO test_components (test_id, component_name, unit, normal_min, normal_max, normal_text, sort_order) VALUES
  (ua_id, 'Color', NULL, NULL, NULL, 'Pale Yellow to Yellow', 1),
  (ua_id, 'Appearance', NULL, NULL, NULL, 'Clear', 2),
  (ua_id, 'pH', NULL, 4.5, 8.0, NULL, 3),
  (ua_id, 'Specific Gravity', NULL, 1.001, 1.030, NULL, 4),
  (ua_id, 'Glucose', NULL, NULL, NULL, 'Negative', 5),
  (ua_id, 'Protein', NULL, NULL, NULL, 'Negative', 6),
  (ua_id, 'Bilirubin', NULL, NULL, NULL, 'Negative', 7),
  (ua_id, 'Ketones', NULL, NULL, NULL, 'Negative', 8),
  (ua_id, 'Blood/Hemoglobin', NULL, NULL, NULL, 'Negative', 9),
  (ua_id, 'Nitrites', NULL, NULL, NULL, 'Negative', 10),
  (ua_id, 'Leukocyte Esterase', NULL, NULL, NULL, 'Negative', 11),
  (ua_id, 'RBCs (Microscopic)', '/HPF', 0.0, 5.0, NULL, 12),
  (ua_id, 'WBCs (Microscopic)', '/HPF', 0.0, 5.0, NULL, 13),
  (ua_id, 'Epithelial Cells', NULL, NULL, NULL, 'Occasional', 14),
  (ua_id, 'Casts', NULL, NULL, NULL, 'Nil to Rare', 15);
END $$;

-- ============================================================
-- SAMPLE PATIENTS
-- ============================================================
INSERT INTO patients (name, dob, gender, phone, blood_group, address) VALUES
('Muhammad Ahmed', '1985-03-15', 'Male', '+92-300-1234567', 'B+', 'House 12, Street 5, Lahore'),
('Fatima Malik', '1992-07-22', 'Female', '+92-321-9876543', 'O+', 'Flat 8A, DHA Phase 2, Karachi')
ON CONFLICT DO NOTHING;
