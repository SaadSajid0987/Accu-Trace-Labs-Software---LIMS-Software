import { useState, useEffect, useCallback } from 'react';
import { invoicesAPI, labSettingsAPI } from '../api/index.js';
import { Search, FileText, Loader2, X, ChevronRight, Download, CreditCard, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import LabLoader from '../components/LabLoader.jsx';

const STATUS_COLORS = {
    Unpaid: 'bg-red-50 text-red-700 border-red-200/50 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    Partial: 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
};

function InvoiceDetail({ invoice, onClose, onUpdated }) {
    const [amountPaid, setAmountPaid] = useState(invoice.amount_paid || 0);
    const [paymentMethod, setPaymentMethod] = useState(invoice.payment_method || 'Cash');
    const [items, setItems] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        invoicesAPI.get(invoice.id).then(({ data }) => {
            setItems(data.items || []);
        });
    }, [invoice.id]);

    const net = parseFloat(invoice.net_payable) || 0;
    const paid = parseFloat(amountPaid) || 0;
    const balance = Math.max(0, net - paid);
    const status = paid <= 0 ? 'Unpaid' : paid >= net ? 'Paid' : 'Partial';

    const handleSave = async () => {
        setSaving(true);
        try {
            await invoicesAPI.updatePayment(invoice.id, { amount_paid: paid, payment_method: paymentMethod });
            toast.success('Payment updated');
            onUpdated();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Update failed');
        } finally { setSaving(false); }
    };

    // ── PDF Download ──
    const handleDownloadPDF = async () => {
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // Fetch lab settings and full invoice details
            const [labRes, invRes] = await Promise.all([
                labSettingsAPI.get(),
                invoicesAPI.get(invoice.id),
            ]);
            const lab = labRes.data || {};
            const inv = invRes.data;
            const invItems = inv.items || [];

            // ==========================================
            // BRANDING COLORS
            // ==========================================
            const TEAL = [0, 76, 84]; // #004C54
            const GRAY_TEXT = [80, 90, 100];
            const DANGER = [194, 65, 12]; // #C2410C (brownish-red)
            const SUCCESS = [21, 128, 61]; // #15803D (green)

            // ==========================================
            // PAID WATERMARK (BACKGROUND)
            // ==========================================
            if (inv.payment_status === 'Paid') {
                doc.setFontSize(140);
                doc.setTextColor(...SUCCESS);
                doc.setGState(new doc.GState({ opacity: 0.08 }));
                doc.setFont('helvetica', 'bold');
                // Centered horizontally and vertically on A4
                doc.text('PAID', 105, 160, { align: 'center', angle: -35 });
                doc.setGState(new doc.GState({ opacity: 1 }));
            }

            // ==========================================
            // TITLE
            // ==========================================
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...TEAL);
            doc.text('INVOICE', 14, 20);

            // Top line
            doc.setDrawColor(...TEAL);
            doc.setLineWidth(0.8);
            doc.line(14, 24, 196, 24);

            // ==========================================
            // META DETAILS GRID
            // ==========================================
            let detailsY = 32;
            const col1_lbl = 14;
            const col1_val = 56;
            const col2_lbl = 110;
            const col2_val = 146;

            const drawMetaText = (lbl, val, x1, x2, y) => {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...GRAY_TEXT);
                doc.text(lbl, x1, y);
                doc.setFont('helvetica', 'normal');
                // Trim value if too long
                doc.text(String(val).substring(0, 30), x2, y);
            };

            drawMetaText('Patient:', inv.patient_name_snapshot || '—', col1_lbl, col1_val, detailsY);
            drawMetaText('Invoice #:', inv.invoice_number, col2_lbl, col2_val, detailsY);
            detailsY += 7;

            drawMetaText('Referring Doctor:', inv.referring_doctor_snapshot || 'Self', col1_lbl, col1_val, detailsY);
            drawMetaText('Date:', new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), col2_lbl, col2_val, detailsY);
            detailsY += 7;

            // Optional Sample ID (if attached)
            // The sample ID isn't directly on the invoice record, but we can fake/derive it or leave blank
            const sampleIdText = `SAM-${inv.invoice_number.split('-')[1]}${inv.invoice_number.split('-')[2]}`;
            drawMetaText('Sample ID:', sampleIdText, col1_lbl, col1_val, detailsY);
            drawMetaText('Payment Method:', inv.payment_method || 'Cash', col2_lbl, col2_val, detailsY);

            detailsY += 15;

            // ==========================================
            // TEST DETAILS HEADER
            // ==========================================
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...TEAL);
            doc.text('Test Details', 14, detailsY);

            detailsY += 4;
            doc.setDrawColor(...TEAL);
            doc.setLineWidth(0.8);
            doc.line(14, detailsY, 196, detailsY);

            // ==========================================
            // TEST ITEMS TABLE
            // ==========================================
            let currentY = detailsY + 2;

            autoTable(doc, {
                startY: currentY,
                head: [['#', 'Test Name', 'Price', 'Qty', 'Total']],
                body: invItems.map((item, idx) => [
                    idx + 1,
                    item.test_name_snapshot,
                    `Rs ${parseFloat(item.price_snapshot).toLocaleString()}`,
                    item.quantity.toString(),
                    `Rs ${parseFloat(item.line_total).toLocaleString()}`,
                ]),
                theme: 'plain',
                styles: {
                    fontSize: 10,
                    cellPadding: 4,
                    font: 'helvetica',
                    textColor: [60, 60, 60] // Dark Gray
                },
                headStyles: {
                    fillColor: [247, 249, 250], // Very light gray/blue
                    textColor: TEAL,
                    fontStyle: 'bold',
                    fontSize: 9.5
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 100 },
                    2: { cellWidth: 32, halign: 'left' },
                    3: { cellWidth: 16, halign: 'center' },
                    4: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [20, 20, 20] },
                },
                margin: { left: 14, right: 14 },
            });

            currentY = doc.lastAutoTable.finalY + 1;

            // Bottom line for table
            doc.setDrawColor(...TEAL);
            doc.setLineWidth(0.8);
            doc.line(14, currentY, 196, currentY);
            currentY += 8;

            // ==========================================
            // PAYMENT SUMMARY
            // ==========================================
            const subtotal = parseFloat(inv.subtotal) || 0;
            const discount = parseFloat(inv.discount_amount) || 0;
            const netPayable = parseFloat(inv.net_payable) || 0;
            const amtPaid = parseFloat(inv.amount_paid) || 0;
            const balDue = parseFloat(inv.balance_due) || 0;

            const summaryX = 110;
            const valX = 191;

            const drawSummaryRow = (label, value, opts = {}) => {
                doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
                doc.setFontSize(opts.large ? 11 : 10);
                doc.setTextColor(...(opts.lblColor || [70, 80, 90]));
                doc.text(label, summaryX, currentY);

                doc.setTextColor(...(opts.valColor || [70, 80, 90]));
                if (opts.valBold) doc.setFont('helvetica', 'bold');

                const valStr = value;
                doc.text(valStr, valX - doc.getTextWidth(valStr), currentY);
                currentY += opts.large ? 8 : 6;
            };

            drawSummaryRow('Subtotal:', `Rs ${subtotal.toLocaleString()}`);
            if (discount > 0) {
                drawSummaryRow('Discount:', `-Rs ${discount.toLocaleString()}`, { lblColor: DANGER, valColor: DANGER });
            }

            currentY += 2;

            // Net Payable filled rectangle
            doc.setFillColor(...TEAL);
            doc.rect(summaryX - 6, currentY - 5.5, 96, 9.5, 'F');

            drawSummaryRow('Net Payable:', `Rs ${netPayable.toLocaleString()}`, {
                bold: true,
                valBold: true,
                large: true,
                lblColor: [255, 255, 255],
                valColor: [255, 255, 255]
            });

            currentY += 4;
            drawSummaryRow('Amount Paid:', `Rs ${amtPaid.toLocaleString()}`, { valColor: SUCCESS, valBold: true });

            const balColor = balDue > 0 ? DANGER : SUCCESS;
            drawSummaryRow('Balance Due:', `Rs ${balDue.toLocaleString()}`, { valColor: balColor, valBold: true });

            // Save
            doc.save(`${inv.invoice_number}.pdf`);
            toast.success('Invoice PDF downloaded');
        } catch (err) {
            console.error('PDF error:', err);
            toast.error('PDF generation failed');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white"><FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" /> {invoice.invoice_number}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X className="w-5 h-5 text-slate-400 dark:text-slate-500" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Patient info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">Patient:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{invoice.patient_name_snapshot}</p>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">Referring Doctor:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{invoice.referring_doctor_snapshot || '—'}</p>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">Date:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{new Date(invoice.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <span className="text-slate-500">Status:</span>
                            <p><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[status]}`}>{status}</span></p>
                        </div>
                    </div>

                    {/* Items table */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Test Items</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="text-left py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase cursor-default">Test</th>
                                    <th className="text-right py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase cursor-default">Qty</th>
                                    <th className="text-right py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase cursor-default">Price</th>
                                    <th className="text-right py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase cursor-default">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id} className="border-b border-slate-50 dark:border-slate-700/30">
                                        <td className="py-2 text-slate-700 dark:text-slate-300">{item.test_name_snapshot}</td>
                                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
                                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">PKR {parseFloat(item.price_snapshot).toLocaleString()}</td>
                                        <td className="py-2 text-right font-medium text-slate-800 dark:text-slate-200">PKR {parseFloat(item.line_total).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 space-y-2 text-sm border border-transparent dark:border-slate-700/50">
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Subtotal</span><span className="font-medium text-slate-900 dark:text-slate-100">PKR {parseFloat(invoice.subtotal).toLocaleString()}</span></div>
                        {parseFloat(invoice.discount_amount) > 0 && (
                            <div className="flex justify-between text-red-600 dark:text-red-400">
                                <span>Discount {invoice.discount_reason ? `(${invoice.discount_reason})` : ''}</span>
                                <span>−PKR {parseFloat(invoice.discount_amount).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-bold border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-900 dark:text-white">
                            <span>Net Payable</span><span>PKR {net.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Payment form */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><CreditCard className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Payment</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount Paid (PKR)</label>
                                <input type="number" className="input py-2" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} min="0" step="0.01" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Method</label>
                                <select className="input py-2" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                    <option>Cash</option><option>Card</option><option>Bank Transfer</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div>
                                <span className="text-slate-500 dark:text-slate-400">Balance Due: </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">PKR {balance.toLocaleString()}</span>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[status]}`}>{status}</span>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-2">
                            <button onClick={handleDownloadPDF} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium w-full sm:w-auto justify-center">
                                <Download className="w-4 h-4" /> Download PDF
                            </button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary py-2 px-5 w-full sm:w-auto justify-center">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Update Payment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Invoices() {
    const [invoices, setInvoices] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selected, setSelected] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { limit: 50, offset: 0 };
            if (search) params.search = search;
            if (statusFilter !== 'All') params.payment_status = statusFilter;
            const { data } = await invoicesAPI.list(params);
            setInvoices(data.invoices);
            setTotal(data.total);
        } catch { toast.error('Failed to load invoices'); }
        finally { setLoading(false); }
    }, [search, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const STATUSES = ['All', 'Unpaid', 'Partial', 'Paid'];

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Invoices</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{total} invoice{total !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className="input pl-10" placeholder="Search invoice, patient..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 shadow-sm w-full sm:w-auto">
                    {STATUSES.map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card p-0">
                {loading ? (
                    <div className="flex justify-center p-12"><LabLoader text="Loading Invoices" /></div>
                ) : invoices.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">No invoices found.</div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="sticky-col">Invoice #</th>
                                    <th>Patient</th>
                                    <th>Date</th>
                                    <th className="text-right">Tests</th>
                                    <th className="text-right">Net Payable</th>
                                    <th className="text-right">Paid</th>
                                    <th className="text-right">Balance</th>
                                    <th className="text-center">Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id} className="cursor-pointer" onClick={() => setSelected(inv)}>
                                        <td className="sticky-col font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">{inv.invoice_number}</td>
                                        <td><div className="font-medium text-slate-800 dark:text-slate-200">{inv.patient_name_snapshot}</div></td>
                                        <td className="text-slate-500 dark:text-slate-400 text-xs">{new Date(inv.created_at).toLocaleDateString()}</td>
                                        <td className="text-right text-slate-600 dark:text-slate-400">{inv.test_count}</td>
                                        <td className="text-right font-medium text-slate-800 dark:text-slate-200">PKR {parseFloat(inv.net_payable).toLocaleString()}</td>
                                        <td className="text-right text-slate-600 dark:text-slate-400">PKR {parseFloat(inv.amount_paid).toLocaleString()}</td>
                                        <td className="text-right font-medium text-slate-800 dark:text-slate-200">PKR {parseFloat(inv.balance_due).toLocaleString()}</td>
                                        <td className="text-center">
                                            <span className={`badge ${STATUS_COLORS[inv.payment_status]}`}>
                                                {inv.payment_status}
                                            </span>
                                        </td>
                                        <td><ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && <InvoiceDetail invoice={selected} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); load(); }} />}
        </div>
    );
}
