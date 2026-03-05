import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { invoicesAPI, labSettingsAPI, portalAPI } from '../api/index.js';
import { Loader2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ShareModal from '../components/ShareModal.jsx';

export default function InvoicePrint() {
    const { id } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [items, setItems] = useState([]);
    const [lab, setLab] = useState({});
    const [loading, setLoading] = useState(true);
    const [shareModal, setShareModal] = useState({ open: false, link: '', name: '', phone: '' });
    const [shareLoading, setShareLoading] = useState(false);

    useEffect(() => {
        Promise.all([
            invoicesAPI.get(id),
            labSettingsAPI.get(),
        ]).then(([invRes, labRes]) => {
            setInvoice(invRes.data);
            setItems(invRes.data.items || []);
            setLab(labRes.data || {});
        }).finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!loading && invoice) {
            // Auto-print after a small delay
            setTimeout(() => window.print(), 500);
        }
    }, [loading, invoice]);

    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    if (!invoice) return <div className="p-12 text-center text-slate-500">Invoice not found.</div>;

    const subtotal = parseFloat(invoice.subtotal) || 0;
    const discount = parseFloat(invoice.discount_amount) || 0;
    const net = parseFloat(invoice.net_payable) || 0;
    const paid = parseFloat(invoice.amount_paid) || 0;
    const balance = parseFloat(invoice.balance_due) || 0;
    const isPaid = invoice.payment_status === 'Paid';

    return (
        <div className="invoice-print-page">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .invoice-print-page, .invoice-print-page * { visibility: visible; }
                    .invoice-print-page { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
                .invoice-print-page {
                    max-width: 800px; margin: 0 auto; padding: 40px; font-family: 'Inter', system-ui, sans-serif; color: #1e293b;
                }
                .invoice-print-page table { border-collapse: collapse; width: 100%; }
                .invoice-print-page th, .invoice-print-page td { padding: 10px 12px; text-align: left; }
                .invoice-print-page th { border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
                .invoice-print-page td { border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                .paid-stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-18deg); font-size: 72px; font-weight: 900; color: rgba(34,197,94,0.12); letter-spacing: 6px; text-transform: uppercase; pointer-events: none; user-select: none; }
            `}</style>

            {/* Print button */}
            <div className="no-print" style={{ textAlign: 'right', marginBottom: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                    onClick={async () => {
                        setShareLoading(true);
                        try {
                            const { data: res } = await portalAPI.generate({
                                link_type: 'Invoice',
                                reference_id: invoice.id,
                                patient_name: invoice.patient_name_snapshot,
                                patient_phone: invoice.patient_phone_snapshot || '',
                            });
                            setShareModal({ open: true, link: res.link, name: invoice.patient_name_snapshot || '', phone: invoice.patient_phone_snapshot || '' });
                        } catch { toast.error('Failed to generate share link'); }
                        finally { setShareLoading(false); }
                    }}
                    disabled={shareLoading}
                    style={{ padding: '10px 24px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Share
                </button>
                <button onClick={() => window.print()} style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    🖨️ Print Invoice
                </button>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, borderBottom: '2px solid #e2e8f0', paddingBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {lab.lab_logo && <img src={`http://localhost:3001${lab.lab_logo}`} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8 }} />}
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' }}>{lab.lab_name || 'Accu Trace Labs'}</h1>
                        {lab.tagline && <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{lab.tagline}</p>}
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                    {lab.address && <div>{lab.address}</div>}
                    {lab.phone1 && <div>📞 {lab.phone1}{lab.phone2 ? `, ${lab.phone2}` : ''}{lab.phone3 ? `, ${lab.phone3}` : ''}</div>}
                    {lab.email && <div>✉️ {lab.email}</div>}
                    {lab.license_number && <div>License: {lab.license_number}</div>}
                </div>
            </div>

            {/* Invoice meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>INVOICE</h2>
                    <p style={{ fontSize: 14, color: '#3b82f6', fontWeight: 700, fontFamily: 'monospace' }}>{invoice.invoice_number}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, lineHeight: 1.8 }}>
                    <div><strong>Patient:</strong> {invoice.patient_name_snapshot}</div>
                    {invoice.referring_doctor_snapshot && <div><strong>Ref. Doctor:</strong> {invoice.referring_doctor_snapshot}</div>}
                </div>
            </div>

            {/* Items table */}
            <div style={{ position: 'relative' }}>
                {isPaid && <div className="paid-stamp">PAID</div>}
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '10%' }}>#</th>
                            <th style={{ width: '50%' }}>Test Name</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
                            <th style={{ width: '15%', textAlign: 'right' }}>Unit Price</th>
                            <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id}>
                                <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                                <td style={{ fontWeight: 500 }}>{item.test_name_snapshot}</td>
                                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right' }}>PKR {parseFloat(item.price_snapshot).toLocaleString()}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>PKR {parseFloat(item.line_total).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 300, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>Subtotal</span>
                        <span style={{ fontWeight: 500 }}>PKR {subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', color: '#dc2626' }}>
                            <span>Discount {invoice.discount_reason ? `(${invoice.discount_reason})` : ''}</span>
                            <span>−PKR {discount.toLocaleString()}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '2px solid #e2e8f0', fontWeight: 700, fontSize: 15 }}>
                        <span>Net Payable</span>
                        <span>PKR {net.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>Amount Paid</span>
                        <span style={{ fontWeight: 500, color: '#16a34a' }}>PKR {paid.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>Balance Due</span>
                        <span style={{ fontWeight: 700, color: balance > 0 ? '#dc2626' : '#16a34a' }}>PKR {balance.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span style={{ color: '#64748b' }}>Payment Method</span>
                        <span style={{ fontWeight: 500 }}>{invoice.payment_method}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 48, textAlign: 'center', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <p>Thank you for choosing {lab.lab_name || 'our laboratory'}.</p>
                <p>This is a computer-generated invoice.</p>
            </div>

            <ShareModal
                isOpen={shareModal.open}
                onClose={() => setShareModal(s => ({ ...s, open: false }))}
                portalLink={shareModal.link}
                patientName={shareModal.name}
                patientPhone={shareModal.phone}
                linkType="Invoice"
                labName={lab.lab_name}
            />
        </div>
    );
}
