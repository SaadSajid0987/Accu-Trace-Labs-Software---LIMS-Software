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
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const { report } = await reportsAPI.get(sampleId).then(r => r.data);
            const { lab, sample, tests } = report;

            // Load images
            let flaskLogoBase64 = null;
            let watermarkBase64 = null;
            try {
                const flaskRes = await fetch('/flask_lab_logo_1.png');
                const flaskBlob = await flaskRes.blob();
                flaskLogoBase64 = await new Promise(res => {
                    const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(flaskBlob);
                });

                const waterRes = await fetch('/Lab_Logo.png');
                const waterBlob = await waterRes.blob();
                watermarkBase64 = await new Promise(res => {
                    const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(waterBlob);
                });
            } catch (err) { console.error('Images load error', err); }

            const drawWatermark = () => {
                if (watermarkBase64) {
                    try {
                        doc.setGState(new doc.GState({ opacity: 0.055 }));
                        doc.addImage(watermarkBase64, 'PNG', 45, 90, 120, 120);
                        doc.setGState(new doc.GState({ opacity: 1 }));
                    } catch (e) { console.error('Watermark error', e); }
                }
            };

            // HEADER BANNER
            doc.setFillColor(30, 42, 74);
            doc.rect(0, 0, 210, 36, 'F');

            let textStartX = 14;
            if (flaskLogoBase64) {
                // Flask logo container
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(14, 8, 20, 20, 3, 3, 'F');
                doc.addImage(flaskLogoBase64, 'PNG', 16, 10, 16, 16);
                
                // Divider
                doc.setDrawColor(255, 255, 255);
                doc.setGState(new doc.GState({ opacity: 0.12 }));
                doc.line(40, 8, 40, 28);
                doc.setGState(new doc.GState({ opacity: 1 }));
                
                textStartX = 46;
            }

            // Header Text
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(lab.name || 'Accu Trace Labs', textStartX, 16);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Near Askari Bank, Tramari, Islamabad', textStartX, 22);
            doc.text('+92 310 1599399 | info@accutracelabs.com', textStartX, 27);

            drawWatermark();

            // PATIENT DETAILS
            doc.setTextColor(15, 23, 42); // #0f172a
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Laboratory Report', 14, 48);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139); // #64748b
            const generatedAtText = `Generated: ${new Date().toLocaleString()}`;
            const sampleIdText = `Sample ID: ${sample.sample_id}`;
            doc.text(sampleIdText, 196 - doc.getTextWidth(sampleIdText), 44);
            doc.text(generatedAtText, 196 - doc.getTextWidth(generatedAtText), 49);

            // Title separator
            doc.setDrawColor(226, 232, 240); // #e2e8f0
            doc.setLineWidth(0.3);
            doc.line(14, 54, 196, 54);

            // Grid Details
            let detailsY = 62;
            const col1 = 14, col2 = 65, col3 = 115, col4 = 165;
            
            // Row 1
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // #94a3b8
            doc.setFont('helvetica', 'bold');
            doc.text('PATIENT', col1, detailsY);
            doc.text('PATIENT ID', col2, detailsY);
            doc.text('GENDER', col3, detailsY);
            doc.text('BLOOD GROUP', col4, detailsY);

            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42); // #0f172a
            doc.text(sample.patient_name || '—', col1, detailsY + 5);
            doc.text(sample.patient_ref || '—', col2, detailsY + 5);
            doc.text(sample.gender || '—', col3, detailsY + 5);
            doc.text(sample.blood_group || '—', col4, detailsY + 5);

            // Row 2
            detailsY += 12;
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('PHONE', col1, detailsY);
            doc.text('CNIC NUMBER', col2, detailsY);
            doc.text('REFERRED BY', col3, detailsY);
            doc.text('PRIORITY', col4, detailsY);

            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text(sample.phone || '—', col1, detailsY + 5);
            doc.text(sample.cnic || '—', col2, detailsY + 5);
            doc.text(sample.referring_doctor || '—', col3, detailsY + 5);
            doc.text(sample.priority || '—', col4, detailsY + 5);

            doc.line(14, detailsY + 10, 196, detailsY + 10);
            let currentY = detailsY + 18;

            tests.forEach((test) => {
                if (currentY > 250) {
                    doc.addPage();
                    drawWatermark();
                    currentY = 20;
                }

                doc.setFontSize(12);
                doc.setTextColor(15, 23, 42);
                doc.setFont('helvetica', 'bold');
                doc.text(test.test_name, 14, currentY);

                const testNameWidth = doc.getTextWidth(test.test_name);
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.setFont('helvetica', 'normal');
                
                doc.setFillColor(241, 245, 249); // #f1f5f9
                doc.setDrawColor(226, 232, 240); // #e2e8f0
                doc.setLineWidth(0.2);
                doc.roundedRect(14 + testNameWidth + 4, currentY - 4, doc.getTextWidth(test.category) + 4, 5, 1, 1, 'FD');
                doc.text(test.category, 14 + testNameWidth + 6, currentY - 0.5);

                currentY += 4;

                autoTable(doc, {
                    startY: currentY,
                    head: [['Parameter', 'Result', 'Unit', 'Normal Range']],
                    body: test.components.map(c => [
                        c.component_name,
                        c.value || '—',
                        c.unit || '—',
                        c.normal_text || (c.normal_min !== null && c.normal_max !== null ? `${c.normal_min} – ${c.normal_max}` : '—'),
                    ]),
                    theme: 'plain',
                    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
                    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 55 } },
                    willDrawCell: (data) => {
                        if (data.section === 'body') {
                            const isAbnormal = test.components[data.row.index]?.is_abnormal;
                            if (isAbnormal) {
                                doc.setFillColor(255, 245, 245); // #fff5f5
                                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                            } else if (data.row.index % 2 !== 0) {
                                doc.setFillColor(248, 250, 252); // #f8fafc
                                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                            }
                        }
                    },
                    didParseCell: (data) => {
                        if (data.section === 'body') {
                            const isAbnormal = test.components[data.row.index]?.is_abnormal;
                            if (data.column.index === 0) {
                                data.cell.styles.textColor = [30, 41, 59];
                                data.cell.styles.fontStyle = 'normal';
                            } else if (data.column.index === 1) {
                                data.cell.styles.textColor = isAbnormal ? [239, 68, 68] : [30, 41, 59]; // #ef4444 or #1e293b
                                data.cell.styles.fontStyle = 'bold';
                            } else {
                                data.cell.styles.textColor = [100, 116, 139]; // #64748b
                            }
                        }
                    },
                    margin: { left: 14, right: 14 },
                });

                // Frame the table
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.3);
                doc.rect(14, currentY, 182, doc.lastAutoTable.finalY - currentY, 'S');
                
                currentY = doc.lastAutoTable.finalY + 12;
            });

            if (sample.notes) {
                if (currentY + 20 > 250) { doc.addPage(); drawWatermark(); currentY = 20; }
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42); // #0f172a
                doc.text('Findings', 14, currentY);

                currentY += 2;
                doc.setDrawColor(226, 232, 240); // #e2e8f0
                doc.setLineWidth(0.3);
                doc.line(14, currentY, 196, currentY);

                currentY += 4;
                const splitNotes = doc.splitTextToSize(sample.notes, 178);
                const rectHeight = (splitNotes.length * 5) + 10;
                
                doc.setFillColor(248, 250, 252); // #f8fafc
                doc.setDrawColor(226, 232, 240); // #e2e8f0
                doc.roundedRect(14, currentY, 182, rectHeight, 2, 2, 'FD');
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85); // #334155
                doc.text(splitNotes, 16, currentY + 6);

                currentY += rectHeight + 8;
            }

            if (sample.remarks) {
                if (currentY + 20 > 250) { doc.addPage(); drawWatermark(); currentY = 20; }
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(148, 163, 184); // #94a3b8
                doc.text('CLINICAL REMARKS', 14, currentY);

                currentY += 4;
                const splitRemarks = doc.splitTextToSize(sample.remarks, 178);
                const rectHeight = (splitRemarks.length * 5) + 10;
                
                doc.setFillColor(248, 250, 252); // #f8fafc
                doc.setDrawColor(226, 232, 240); // #e2e8f0
                doc.roundedRect(14, currentY, 182, rectHeight, 2, 2, 'FD');
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85); // #334155
                doc.text(splitRemarks, 16, currentY + 6);

                currentY += rectHeight + 10;
            }

            if (currentY + 30 > 280) { doc.addPage(); drawWatermark(); currentY = 20; }

            // Signature (3 columns)
            currentY += 10;
            if (currentY + 30 > 280) { doc.addPage(); drawWatermark(); currentY = 20; }
            doc.setDrawColor(15, 23, 42); // #0f172a
            doc.setLineWidth(0.5); // equivalent to 1.5px
            
            // Lines
            doc.line(14, currentY, 60, currentY);     // Col 1 line
            doc.line(75, currentY, 125, currentY);    // Col 2 line
            doc.line(135, currentY, 196, currentY);   // Col 3 line
            
            currentY += 5;
            
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42); // #0f172a
            doc.setFont('helvetica', 'bold');
            doc.text('Muhammad Tallal Sajid', 14, currentY);
            doc.text('Dr. Rabbia Khalid Latif', 75, currentY);
            doc.text('Dr. Sajid Latif', 135, currentY);
            
            currentY += 4;
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85); // #334155
            doc.setFont('helvetica', 'normal');
            doc.text('CEO / Microbiologist', 14, currentY);
            doc.text('Consultant Pathologist', 75, currentY);
            doc.text('Consultant Physician', 135, currentY);

            currentY += 4;
            doc.text('Accu Trace Labs (Pvt) Ltd', 14, currentY);
            doc.text('M.Phil Haematology', 75, currentY);
            doc.text('Director – Accu Trace Labs, MBBS', 135, currentY);

            currentY += 4;
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139); // #64748b
            doc.text('PMDC Reg No: 57687-P', 75, currentY);

            // Footer
            doc.setFillColor(248, 250, 252);
            doc.rect(0, 285, 210, 12, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.line(0, 285, 210, 285);
            doc.setTextColor(148, 163, 184);
            const footerTxt = 'This is a computer-generated report | Accu Trace Labs LIMS V1.0';
            doc.text(footerTxt, 105 - (doc.getTextWidth(footerTxt) / 2), 291);

            doc.save(`AccuTrace-Report-${sample.sample_id}.pdf`);
            toast.success('PDF downloaded');
        } catch (err) {
            console.error('PDF error:', err);
            toast.error('PDF generation failed');
        }
    };

    if (loading) return <LabLoader text="Generating Report" />;
    if (!data) return <div className="p-6">Report not found.</div>;

    const { lab, sample, tests, generated_at } = data;

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 max-w-4xl mx-auto">
                <Link to={`/samples/${sampleId}`} className="btn-secondary w-full sm:w-auto justify-center"><ArrowLeft className="w-4 h-4" /> Back</Link>
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
                    <button onClick={handlePDF} id="download-pdf-btn" className="btn-primary flex-1 sm:flex-none justify-center"><Download className="w-4 h-4" /> Download PDF</button>
                    <button onClick={handlePrint} className="btn-secondary flex-1 sm:flex-none justify-center"><Printer className="w-4 h-4" /> Print</button>
                </div>
            </div>

            <div ref={printRef} className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden relative" style={{ minHeight: '800px' }}>
                <img src="/Lab_Logo.png" className="watermark" alt="watermark" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', objectFit: 'contain', opacity: 0.055, pointerEvents: 'none', userSelect: 'none', zIndex: 0 }} />

                <div className="bg-sidebar p-5 sm:p-8 text-white relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center">
                            <div className="bg-white" style={{ width: '68px', height: '68px', padding: '6px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', flexShrink: 0 }}>
                                <img src="/flask_lab_logo_1.png" alt="Flask Logo" className="w-full h-full object-contain" />
                            </div>
                            <div style={{ width: '1px', height: '48px', background: 'rgba(255,255,255,0.12)', margin: '0 16px' }} className="hidden sm:block"></div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold">{lab.name}</h1>
                                <p className="text-slate-300 text-sm mt-1">Near Askari Bank, Tramari, Islamabad</p>
                                <p className="text-slate-300 text-sm">+92 310 1599399 · info@accutracelabs.com</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-7 sm:p-[28px] bg-white relative z-10">
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Laboratory Report</h2>
                            <div className="text-left sm:text-right" style={{ fontSize: '12px', color: '#64748b' }}>
                                <p>Sample ID: <span className="font-mono">{sample.sample_id}</span></p>
                                <p>Generated: {new Date(generated_at).toLocaleString()}</p>
                            </div>
                        </div>
                        <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 gap-y-6">
                            {[
                                { label: 'Patient', value: sample.patient_name },
                                { label: 'Patient ID', value: sample.patient_ref },
                                { label: 'Gender', value: sample.gender || '—' },
                                { label: 'Blood Group', value: sample.blood_group || '—' },
                                { label: 'Phone', value: sample.phone || '—' },
                                { label: 'CNIC Number', value: sample.cnic || '—' },
                                { label: 'Referred By', value: sample.referring_doctor || '—' },
                                { label: 'Priority', value: sample.priority },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '4px 0 0 0' }}>{value}</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ borderBottom: '1px solid #e2e8f0', marginTop: '16px' }}></div>
                    </div>

                    <div className="space-y-[24px]">
                        {tests.map(test => (
                            <div key={test.sample_test_id} style={{ marginBottom: '24px' }}>
                                <div className="flex items-center gap-3" style={{ marginBottom: '10px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{test.test_name}</h3>
                                    <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '2px 9px' }}>{test.category}</span>
                                </div>
                                <div className="overflow-x-auto table-container" style={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <table className="w-full whitespace-nowrap" style={{ borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#1e293b', color: 'white', fontSize: '12px', fontWeight: 600 }}>
                                                <th className="text-left" style={{ padding: '11px 16px' }}>Parameter</th>
                                                <th className="text-left" style={{ padding: '11px 16px' }}>Result</th>
                                                <th className="text-left hidden sm:table-cell" style={{ padding: '11px 16px' }}>Unit</th>
                                                <th className="text-left hidden sm:table-cell" style={{ padding: '11px 16px' }}>Normal Range</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {test.components.map((c, i) => (
                                                <tr key={i} style={{ background: c.is_abnormal ? '#fff5f5' : (i % 2 === 0 ? 'white' : '#f8fafc'), borderBottom: 'none' }}>
                                                    <td className="font-medium" style={{ padding: '11px 16px', fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{c.component_name}</td>
                                                    <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: 700, color: c.is_abnormal ? '#ef4444' : '#1e293b' }}>
                                                        {c.value || '—'}
                                                    </td>
                                                    <td className="hidden sm:table-cell" style={{ padding: '11px 16px', fontSize: '13px', color: '#64748b' }}>{c.unit || '—'}</td>
                                                    <td className="hidden sm:table-cell" style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                                                        {c.normal_text || (c.normal_min !== null && c.normal_max !== null ? `${c.normal_min} – ${c.normal_max}` : '—')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}

                        {sample.notes && (
                            <div className="mt-8 pt-4">
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Findings</h3>
                                <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '12px' }}></div>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#334155', lineHeight: '1.7' }} className="whitespace-pre-wrap">
                                    {sample.notes}
                                </div>
                            </div>
                        )}

                        {sample.remarks && (
                            <div className="mt-8 pt-4">
                                <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Clinical Remarks</h3>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#334155', lineHeight: '1.65' }} className="whitespace-pre-wrap">
                                    {sample.remarks}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', marginTop: '40px', paddingTop: '0' }}>
                        {/* Col 1 */}
                        <div style={{ paddingTop: '10px' }}>
                            <div style={{ borderTop: '1.5px solid #0f172a', width: '100%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></div>
                            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '8px 0 2px 0' }}>Muhammad Tallal Sajid</h4>
                            <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.7', margin: 0 }}>CEO / Microbiologist</p>
                            <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.7', margin: 0 }}>Accu Trace Labs (Pvt) Ltd</p>
                        </div>
                        {/* Col 2 */}
                        <div style={{ paddingTop: '10px' }}>
                            <div style={{ borderTop: '1.5px solid #0f172a', width: '100%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></div>
                            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '8px 0 2px 0' }}>Dr. Rabbia Khalid Latif</h4>
                            <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.7', margin: 0 }}>Consultant Pathologist</p>
                            <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.7', margin: 0 }}>M.Phil Haematology</p>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>PMDC Reg No: 57687-P</p>
                        </div>
                        {/* Col 3 */}
                        <div style={{ paddingTop: '10px' }}>
                            <div style={{ borderTop: '1.5px solid #0f172a', width: '100%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></div>
                            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '8px 0 2px 0' }}>Dr. Sajid Latif</h4>
                            <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.7', margin: 0 }}>Consultant Physician</p>
                            <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.7', margin: 0 }}>Director – Accu Trace Labs, MBBS</p>
                        </div>
                    </div>
                </div>
                
                <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '12px', textAlign: 'center' }} className="relative z-10 w-full mt-auto">
                    <p style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', margin: 0 }}>This is a computer-generated report · Accu Trace Labs LIMS V1.0</p>
                </div>
            </div>

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
