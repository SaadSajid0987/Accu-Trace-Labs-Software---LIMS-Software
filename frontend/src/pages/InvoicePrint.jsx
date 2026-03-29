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
        <div className="invoice-print-page bg-white dark:bg-slate-900 min-h-screen">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .invoice-print-page, .invoice-print-page * { visibility: visible; }
                    .invoice-print-page { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
                    .no-print { display: none !important; }
                    .invoice-card { box-shadow: none !important; border: none !important; }
                }
                .invoice-print-page {
                    font-family: 'Inter', system-ui, sans-serif;
                    padding: 40px 20px;
                }
                .invoice-card {
                    max-width: 850px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
                    padding: 40px;
                    position: relative;
                    overflow: hidden;
                }
                .dark .invoice-card {
                    background: #1e293b;
                    box-shadow: none;
                    border: 1px solid #334155;
                }
                .invoice-table { border-collapse: collapse; width: 100%; margin-top: 24px; }
                .invoice-table th { 
                    padding: 12px 16px; 
                    text-align: left; 
                    background: #1e293b; 
                    color: white; 
                    font-size: 11px; 
                    text-transform: uppercase; 
                    letter-spacing: 0.1em;
                    font-weight: 700;
                }
                .invoice-table td { 
                    padding: 14px 16px; 
                    font-size: 13px; 
                    border-bottom: 1px solid #f1f5f9; 
                    color: #334155;
                }
                .dark .invoice-table td { border-bottom-color: #334155; color: #cbd5e1; }
                .invoice-table tr:last-child td { border-bottom: none; }
                
                .paid-stamp { 
                    position: absolute; 
                    top: 50%; 
                    left: 50%; 
                    transform: translate(-50%, -50%) rotate(-25deg); 
                    font-size: 120px; 
                    font-weight: 900; 
                    color: rgba(34,197,94,0.08); 
                    border: 20px solid rgba(34,197,94,0.08);
                    padding: 20px 60px;
                    border-radius: 40px;
                    letter-spacing: 20px; 
                    text-transform: uppercase; 
                    pointer-events: none; 
                    user-select: none; 
                    z-index: 0;
                }
            `}</style>

            {/* Print button */}
            <div className="no-print max-w-[850px] mx-auto mb-6 flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Invoice View</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Ready for print or share</p>
                    </div>
                </div>
                <div className="flex gap-3">
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
                        className="btn-secondary"
                        style={{ background: '#22c55e', color: 'white', border: 'none' }}
                    >
                        {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Share
                    </button>
                    <button onClick={() => window.print()} className="btn-primary">
                        🖨️ Print Invoice
                    </button>
                </div>
            </div>

            <div className={`invoice-card border-t-[8px] ${balance > 0 ? 'border-red-500' : 'border-emerald-500'}`}>
                {isPaid && <div className="paid-stamp">PAID</div>}

                {/* Header */}
                <div className="flex justify-between items-start mb-12 pb-8 border-b border-slate-100 dark:border-slate-800 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-white border border-slate-100 rounded-3xl p-3 flex items-center justify-center shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <img src="/flask_lab_logo_1.png" alt="Logo" className="w-full h-full object-contain relative z-10" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                    Accu Trace <span className="text-blue-600 italic">Labs</span>
                                </h1>
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            </div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em]">{lab.tagline || 'Science You Can Trust'}</p>
                        </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed uppercase tracking-widest font-bold">
                        {lab.address && <div className="mb-2 text-slate-700 dark:text-slate-400 max-w-[200px] ml-auto">{lab.address}</div>}
                        <div className="space-y-1">
                            {lab.phone1 && <div className="flex items-center justify-end gap-1"><span className="text-blue-500">PH:</span> {lab.phone1}</div>}
                            {lab.email && <div className="flex items-center justify-end gap-1"><span className="text-blue-500">EM:</span> {lab.email}</div>}
                            {lab.license_number && <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">License: {lab.license_number}</div>}
                        </div>
                    </div>
                </div>

                {/* Meta Info */}
                <div className="flex justify-between items-end mb-12 relative z-10">
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-baseline gap-3 mb-1">
                                <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">INVOICE</h2>
                                <span className="text-blue-600 font-mono font-bold text-lg">{invoice.invoice_number}</span>
                            </div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                Issued on <span className="text-slate-600 dark:text-slate-300">{new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </p>
                        </div>
                        
                        <div className="flex gap-8">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billing To</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{invoice.patient_name_snapshot}</p>
                                {invoice.patient_phone_snapshot && <p className="text-xs text-slate-500 mt-1">{invoice.patient_phone_snapshot}</p>}
                            </div>
                            {invoice.referring_doctor_snapshot && (
                                <div className="p-4 rounded-2xl border border-slate-50 dark:border-slate-800/50">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Referred By</p>
                                    <p className="text-base font-bold text-slate-600 dark:text-slate-400">{invoice.referring_doctor_snapshot}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="text-right pb-1">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-sm border ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:border-red-500/20'}`}>
                            <div className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                            Status: {invoice.payment_status}
                        </div>
                    </div>
                </div>

                {/* Items table */}
                <div className="relative z-10 mb-12">
                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th style={{ width: '8%' }} className="rounded-l-2xl">#</th>
                                <th style={{ width: '52%' }}>Services / Laboratory Tests</th>
                                <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Unit Price</th>
                                <th style={{ width: '15%', textAlign: 'right' }} className="rounded-r-2xl">Line Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id}>
                                    <td className="font-mono text-slate-300">{String(idx + 1).padStart(2, '0')}</td>
                                    <td>
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{item.test_name_snapshot}</div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Diagnostic Service</div>
                                    </td>
                                    <td style={{ textAlign: 'center' }} className="font-bold text-slate-500">{item.quantity}</td>
                                    <td style={{ textAlign: 'right' }} className="font-medium text-slate-500">PKR {parseFloat(item.price_snapshot).toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 900 }} className="text-slate-900 dark:text-white tabular-nums">PKR {parseFloat(item.line_total).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Section */}
                <div className="flex justify-between items-end relative z-10">
                    <div className="flex-1 max-w-[400px]">
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Important Notes</h4>
                            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                                <li>Most results are available within 24-48 hours.</li>
                                <li>Please keep this invoice for result collection.</li>
                                <li>Computer generated document, no signature required.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="w-80 space-y-4">
                        <div className="space-y-2 px-2">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                                <span>Subtotal</span>
                                <span className="text-slate-900 dark:text-white tabular-nums">PKR {subtotal.toLocaleString()}</span>
                            </div>
                            
                            {discount > 0 && (
                                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-red-500">
                                    <span>Discount {invoice.discount_reason ? `(${invoice.discount_reason})` : ''}</span>
                                    <span className="tabular-nums">−PKR {discount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative flex justify-between items-center p-5 bg-slate-900 dark:bg-blue-600 rounded-2xl text-white shadow-xl">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Net Amount</div>
                                    <div className="text-2xl font-black tabular-nums tracking-tighter">PKR {net.toLocaleString()}</div>
                                </div>
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white/30 rounded-full flex items-center justify-center font-black text-[10px]">PKR</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 px-2">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                                <span className="text-slate-400">Paid Amount</span>
                                <span className="text-emerald-500 tabular-nums">PKR {paid.toLocaleString()}</span>
                            </div>

                            <div className={`flex justify-between items-center py-3 px-4 rounded-xl border-2 transition-colors ${balance > 0 ? 'border-red-500/10 bg-red-500/5 text-red-600' : 'border-emerald-500/10 bg-emerald-500/5 text-emerald-600'}`}>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Balance</span>
                                <span className="font-black text-xl tabular-nums tracking-tighter">PKR {balance.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] px-6 font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em] pt-2">
                            <span>{invoice.payment_method} Payment</span>
                            <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-20 pt-10 border-t border-slate-50 dark:border-slate-800 text-center relative z-10">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-full mb-6">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                            Accu Trace Labs — Advanced Diagnostic Laboratory
                        </p>
                    </div>
                    
                    <div className="flex justify-center items-center gap-6 text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest">
                        <div className="hover:text-blue-500 transition-colors">Digital System Verified</div>
                        <div className="w-1.5 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                        <div>Generated on {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div className="w-1.5 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                        <div>LIMS Environment V1.0</div>
                    </div>
                </div>
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
