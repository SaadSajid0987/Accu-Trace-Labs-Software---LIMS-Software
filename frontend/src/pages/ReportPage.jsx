import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsAPI } from '../api/index.js';
import { Printer, Download, ArrowLeft, AlertTriangle, Loader2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';
import ShareModal from '../components/ShareModal.jsx';
import { portalAPI } from '../api/index.js';

function QRPlaceholder({ text }) {
    return (
        <div className="w-20 h-20 border-2 border-slate-300 flex items-center justify-center rounded bg-white">
            <div className="text-center">
                <div className="grid grid-cols-3 gap-0.5 mb-1">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-sm ${Math.random() > 0.5 ? 'bg-slate-800' : 'bg-white border border-slate-200'}`} />
                    ))}
                </div>
                <p className="text-[8px] text-slate-400">QR Code</p>
            </div>
        </div>
    );
}

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

            // Re-fetch report data
            const { report } = await reportsAPI.get(sampleId).then(r => r.data);
            const { lab, sample, tests } = report;

            // ==========================================
            // HEADER BANNER (Top Dark Blue Section)
            // ==========================================
            doc.setFillColor(30, 42, 74); // Dark blue background matching sidebar (#1E2A4A)
            doc.rect(0, 0, 210, 36, 'F');

            // Header Text (White)
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(lab.name || 'Accu Trace Labs', 14, 14);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(lab.address || '123 Medical Center, Lahore, Pakistan', 14, 20);
            doc.text(`${lab.phone || '+92-42-3456789'} | ${lab.email || 'info@accutracelabs.com'}`, 14, 25);
            doc.setTextColor(180, 190, 210); // Slightly dimmed
            doc.text(`License: ${lab.license || 'LIC-2024-PAK-0123'}`, 14, 31);

            // ==========================================
            // PATIENT & SAMPLE DETAILS SECTION
            // ==========================================
            doc.setTextColor(40, 50, 70);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Laboratory Report', 14, 46);

            // Sample ID & Generated Date (Top Right of section)
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            const generatedAtText = `Generated: ${new Date().toLocaleString()}`;
            const sampleIdText = `Sample ID: ${sample.sample_id}`;
            const generatedWidth = doc.getTextWidth(generatedAtText);
            const sampleIdWidth = doc.getTextWidth(sampleIdText);
            doc.text(sampleIdText, 196 - sampleIdWidth, 42);
            doc.text(generatedAtText, 196 - generatedWidth, 47);

            // Details Grid
            let detailsY = 56;
            const col1 = 14;
            const col2 = 65;
            const col3 = 115;
            const col4 = 165;
            const rowHeight = 9;

            // Row 1
            doc.setFontSize(8);
            doc.setTextColor(130, 130, 130);
            doc.text('Patient', col1, detailsY);
            doc.text('Patient ID', col2, detailsY);
            doc.text('Gender', col3, detailsY);
            doc.text('Blood Group', col4, detailsY);

            doc.setFontSize(9);
            doc.setTextColor(40, 40, 40);
            doc.setFont('helvetica', 'bold');
            doc.text(sample.patient_name || '—', col1, detailsY + 4);
            doc.text(sample.patient_ref || '—', col2, detailsY + 4);
            doc.text(sample.gender || '—', col3, detailsY + 4);
            doc.text(sample.blood_group || '—', col4, detailsY + 4);

            // Row 2
            detailsY += rowHeight;
            doc.setFontSize(8);
            doc.setTextColor(130, 130, 130);
            doc.setFont('helvetica', 'normal');
            doc.text('Phone', col1, detailsY);
            doc.text('CNIC Number', col2, detailsY);
            doc.text('Referred By', col3, detailsY);
            doc.text('Priority', col4, detailsY);

            doc.setFontSize(9);
            doc.setTextColor(40, 40, 40);
            doc.setFont('helvetica', 'bold');
            doc.text(sample.phone || '—', col1, detailsY + 4);
            doc.text(sample.cnic || '—', col2, detailsY + 4);
            doc.text(sample.referring_doctor || '—', col3, detailsY + 4);
            doc.text(sample.priority || '—', col4, detailsY + 4);

            // Draw a subtle line to separate header info from tables
            doc.setDrawColor(230, 230, 230);
            doc.line(14, detailsY + 10, 196, detailsY + 10);

            let currentY = detailsY + 20;

            // ==========================================
            // TEST RESULTS TABLES
            // ==========================================
            tests.forEach((test, testIndex) => {
                // Check if page break is needed
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                // Test Name & Category
                doc.setFontSize(11);
                doc.setTextColor(40, 50, 70);
                doc.setFont('helvetica', 'bold');
                doc.text(test.test_name, 14, currentY);

                // Add Category badge text
                const testNameWidth = doc.getTextWidth(test.test_name);
                doc.setFontSize(8);
                doc.setTextColor(100, 110, 130);
                doc.setFont('helvetica', 'normal');
                // Simulate the badge
                doc.setFillColor(241, 245, 249); // slate-100
                doc.roundedRect(14 + testNameWidth + 3, currentY - 3.5, doc.getTextWidth(test.category) + 4, 5, 1, 1, 'F');
                doc.text(test.category, 14 + testNameWidth + 5, currentY);

                currentY += 4;

                // Configure AutoTable
                autoTable(doc, {
                    startY: currentY,
                    head: [['Component', 'Value', 'Unit', 'Normal Range', 'Flag']],
                    body: test.components.map(c => [
                        c.component_name,
                        c.value || '—',
                        c.unit || '—',
                        c.normal_text || (c.normal_min !== null && c.normal_max !== null ? `${c.normal_min} – ${c.normal_max}` : '—'),
                        c.is_abnormal ? '&  A B N O R M A L' : '', // Matching the flag style in right image
                    ]),
                    theme: 'plain', // Use plain to control all borders/colors manually
                    styles: {
                        fontSize: 8,
                        cellPadding: 3,
                        font: 'helvetica'
                    },
                    headStyles: {
                        fillColor: [30, 42, 74],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    columnStyles: {
                        0: { cellWidth: 50 }, // Component Name
                        1: { cellWidth: 25 }, // Value
                        2: { cellWidth: 20 }, // Unit
                        3: { cellWidth: 50 }, // Normal Range
                        4: { cellWidth: 35 }  // Flag
                    },
                    didParseCell: (data) => {
                        // Alternate row backgrounds (light gray for even rows)
                        if (data.section === 'body') {
                            if (data.row.index % 2 !== 0) {
                                data.cell.styles.fillColor = [248, 249, 250];
                            }

                            // Check if current row has the ABNORMAL flag (index 4)
                            const isAbnormal = data.row.raw[4] !== '';

                            if (isAbnormal) {
                                // Red text for value
                                if (data.column.index === 1) {
                                    data.cell.styles.textColor = [220, 38, 38];
                                }
                                // Red text and flag format
                                if (data.column.index === 4) {
                                    data.cell.styles.textColor = [220, 38, 38];
                                }
                            } else {
                                // Default dark gray for normal body text, slightly lighter for units/ranges
                                if (data.column.index === 0 || data.column.index === 1) {
                                    data.cell.styles.textColor = [60, 60, 60];
                                } else {
                                    data.cell.styles.textColor = [120, 120, 120];
                                }
                            }
                        }
                    },
                    margin: { left: 14, right: 14 },
                });

                currentY = doc.lastAutoTable.finalY + 12;
            });

            // ==========================================
            // REMARKS SECTION
            // ==========================================
            if (sample.remarks) {
                // Check if page break is needed for remarks
                if (currentY + 20 > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(40, 50, 70);
                doc.text('Clinical Remarks', 14, currentY);

                currentY += 6;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);

                // Wrap text to fit page width (14mm margin on both sides = 182mm available)
                const splitRemarks = doc.splitTextToSize(sample.remarks, 182);
                doc.text(splitRemarks, 14, currentY);

                // Advance Y by the height of the generated text block (approx 4.5mm per line)
                currentY += (splitRemarks.length * 4.5) + 10;
            }

            // ==========================================
            // FOOTER & SIGNATURE
            // ==========================================
            // Check if footer fits, otherwise add page
            if (currentY + 30 > 290) { // 297 is A4 max height
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');

            doc.text(`Verified by: ${sample.verified_by_name || 'Dr. Sarah Admin'}`, 14, currentY + 10);
            doc.text('Signature: ______________________', 14, currentY + 17);
            doc.text('This is a computer-generated report. Accu Trace Labs LIMS', 14, currentY + 25);

            // Save PDF
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
            {/* Toolbar (hidden when printing) */}
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

            {/* Report */}
            <div ref={printRef} className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-sidebar p-5 sm:p-8 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">{lab.name}</h1>
                            <p className="text-slate-300 text-sm mt-1">{lab.address}</p>
                            <p className="text-slate-300 text-sm">{lab.phone} · {lab.email}</p>
                            <p className="text-slate-400 text-xs mt-1">License: {lab.license}</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <QRPlaceholder text={sample.sample_id} />
                            <p className="text-slate-400 text-xs mt-1">Scan for verification</p>
                        </div>
                    </div>
                </div>

                {/* Sample details */}
                <div className="px-5 sm:px-8 py-5 border-b border-slate-200 bg-slate-50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <h2 className="text-lg font-bold text-slate-800">Laboratory Report</h2>
                        <div className="text-left sm:text-right text-xs text-slate-500">
                            <p>Sample ID: <span className="font-mono font-bold text-slate-800">{sample.sample_id}</span></p>
                            <p>Generated: {new Date(generated_at).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                                <p className="text-xs text-slate-500">{label}</p>
                                <p className="font-semibold text-slate-800">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Result tables */}
                <div className="px-5 sm:px-8 py-6 space-y-8">
                    {tests.map(test => (
                        <div key={test.sample_test_id}>
                            <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-base font-bold text-slate-800">{test.test_name}</h3>
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{test.category}</span>
                            </div>
                            <div className="overflow-x-auto table-container">
                                <table className="w-full text-sm border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-slate-800 text-white">
                                            <th className="text-left px-3 py-2 text-xs sticky-col z-10 bg-slate-800 text-white">Parameter</th>
                                            <th className="text-left px-3 py-2 text-xs">Result</th>
                                            <th className="text-left px-3 py-2 text-xs hidden sm:table-cell">Unit</th>
                                            <th className="text-left px-3 py-2 text-xs hidden sm:table-cell">Normal Range</th>
                                            <th className="text-left px-3 py-2 text-xs">Flag</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {test.components.map((c, i) => (
                                            <tr key={i} className={`border-b border-slate-100 ${c.is_abnormal ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                <td className="px-3 py-2 font-medium text-slate-500 sticky-col z-10 bg-inherit">{c.component_name}</td>
                                                <td className={`px-3 py-2 font-semibold ${c.is_abnormal ? 'text-red-600' : 'text-slate-800'}`}>
                                                    {c.value || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{c.unit || '—'}</td>
                                                <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">
                                                    {c.normal_text || (c.normal_min !== null && c.normal_max !== null ? `${c.normal_min} – ${c.normal_max}` : '—')}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {c.is_abnormal && (
                                                        <span className="flex items-center gap-1 text-red-600 font-bold text-xs">
                                                            <AlertTriangle className="w-3 h-3" /> HIGH/LOW
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Clinical Remarks */}
                    {sample.remarks && (
                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Clinical Remarks</h3>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{sample.remarks}</p>
                        </div>
                    )}
                </div>

                {/* Footer / Signature */}
                <div className="px-5 sm:px-8 py-6 border-t border-slate-200 bg-slate-50">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div>
                            <div className="h-12 w-48 border-b-2 border-slate-400 mb-1" />
                            <p className="text-sm font-semibold text-slate-800">{sample.verified_by_name || 'Pathologist'}</p>
                            <p className="text-xs text-slate-500">Verified & Signed</p>
                            {sample.verified_at && <p className="text-xs text-slate-400">{new Date(sample.verified_at).toLocaleString()}</p>}
                        </div>
                        <div className="text-left sm:text-right text-xs text-slate-400">
                            <p className="font-medium text-slate-600">{lab.name}</p>
                            <p>This is a computer-generated report.</p>
                            <p>Report ID: {sample.sample_id} · {new Date(generated_at).toLocaleDateString()}</p>
                        </div>
                    </div>
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
