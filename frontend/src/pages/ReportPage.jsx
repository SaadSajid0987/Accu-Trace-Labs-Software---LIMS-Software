import { useState, useEffect, useRef } from 'react';
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
            await document.fonts.ready;

            const { default: jsPDF } = await import('jspdf');
            const { default: html2canvas } = await import('html2canvas');

            // ── Build a clean off-screen clone ──────────────────────────────
            const A4_WIDTH = 794;

            const clone = printRef.current.cloneNode(true);

            // Outer wrapper — strip ALL decoration
            clone.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: ${A4_WIDTH}px;
                height: auto;
                min-height: unset;
                max-height: unset;
                overflow: visible;
                box-shadow: none;
                border: none;
                border-radius: 0;
                background: #ffffff;
                padding: 0;
                margin: 0;
                display: block;
            `;

            // Kill flex spacer
            const spacer = clone.querySelector('.report-flex-spacer');
            if (spacer) spacer.remove();

            // Kill any element with viewport-relative min-height
            clone.querySelectorAll('*').forEach(el => {
                const s = el.style;
                if (s.minHeight && s.minHeight.includes('vh')) s.minHeight = '0';
                if (s.flex === '1' || s.flex === '1 1 0%') {
                    s.flex = 'none';
                    s.minHeight = '0';
                }
                s.boxShadow = 'none';
            });

            // Ensure signature block is fully visible
            const sig = clone.querySelector('.signature-footer');
            if (sig) {
                sig.style.display = 'grid';
                sig.style.gridTemplateColumns = '1fr 1fr 1fr';
                sig.style.gap = '32px';
                sig.style.marginTop = '40px';
                sig.style.paddingTop = '0';
                sig.style.paddingBottom = '32px';
                sig.style.width = '100%';
                sig.style.boxSizing = 'border-box';
                sig.style.pageBreakInside = 'avoid';
            }

            // Ensure footer bar visible
            const footerBar = clone.querySelector('.report-footer-bar');
            if (footerBar) {
                footerBar.style.display = 'flex';
                footerBar.style.paddingBottom = '24px';
            }

            // Add padding so last element never clips
            clone.style.paddingBottom = '48px';

            document.body.appendChild(clone);

            // Let browser reflow
            await new Promise(r => setTimeout(r, 400));

            const captureHeight = clone.scrollHeight;

            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: A4_WIDTH,
                height: captureHeight,
                windowWidth: A4_WIDTH,
                scrollX: 0,
                scrollY: 0,
            });

            document.body.removeChild(clone);

            // ── Build PDF ────────────────────────────────────────────────────
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
            const pdfW = pdf.internal.pageSize.getWidth();   // 210mm
            const pdfH = pdf.internal.pageSize.getHeight();  // 297mm
            const margin = 0; // full bleed

            const imgW = pdfW - margin * 2;
            const imgH = (canvas.height * imgW) / canvas.width;
            const imgData = canvas.toDataURL('image/jpeg', 1.0);

            let heightLeft = imgH;
            let yPos = margin;
            let page = 0;

            pdf.addImage(imgData, 'JPEG', margin, yPos, imgW, imgH);
            heightLeft -= pdfH;

            while (heightLeft > 0) {
                page++;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', margin, -(pdfH * page) + margin, imgW, imgH);
                heightLeft -= pdfH;
            }

            pdf.save(`AccuTrace-Report-${data.sample.sample_id}.pdf`);
            toast.success('PDF downloaded!', { id: 'pdf-toast' });

        } catch (err) {
            console.error('PDF error:', err);
            toast.error('Failed to generate PDF', { id: 'pdf-toast' });
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