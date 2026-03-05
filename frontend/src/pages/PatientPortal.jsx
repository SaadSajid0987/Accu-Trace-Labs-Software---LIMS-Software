import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Download, Loader2, Phone, Mail, MapPin, ShieldCheck, FileText } from 'lucide-react';
import axios from 'axios';

export default function PatientPortal() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`/api/portal/${token}`)
            .then(r => setData(r.data))
            .catch(() => setData({ status: 'error' }))
            .finally(() => setLoading(false));
    }, [token]);

    // ── Loading State ──
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 text-sm font-medium">Loading your results…</p>
                </div>
            </div>
        );
    }

    const lab = data?.lab || {};
    const labName = lab.lab_name || 'Accu Trace Labs';
    const labPhone = lab.phone1 || '';
    const labEmail = lab.email || '';
    const labAddress = lab.address || '';
    const labLogo = lab.lab_logo;
    const labTagline = lab.tagline || '';
    const labLicense = lab.license_number || '';

    // ── Error States ──
    if (!data || data.status === 'error' || data.status === 'not_found') {
        return <ErrorPage title="Link Not Found" message="This link does not exist or has been removed." lab={{ labName, labPhone, labEmail }} />;
    }
    if (data.status === 'expired') {
        return <ErrorPage title="Link Expired" message="This link has expired. Please contact the lab for a new link." lab={{ labName, labPhone, labEmail }} />;
    }

    // ── Lab Header Component ──
    const LabHeader = () => (
        <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white px-6 py-8 sm:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-start gap-4">
                    {labLogo && (
                        <img
                            src={labLogo.startsWith('http') ? labLogo : `${window.location.origin}${labLogo}`}
                            alt="Logo" className="w-14 h-14 object-contain rounded-lg bg-white/10 p-1"
                        />
                    )}
                    <div className="flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{labName}</h1>
                        {labTagline && <p className="text-slate-300 text-sm mt-0.5">{labTagline}</p>}
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                    {labAddress && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{labAddress}</span>}
                    {labPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{labPhone}</span>}
                    {labEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{labEmail}</span>}
                    {labLicense && <span>License: {labLicense}</span>}
                </div>
            </div>
        </div>
    );

    // ── Report View ──
    if (data.link_type === 'Report') {
        return <ReportView data={data.data} LabHeader={LabHeader} labName={labName} />;
    }

    // ── Invoice View ──
    if (data.link_type === 'Invoice') {
        return <InvoiceView data={data.data} LabHeader={LabHeader} labName={labName} />;
    }

    return <ErrorPage title="Unknown Link Type" message="This link could not be processed." lab={{ labName, labPhone, labEmail }} />;
}

