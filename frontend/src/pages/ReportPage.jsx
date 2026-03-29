import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsAPI } from '../api/index.js';
import { Printer, Download, ArrowLeft, Loader2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';
import ShareModal from '../components/ShareModal.jsx';
import { portalAPI } from '../api/index.js';

export default function ReportPage() {
    const { sampleId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const printRef = useRef(null);
    const [shareModal, setShareModal] = useState({ open: false, link: '', name: '', phone: '' });
    const [shareLoading, setShareLoading] = useState(false);

    useEffect(() => {
        reportsAPI.get(sampleId)
            .then(r => setData(r.data.report))
            .catch(() => toast.error('Failed to load report'))
            .finally(() => setLoading(false));
    }, [sampleId]);

    const handlePrint = () => window.print();

    const handlePDF = async () => {
        if (pdfGenerating) return;
        setPdfGenerating(true);
        toast.loading('Generating PDF...', { id: 'pdf-toast' });

        try {
            const { sample, tests, generated_at } = data;

            const toBase64 = async (url) => {
                const res = await fetch(url);
                const blob = await res.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            };

            const [flaskLogo, labLogo] = await Promise.all([
                toBase64('/flask_lab_logo_1.png'),
                toBase64('/Lab_Logo.png'),
            ]);

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

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  html, body {
    height: auto !important;
    margin: 0;
    padding: 0;
  }
  body { font-family: Inter, Arial, sans-serif; background: white; color: #0f172a; font-size: 13px; }

  .header { padding: 20px 36px 18px 36px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; }
  .lab-name { font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1; }
  .lab-name span { color: #0ea5e9; }
  .logo-box { width: 90px; height: 90px; border: 2px solid #e2e8f0; border-radius: 10px; padding: 6px; display: flex; align-items: center; justify-content: center; }
  .logo-box img { width: 100%; height: 100%; object-fit: contain; }

  .title-row { padding: 16px 36px 12px 36px; display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #e2e8f0; }
  .report-title { font-size: 20px; font-weight: 800; color: #0f172a; }
  .title-meta { text-align: right; font-size: 12px; color: #64748b; font-family: monospace; line-height: 1.75; }
  .title-meta strong { color: #0f172a; font-weight: 600; }

  .patient-section { padding: 16px 36px; border-bottom: 1px solid #e2e8f0; }
  .patient-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .patient-cell { padding: 11px 14px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
  .patient-cell:nth-child(4n) { border-right: none; }
  .patient-cell.last-row { border-bottom: none; }
  .cell-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
  .cell-value { font-size: 13px; font-weight: 600; color: #0f172a; }
  .cell-sub { font-size: 11px; color: #64748b; margin-top: 2px; }

  .content { padding: 20px 36px; position: relative; display: flex; flex-direction: column; }
  .signature-spacer { flex: 1; min-height: 570px; }
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 320px;
    height: 320px;
    object-fit: contain;
    opacity: 0.035;
    pointer-events: none;
    z-index: -1;
  }

  .section-wrap { margin-bottom: 24px; position: relative; z-index: 1; page-break-inside: avoid; }
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; page-break-after: avoid; }
  .section-name { font-size: 15px; font-weight: 700; color: #0f172a; }
  .category-pill { font-size: 11px; color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 5px; padding: 2px 8px; font-weight: 500; }

  .result-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .result-table thead tr { background: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .result-table thead th { padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #e2e8f0; }
  .result-table tbody tr { border-bottom: 1px solid #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .result-table tbody tr:last-child { border-bottom: none; }
  .result-table tbody tr.even { background: #f8fafc; }
  .result-table tbody tr.odd { background: #ffffff; }
  .result-table tbody tr.abnormal { background: #fff5f5 !important; }
  .result-table tbody td { padding: 10px 16px; font-size: 13px; color: #475569; }
  .result-table tbody td.param { color: #0f172a; font-weight: 500; }
  .result-table tbody td.result-val { font-weight: 700; color: #0f172a; }
  .result-table tbody td.abnormal-val { font-weight: 700; color: #ef4444; }
  .result-table tbody td.range { font-family: monospace; font-size: 11px; color: #64748b; }

  .block { margin-bottom: 18px; position: relative; z-index: 1; page-break-inside: avoid; }
  .block-label { font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 6px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
  .block-text { font-size: 13px; color: #334155; line-height: 1.7; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; white-space: pre-wrap; }

  .signature-block {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 28px;
    margin-top: 40px;
    padding-bottom: 0;
    page-break-inside: avoid;
    position: relative;
    z-index: 1;
  }
  .sig-line { border-top: 1.5px solid #0f172a; margin-bottom: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sig-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
  .sig-role { font-size: 12px; color: #334155; line-height: 1.7; }
  .sig-extra { font-size: 11px; color: #64748b; }



  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  @page:last {
    size: auto;
  }
</style>
</head>
<body>
<img class="watermark" src="${labLogo}" alt="" />

<div class="header">
  <div class="lab-name">Accu Trace <span>Labs</span></div>
  <div class="logo-box"><img src="${flaskLogo}" alt="Logo" /></div>
</div>

<div class="title-row">
  <div class="report-title">Laboratory Report</div>
  <div class="title-meta">
    Sample ID: <strong>${sample.sample_id}</strong><br/>
    Generated: <strong>${new Date(generated_at).toLocaleString()}</strong>
  </div>
</div>

<div class="patient-section">
  <div class="patient-grid">
    ${patientCells.map((cell, i) => `
      <div class="patient-cell ${i >= 4 ? 'last-row' : ''}">
        <div class="cell-label">${cell.label}</div>
        <div class="cell-value">${cell.value}</div>
        ${cell.sub ? `<div class="cell-sub">${cell.sub}</div>` : ''}
      </div>
    `).join('')}
  </div>
</div>

<div class="content">

  ${tests.map(test => `
    <div class="section-wrap">
      <div class="section-header">
        <span class="section-name">${test.test_name}</span>
        <span class="category-pill">${test.category}</span>
      </div>
      <table class="result-table">
        <thead>
          <tr>
            <th style="width:38%">Parameter</th>
            <th style="width:17%">Result</th>
            <th style="width:17%">Unit</th>
            <th style="width:28%">Normal Range</th>
          </tr>
        </thead>
        <tbody>
          ${test.components.map((c, i) => `
            <tr class="${c.is_abnormal ? 'abnormal' : (i % 2 === 0 ? 'odd' : 'even')}">
              <td class="param">${c.component_name}</td>
              <td class="${c.is_abnormal ? 'abnormal-val' : 'result-val'}">${c.value || '—'}</td>
              <td>${c.unit || '—'}</td>
              <td class="range">${c.normal_text || (c.normal_min != null && c.normal_max != null ? `${c.normal_min} – ${c.normal_max}` : '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}

  ${sample.notes ? `
    <div class="block">
      <div class="block-label">Findings</div>
      <div class="block-text">${sample.notes}</div>
    </div>
  ` : ''}

  ${sample.remarks ? `
    <div class="block">
      <div class="block-label">Clinical Remarks</div>
      <div class="block-text">${sample.remarks}</div>
    </div>
  ` : ''}

  <div class="signature-spacer"></div>
  <div class="signature-block">
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-name">Muhammad Tallal Sajid</div>
      <div class="sig-role">CEO / Microbiologist</div>
      <div class="sig-role">Accu Trace Labs (Pvt) Ltd</div>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-name">Dr. Rabbia Khalid Latif</div>
      <div class="sig-role">Consultant Pathologist</div>
      <div class="sig-role">M.Phil Haematology</div>
      <div class="sig-extra">PMDC Reg No: 57687-P</div>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-name">Dr. Sajid Latif</div>
      <div class="sig-role">Consultant Physician</div>
      <div class="sig-role">Director – Accu Trace Labs, MBBS</div>
    </div>
  </div>
</div>

</body>
</html>`;

            const response = await fetch('http://localhost:3002/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html,
                    filename: `AccuTrace-Report-${sample.sample_id}`,
                }),
            });

            if (!response.ok) throw new Error('PDF server error');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AccuTrace-Report-${sample.sample_id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('PDF downloaded!', { id: 'pdf-toast' });

        } catch (err) {
            console.error('PDF error:', err);
            toast.error('PDF server not running. Start it with: cd pdf-server && node server.js', { id: 'pdf-toast' });
        } finally {
            setPdfGenerating(false);
        }
    };

    if (loading) return <LabLoader text="Generating Report" />;
    if (!data) return <div className="p-6">Report not found.</div>;

    const { sample, tests, generated_at } = data;

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* ── Action Bar ── */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 max-w-4xl mx-auto">
                <Link to={`/samples/${sampleId}`} className="btn-secondary w-full sm:w-auto justify-center">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Link>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                        onClick={async () => {
                            setShareLoading(true);
                            try {
                                const { data: res } = await portalAPI.generate({
                                    link_type: 'Report',
                                    reference_id: sampleId,
                                    patient_name: data.sample.patient_name,
                                    patient_phone: data.sample.phone,
                                });
                                setShareModal({ open: true, link: res.link, name: data.sample.patient_name || '', phone: data.sample.phone || '' });
                            } catch { toast.error('Failed to generate share link'); }
                            finally { setShareLoading(false); }
                        }}
                        disabled={shareLoading}
                        className="btn-secondary flex-1 sm:flex-none justify-center"
                    >
                        {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Share
                    </button>
                    <button
                        onClick={handlePDF}
                        disabled={pdfGenerating}
                        className="btn-primary flex-1 sm:flex-none justify-center"
                    >
                        {pdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {pdfGenerating ? 'Generating...' : 'Download PDF'}
                    </button>
                    <button onClick={handlePrint} className="btn-secondary flex-1 sm:flex-none justify-center">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* ── Report Paper ── */}
            <div ref={printRef} className="report-body max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden" style={{ position: 'relative' }}>

                {/* Watermark */}
                <img
                    src="/Lab_Logo.png"
                    alt=""
                    aria-hidden="true"
                    style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '400px', height: '400px', objectFit: 'contain',
                        opacity: 0.05, pointerEvents: 'none', userSelect: 'none', zIndex: 0
                    }}
                />

                {/* ── ① WHITE HEADER ── */}
                <div style={{
                    padding: '20px 36px 18px 36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '2px solid #0f172a',
                    background: '#ffffff',
                    position: 'relative', zIndex: 1,
                }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
                            Accu Trace <span style={{ color: '#0ea5e9' }}>Labs</span>
                        </h1>
                    </div>
                    <div style={{
                        width: '90px', height: '90px',
                        border: '2px solid #e2e8f0', borderRadius: '10px',
                        padding: '6px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#ffffff',
                    }}>
                        <img src="/flask_lab_logo_1.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                </div>

                {/* ── ② TITLE ROW ── */}
                <div style={{
                    padding: '16px 36px 12px 36px',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    borderBottom: '1px solid #e2e8f0',
                    position: 'relative', zIndex: 1,
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Laboratory Report</h2>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', margin: 0, lineHeight: 1.75 }}>
                            Sample ID: <strong style={{ color: '#0f172a' }}>{sample.sample_id}</strong>
                        </p>
                        <p style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', margin: 0, lineHeight: 1.75 }}>
                            Generated: <strong style={{ color: '#0f172a' }}>{new Date(generated_at).toLocaleString()}</strong>
                        </p>
                    </div>
                </div>

                {/* ── ③ PATIENT INFO ── */}
                <div style={{ padding: '16px 36px', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 1 }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        {[
                            { label: 'PATIENT', value: sample.patient_name || '—', sub: sample.guardian_name ? `S/O ${sample.guardian_name}` : null },
                            { label: 'PATIENT ID', value: sample.patient_ref || '—' },
                            { label: 'GENDER', value: sample.gender || '—' },
                            { label: 'AGE', value: sample.age != null ? `${sample.age} years` : '—' },
                            { label: 'PHONE', value: sample.phone || '—' },
                            { label: 'CNIC NUMBER', value: sample.cnic || '—' },
                            { label: 'REFERRED BY', value: sample.referring_doctor || '—' },
                            { label: 'PRIORITY', value: sample.priority || '—' },
                        ].map((cell, i) => (
                            <div key={i} style={{
                                padding: '11px 14px',
                                borderRight: (i + 1) % 4 !== 0 ? '1px solid #e2e8f0' : 'none',
                                borderBottom: i < 4 ? '1px solid #e2e8f0' : 'none',
                            }}>
                                <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px 0' }}>{cell.label}</p>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{cell.value}</p>
                                {cell.sub && <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>{cell.sub}</p>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── ④ TEST RESULTS ── */}
                <div style={{ padding: '20px 36px', position: 'relative', zIndex: 1 }}>
                    {tests.map(test => (
                        <div key={test.sample_test_id} style={{ marginBottom: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{test.test_name}</h3>
                                <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '2px 8px', fontWeight: 500 }}>{test.category}</span>
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#1e293b' }}>
                                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Parameter</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Result</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Unit</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Normal Range</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {test.components.map((c, i) => (
                                            <tr key={i} style={{ background: c.is_abnormal ? '#fff5f5' : (i % 2 === 0 ? '#ffffff' : '#f8fafc'), borderBottom: i < test.components.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                <td style={{ padding: '11px 16px', fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{c.component_name}</td>
                                                <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: 700, color: c.is_abnormal ? '#ef4444' : '#0f172a' }}>{c.value || '—'}</td>
                                                <td style={{ padding: '11px 16px', fontSize: '13px', color: '#64748b' }}>{c.unit || '—'}</td>
                                                <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                                                    {c.normal_text || (c.normal_min != null && c.normal_max != null ? `${c.normal_min} – ${c.normal_max}` : '—')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Findings */}
                    {sample.notes && (
                        <div style={{ marginBottom: '18px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px 0', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>Findings</p>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#334155', lineHeight: 1.7 }} className="whitespace-pre-wrap">
                                {sample.notes}
                            </div>
                        </div>
                    )}

                    {/* Clinical Remarks */}
                    {sample.remarks && (
                        <div style={{ marginBottom: '18px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px 0', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>Clinical Remarks</p>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#334155', lineHeight: 1.65 }} className="whitespace-pre-wrap">
                                {sample.remarks}
                            </div>
                        </div>
                    )}

                    {/* ── ⑤ SIGNATURE BLOCK ── */}
                    <div className="signature-footer" style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '28px', marginTop: '40px', paddingBottom: '24px',
                        width: '100%', boxSizing: 'border-box',
                    }}>
                        {[
                            { name: 'Muhammad Tallal Sajid', roles: ['CEO / Microbiologist', 'Accu Trace Labs (Pvt) Ltd'], extra: [] },
                            { name: 'Dr. Rabbia Khalid Latif', roles: ['Consultant Pathologist', 'M.Phil Haematology'], extra: ['PMDC Reg No: 57687-P'] },
                            { name: 'Dr. Sajid Latif', roles: ['Consultant Physician', 'Director – Accu Trace Labs, MBBS'], extra: [] },
                        ].map((sig, i) => (
                            <div key={i}>
                                <div style={{ borderTop: '1.5px solid #0f172a', width: '100%', marginBottom: '8px' }}></div>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>{sig.name}</p>
                                {sig.roles.map((r, j) => <p key={j} style={{ fontSize: '12px', color: '#334155', lineHeight: 1.7, margin: 0 }}>{r}</p>)}
                                {sig.extra.map((e, j) => <p key={j} style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{e}</p>)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── ⑥ FOOTER BAR ── */}
                <div className="report-footer-bar" style={{
                    padding: '14px 36px',
                    borderTop: '2px solid #0f172a',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#ffffff',
                    position: 'relative', zIndex: 1,
                }}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>Accu Trace Labs (Pvt) Ltd</p>
                        <p style={{ fontSize: '11px', color: '#475569', margin: 0, lineHeight: 1.7 }}>Near Askari Bank, Tramari, Islamabad</p>
                        <p style={{ fontSize: '11px', color: '#475569', margin: 0, lineHeight: 1.7 }}>+92 310 1599399 · info@accutracelabs.com</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', margin: 0, lineHeight: 1.7 }}>This is a computer-generated report</p>
                        <p style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', margin: 0, lineHeight: 1.7 }}>Accu Trace Labs LIMS V1.0</p>
                    </div>
                </div>

            </div>{/* end report paper */}

            <ShareModal
                isOpen={shareModal.open}
                onClose={() => setShareModal(s => ({ ...s, open: false }))}
                portalLink={shareModal.link}
                patientName={shareModal.name}
                patientPhone={shareModal.phone}
                linkType="Report"
                labName={data?.lab?.name}
            />
        </div>
    );
}