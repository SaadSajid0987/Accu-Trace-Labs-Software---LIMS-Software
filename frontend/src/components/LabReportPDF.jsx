import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '20 36 18 36', borderBottomWidth: 2, borderBottomColor: '#0f172a' },
  logoBox: { width: 72, height: 72, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 8, padding: 4, alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: 62, height: 62, objectFit: 'contain' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14 36 10 36', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  reportTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  metaText: { fontSize: 9, color: '#64748b', lineHeight: 1.8, textAlign: 'right' },
  metaBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  patientSection: { padding: '12 36', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  patientGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 },
  patientCell: { width: '25%', padding: '9 12' },
  cellBorderRight: { borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  cellBorderBottom: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  cellLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  cellValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  cellSub: { fontSize: 9, color: '#64748b', marginTop: 2 },
  content: { padding: '16 36 0 36', position: 'relative' },
  watermark: { position: 'absolute', top: 100, left: 157, width: 260, height: 260, opacity: 0.04 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  sectionName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  categoryPill: { fontSize: 9, color: '#64748b', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: '2 6' },
  tableContainer: { 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 6, 
    marginBottom: 18 
  },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1e293b' },
  thCell: { padding: '8 12', fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#e2e8f0' },
  tableRow: { flexDirection: 'row' },
  rowOdd: { backgroundColor: '#ffffff' },
  rowEven: { backgroundColor: '#f8fafc' },
  rowAbnormal: { backgroundColor: '#fff5f5' },
  tdNormal: { padding: '8 12', fontSize: 10, color: '#0f172a' },
  tdBold: { padding: '8 12', fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  tdAbnormal: { padding: '8 12', fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ef4444' },
  tdMuted: { padding: '8 12', fontSize: 9, color: '#64748b' },
  tdMono: { padding: '8 12', fontSize: 9, color: '#64748b', fontFamily: 'Courier' },
  colParam: { width: '38%' },
  colResult: { width: '17%' },
  colUnit: { width: '17%' },
  colRange: { width: '28%' },
  blockLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  blockText: { fontSize: 10, color: '#334155', lineHeight: 1.7, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: '10 12', marginBottom: 16 },
  signatureBlock: { 
    flexDirection: 'row', 
    gap: 20, 
    marginTop: 0,
    paddingTop: 16,
    paddingBottom: 20 
  },
  sigCol: { flex: 1 },
  sigLine: { borderTopWidth: 1.5, borderTopColor: '#0f172a', marginBottom: 7, width: '100%' },
  sigName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
  sigRole: { fontSize: 10, color: '#334155', lineHeight: 1.7 },
  sigExtra: { fontSize: 9, color: '#64748b' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12 36', borderTopWidth: 2, borderTopColor: '#0f172a', marginTop: 16 },
  footerLabName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
  footerAddress: { fontSize: 9, color: '#475569', lineHeight: 1.7 },
  footerGenerated: { fontSize: 9, color: '#64748b', fontFamily: 'Courier', lineHeight: 1.7, textAlign: 'right' },
});

export default function LabReportPDF({ reportData, flaskLogoBase64, labLogoBase64 }) {
  const { sample, tests, generated_at } = reportData;

  const patientCells = [
    { label: 'PATIENT', value: sample.patient_name || '—', sub: sample.guardian_name ? `S/O ${sample.guardian_name}` : null },
    { label: 'PATIENT ID', value: sample.patient_ref || '—' },
    { label: 'GENDER', value: sample.gender || '—' },
    { label: 'AGE', value: sample.age != null ? `${sample.age} years` : '—' },
    { label: 'PHONE', value: sample.phone || '—' },
    { label: 'CNIC NUMBER', value: sample.cnic || '—' },
    { label: 'REFERRED BY', value: sample.referring_doctor || '—' },
    { label: 'PRIORITY', value: sample.priority || '—' },
  ];

  const signatories = [
    { name: 'Muhammad Tallal Sajid', roles: ['CEO / Microbiologist', 'Accu Trace Labs (Pvt) Ltd'], extra: [] },
    { name: 'Dr. Rabbia Khalid Latif', roles: ['Consultant Pathologist', 'M.Phil Haematology'], extra: ['PMDC Reg No: 57687-P'] },
    { name: 'Dr. Sajid Latif', roles: ['Consultant Physician', 'Director – Accu Trace Labs, MBBS'], extra: [] },
  ];

  return (
    <Document>
      <Page size="A4" style={[styles.page, { flexDirection: 'column' }]} wrap>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>Accu Trace </Text>
            <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#0ea5e9' }}>Labs</Text>
          </View>
          {flaskLogoBase64 && (
            <View style={styles.logoBox}>
              <Image style={styles.logoImg} src={`data:image/png;base64,${flaskLogoBase64}`} />
            </View>
          )}
        </View>

        {/* TITLE ROW */}
        <View style={styles.titleRow}>
          <Text style={styles.reportTitle}>Laboratory Report</Text>
          <View>
            <Text style={styles.metaText}>Sample ID: <Text style={styles.metaBold}>{sample.sample_id}</Text></Text>
            <Text style={styles.metaText}>Generated: <Text style={styles.metaBold}>{new Date(generated_at).toLocaleString()}</Text></Text>
          </View>
        </View>

        {/* PATIENT INFO */}
        <View style={styles.patientSection}>
          <View style={styles.patientGrid}>
            {patientCells.map((cell, i) => (
              <View key={i} style={[styles.patientCell, (i+1)%4 !== 0 && styles.cellBorderRight, i < 4 && styles.cellBorderBottom]}>
                <Text style={styles.cellLabel}>{cell.label}</Text>
                <Text style={styles.cellValue}>{cell.value}</Text>
                {cell.sub && <Text style={styles.cellSub}>{cell.sub}</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          {labLogoBase64 && (
            <Image style={styles.watermark} src={`data:image/png;base64,${labLogoBase64}`} />
          )}

          {tests.map((test, ti) => (
            <View key={ti} style={{ marginBottom: 16 }} wrap={test.components.length <= 6}>
              <View wrap={false} style={{ marginBottom: 0 }}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionName}>{test.test_name}</Text>
                  <Text style={styles.categoryPill}>{test.category}</Text>
                </View>
                {/* First 2 rows always stay with header */}
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCell, styles.colParam]}>Parameter</Text>
                    <Text style={[styles.thCell, styles.colResult]}>Result</Text>
                    <Text style={[styles.thCell, styles.colUnit]}>Unit</Text>
                    <Text style={[styles.thCell, styles.colRange]}>Normal Range</Text>
                  </View>
                  {test.components.map((c, ci) => (
                    <View key={ci} wrap={false} style={[styles.tableRow, c.is_abnormal ? styles.rowAbnormal : (ci % 2 === 0 ? styles.rowOdd : styles.rowEven)]}>
                      <Text style={[styles.tdNormal, styles.colParam]}>{c.component_name}</Text>
                      <Text style={[c.is_abnormal ? styles.tdAbnormal : styles.tdBold, styles.colResult]}>{c.value || '—'}</Text>
                      <Text style={[styles.tdMuted, styles.colUnit]}>{c.unit || '—'}</Text>
                      <Text style={[styles.tdMono, styles.colRange]}>{c.normal_text || (c.normal_min != null && c.normal_max != null ? `${c.normal_min} – ${c.normal_max}` : '—')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}

          {sample.notes && (
            <View wrap={false} style={{ marginBottom: 12 }}>
              <Text style={styles.blockLabel}>Findings</Text>
              <Text style={styles.blockText}>{sample.notes}</Text>
            </View>
          )}

          {sample.remarks && (
            <View wrap={false} style={{ marginBottom: 12 }}>
              <Text style={styles.blockLabel}>Clinical Remarks</Text>
              <Text style={styles.blockText}>{sample.remarks}</Text>
            </View>
          )}

          {/* SIGNATURE */}
          <View wrap={false} minPresenceAhead={100} style={styles.signatureBlock}>
            {signatories.map((sig, i) => (
              <View key={i} style={styles.sigCol}>
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>{sig.name}</Text>
                {sig.roles.map((r, j) => <Text key={j} style={styles.sigRole}>{r}</Text>)}
                {sig.extra.map((e, j) => <Text key={j} style={styles.sigExtra}>{e}</Text>)}
              </View>
            ))}
          </View>
        </View>

        {/* FOOTER */}
        <View wrap={false} style={styles.footer}>
          <View>
            <Text style={styles.footerLabName}>Accu Trace Labs (Pvt) Ltd</Text>
            <Text style={styles.footerAddress}>Near Askari Bank, Tramari, Islamabad</Text>
            <Text style={styles.footerAddress}>+92 310 1599399 · info@accutracelabs.com</Text>
          </View>
          <View>
            <Text style={styles.footerGenerated}>This is a computer-generated report</Text>
            <Text style={styles.footerGenerated}>Accu Trace Labs LIMS V1.0</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