// ────────────────────────────────────────────
// Error Page
// ────────────────────────────────────────────
function ErrorPage({ title, message, lab }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-slate-200">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
                <p className="text-slate-500 text-sm mb-6">{message}</p>
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">{lab.labName}</p>
                    {lab.labPhone && <p className="flex items-center justify-center gap-1"><Phone className="w-3.5 h-3.5" />{lab.labPhone}</p>}
                    {lab.labEmail && <p className="flex items-center justify-center gap-1"><Mail className="w-3.5 h-3.5" />{lab.labEmail}</p>}
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────
// Report View
// ────────────────────────────────────────────
function ReportView({ data, LabHeader, labName }) {
    const { sample, tests } = data;

    const handlePDF = async () => {
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // Header
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 210, 38, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(labName, 14, 14);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Sample: ${sample.sample_id}`, 14, 22);
            doc.text(`Patient: ${sample.patient_name}`, 14, 28);
            doc.text(`Date: ${new Date(sample.created_at).toLocaleDateString()}`, 14, 34);

            let y = 46;

            // Patient info
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            const infoLines = [
                `CNIC: ${sample.cnic || '—'}`,
                `Gender: ${sample.gender || '—'}  |  DOB: ${sample.dob ? new Date(sample.dob).toLocaleDateString() : '—'}`,
                `Referred By: ${sample.referring_doctor || '—'}`,
            ];
            infoLines.forEach(line => { doc.text(line, 14, y); y += 6; });
            y += 4;

            // Tests
            tests.forEach(test => {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(test.test_name, 14, y);
                y += 2;

                const tableData = test.components.map(c => {
                    const range = c.normal_text || (c.normal_min != null && c.normal_max != null ? `${c.normal_min} – ${c.normal_max}` : '—');
                    return [c.component_name, c.value || '—', c.unit || '—', range, c.is_abnormal ? 'ABNORMAL' : ''];
                });

                autoTable(doc, {
                    startY: y,
                    head: [['Parameter', 'Result', 'Unit', 'Normal Range', 'Flag']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
                    bodyStyles: { fontSize: 8 },
                    columnStyles: { 4: { textColor: [220, 38, 38], fontStyle: 'bold' } },
                    margin: { left: 14, right: 14 },
                });
                y = doc.lastAutoTable.finalY + 10;
            });

            // Verification
            if (sample.verified_by_name) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text(`Verified by: ${sample.verified_by_name}`, 14, y);
                y += 6;
            }

            doc.text('This is a computer-generated report.', 14, y + 4);

            doc.save(`AccuTrace-Report-${sample.sample_id}.pdf`);
        } catch (err) {
            console.error('PDF error:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            <LabHeader />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                {/* Report Title */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" /> Laboratory Report
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Sample ID: <span className="font-mono font-bold text-slate-700">{sample.sample_id}</span></p>
                        </div>
                        {sample.is_verified && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                <ShieldCheck className="w-4 h-4" /> Verified by {sample.verified_by_name}
                            </div>
                        )}
                    </div>
                </div>

                {/* Patient Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Patient Information</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        {[
                            { l: 'Patient', v: sample.patient_name },
                            { l: 'CNIC', v: sample.cnic || '—' },
                            { l: 'Referring Dr', v: sample.referring_doctor || '—' },
                            { l: 'Gender', v: sample.gender || '—' },
                            { l: 'DOB', v: sample.dob ? new Date(sample.dob).toLocaleDateString() : '—' },
                            { l: 'Date', v: new Date(sample.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                        ].map(({ l, v }) => (
                            <div key={l}>
                                <p className="text-xs text-slate-400">{l}</p>
                                <p className="font-semibold text-slate-800 mt-0.5">{v}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Test Results */}
                {tests.map(test => (
                    <div key={test.sample_test_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-sm">{test.test_name}</h3>
                            {test.category && <span className="text-xs text-slate-400">{test.category}</span>}
                        </div>
                        <div className="overflow-x-auto table-container">
                            <table className="w-full text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-800 text-white text-xs">
                                        <th className="text-left px-4 py-2.5 sticky-col z-10 bg-slate-800 text-white">Parameter</th>
                                        <th className="text-left px-4 py-2.5">Result</th>
                                        <th className="text-left px-4 py-2.5 hidden sm:table-cell">Unit</th>
                                        <th className="text-left px-4 py-2.5 hidden sm:table-cell">Normal Range</th>
                                        <th className="text-left px-4 py-2.5">Flag</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {test.components.map((c, i) => {
                                        const range = c.normal_text || (c.normal_min != null && c.normal_max != null ? `${c.normal_min} – ${c.normal_max}` : '—');
                                        return (
                                            <tr key={i} className={`border-b border-slate-100 ${c.is_abnormal ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                <td className="px-4 py-2.5 font-medium text-slate-800 sticky-col z-10 bg-inherit">{c.component_name}</td>
                                                <td className={`px-4 py-2.5 font-semibold ${c.is_abnormal ? 'text-red-600' : 'text-slate-800'}`}>{c.value || '—'}</td>
                                                <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{c.unit || '—'}</td>
                                                <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{range}</td>
                                                <td className="px-4 py-2.5">
                                                    {c.is_abnormal && (
                                                        <span className="flex items-center gap-1 text-red-600 font-bold text-xs">
                                                            <AlertTriangle className="w-3 h-3" /> ABNORMAL
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {/* Download PDF */}
                <div className="text-center pt-2 pb-8">
                    <button
                        onClick={handlePDF}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                    >
                        <Download className="w-4 h-4" /> Download as PDF
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 pb-6">
                    <p>This is a computer-generated report from {labName}.</p>
                    <p className="mt-1">Report generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────
// Invoice View
// ────────────────────────────────────────────
function InvoiceView({ data, LabHeader, labName }) {
    const invoice = data;
    const items = data.items || [];

    const subtotal = parseFloat(invoice.subtotal) || 0;
    const discount = parseFloat(invoice.discount_amount) || 0;
    const net = parseFloat(invoice.net_payable) || 0;
    const paid = parseFloat(invoice.amount_paid) || 0;
    const balance = parseFloat(invoice.balance_due) || 0;
    const isPaid = invoice.payment_status === 'Paid';

    const statusColor = { Paid: 'bg-emerald-100 text-emerald-700', Partial: 'bg-amber-100 text-amber-700', Unpaid: 'bg-red-100 text-red-700' };

    const handlePDF = async () => {
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // Header
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 210, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(labName, 14, 14);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Invoice: ${invoice.invoice_number}`, 14, 22);

            let y = 40;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text(`Patient: ${invoice.patient_name_snapshot}`, 14, y); y += 6;
            doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 14, y); y += 6;
            if (invoice.referring_doctor_snapshot) { doc.text(`Ref. Doctor: ${invoice.referring_doctor_snapshot}`, 14, y); y += 6; }
            y += 4;

            // Items table
            const tableData = items.map((item, idx) => [
                idx + 1,
                item.test_name_snapshot,
                item.quantity,
                `PKR ${parseFloat(item.price_snapshot).toLocaleString()}`,
                `PKR ${parseFloat(item.line_total).toLocaleString()}`
            ]);

            autoTable(doc, {
                startY: y,
                head: [['#', 'Test Name', 'Qty', 'Unit Price', 'Total']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 10;

            // Summary
            const summaryLines = [
                ['Subtotal', `PKR ${subtotal.toLocaleString()}`],
            ];
            if (discount > 0) summaryLines.push(['Discount', `-PKR ${discount.toLocaleString()}`]);
            summaryLines.push(['Net Payable', `PKR ${net.toLocaleString()}`]);
            summaryLines.push(['Amount Paid', `PKR ${paid.toLocaleString()}`]);
            summaryLines.push(['Balance Due', `PKR ${balance.toLocaleString()}`]);
            summaryLines.push(['Status', invoice.payment_status]);

            summaryLines.forEach(([label, val]) => {
                doc.text(`${label}: ${val}`, 120, y);
                y += 6;
            });

            doc.save(`AccuTrace-Invoice-${invoice.invoice_number}.pdf`);
        } catch (err) {
            console.error('PDF error:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            <LabHeader />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                {/* Invoice Header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
                    {isPaid && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] text-7xl font-black text-emerald-500/10 tracking-widest pointer-events-none select-none">
                            PAID
                        </div>
                    )}
                    <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">INVOICE</h2>
                            <p className="text-sm font-mono font-bold text-blue-600 mt-0.5">{invoice.invoice_number}</p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${statusColor[invoice.payment_status] || 'bg-slate-100 text-slate-600'}`}>
                            {invoice.payment_status}
                        </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-slate-400">Patient</p>
                            <p className="font-semibold text-slate-800">{invoice.patient_name_snapshot}</p>
                        </div>
                        {invoice.cnic_snapshot && (
                            <div>
                                <p className="text-xs text-slate-400">CNIC</p>
                                <p className="font-semibold text-slate-800">{invoice.cnic_snapshot}</p>
                            </div>
                        )}
                        {invoice.referring_doctor_snapshot && (
                            <div>
                                <p className="text-xs text-slate-400">Referring Doctor</p>
                                <p className="font-semibold text-slate-800">{invoice.referring_doctor_snapshot}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto table-container">
                        <table className="w-full text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-800 text-white text-xs">
                                    <th className="text-left px-4 py-2.5 w-10">#</th>
                                    <th className="text-left px-4 py-2.5 sticky-col z-10 bg-slate-800 text-white">Test Name</th>
                                    <th className="text-center px-4 py-2.5">Qty</th>
                                    <th className="text-right px-4 py-2.5 hidden sm:table-cell">Unit Price</th>
                                    <th className="text-right px-4 py-2.5">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                                        <td className="px-4 py-2.5 font-medium text-slate-800 sticky-col z-10 bg-inherit">{item.test_name_snapshot}</td>
                                        <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                                        <td className="px-4 py-2.5 text-right hidden sm:table-cell">PKR {parseFloat(item.price_snapshot).toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold">PKR {parseFloat(item.line_total).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="max-w-xs ml-auto space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="font-medium">PKR {subtotal.toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-red-600">
                                <span>Discount {invoice.discount_reason ? `(${invoice.discount_reason})` : ''}</span>
                                <span>−PKR {discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t-2 border-slate-200 font-bold text-base">
                            <span>Net Payable</span>
                            <span>PKR {net.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Amount Paid</span>
                            <span className="font-medium text-emerald-600">PKR {paid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Balance Due</span>
                            <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>PKR {balance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Payment Method</span>
                            <span className="font-medium">{invoice.payment_method || '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Download PDF */}
                <div className="text-center pt-2 pb-8">
                    <button
                        onClick={handlePDF}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                    >
                        <Download className="w-4 h-4" /> Download as PDF
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 pb-6">
                    <p>Thank you for choosing {labName}.</p>
                    <p className="mt-1">This is a computer-generated invoice.</p>
                </div>
            </div>
        </div>
    );
}
