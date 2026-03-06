import pool from './pool.js';

async function migrate() {
    try {
        console.log('Adding type column to tests table...');

        // Create enum if not exists
        await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_type_enum') THEN
          CREATE TYPE test_type_enum AS ENUM ('Panel', 'Individual');
        END IF;
      END
      $$;
    `);

        // Add column if not exists
        await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'tests' AND column_name = 'type'
        ) THEN
          ALTER TABLE tests ADD COLUMN type test_type_enum DEFAULT 'Panel';
        END IF;
      END
      $$;
    `);

        const panels = [
            'Complete Blood Count (CBC)', 'Liver Function Test (LFT)', 'Renal Function Test (KFT/RFT)',
            'Lipid Profile', 'Electrolyte Panel', 'Diabetes Profile', 'Bone Profile', 'Pancreatic Profile',
            'Iron Studies', 'Vitamin Profile', 'Coagulation Profile', 'Thyroid Profile', 'Hepatitis Profile',
            'Arthritis Profile', 'Cardiac Profile', 'Tumor Markers Panel', 'Female Hormone Profile',
            'Male Hormone Profile', 'Antenatal Profile', 'Dengue Profile (NS1 + IgG/IgM)', 'CSF Examination',
            'Ascitic Fluid Analysis', 'Pleural Fluid Analysis', 'Semen Analysis'
        ];

        const individuals = [
            'Blood Glucose (Fasting)', 'Urinalysis (Complete)', 'ESR (Erythrocyte Sedimentation Rate)',
            'Blood Group & Rh Typing', 'G6PD Test', 'Peripheral Smear Examination', 'Pregnancy Test (Beta hCG)',
            'Widal Test (Typhoid)', 'Mantoux Test (TB Screening)', 'TB Gold / QuantiFERON',
            'Malaria Antigen Test', 'Malaria Parasite (Microscopy)', 'Stool for Ova & Parasites',
            'Blood Culture', 'Urine Culture', 'Pus Culture', 'Sputum Culture', 'Stool Culture',
            'Throat Swab Culture', 'Wound Swab Culture', '24 Hours Urine Protein', 'Urine Microalbumin'
        ];

        console.log('Performing exact match updates...');
        const { rowCount: updatedPanels } = await pool.query(`
      UPDATE tests SET type = 'Panel' WHERE name = ANY($1) AND type != 'Panel'
    `, [panels]);
        console.log(`Updated ${updatedPanels} tests to Panel`);

        const { rowCount: updatedIndiv } = await pool.query(`
      UPDATE tests SET type = 'Individual' WHERE name = ANY($1) AND type != 'Individual'
    `, [individuals]);
        console.log(`Updated ${updatedIndiv} tests to Individual`);

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
