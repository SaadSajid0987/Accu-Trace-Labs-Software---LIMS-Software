import { useState } from 'react';
import { X, MessageCircle, Copy, Check, Share2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareModal({ isOpen, onClose, portalLink, patientName, patientPhone, linkType, labName }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const fullLink = `${window.location.origin}${portalLink}`;

    const typeLabel = linkType === 'Report' ? 'test report' : 'invoice';
    const message = `Dear ${patientName || 'Patient'}, your ${typeLabel} from ${labName || 'Accu Trace Labs'} is ready. Please view it here: ${fullLink}. This link will expire in 30 days.`;

    // Clean phone: remove spaces, dashes; ensure country code
    const cleanPhone = (patientPhone || '').replace(/[\s\-()]/g, '').replace(/^0/, '92');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullLink);
            setCopied(true);
            toast.success('Link copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Share {linkType}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Send to {patientName || 'patient'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Link preview */}
                <div className="px-6 py-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Shareable Link</p>
                        <p className="text-sm font-mono text-blue-600 dark:text-blue-400 break-all">{fullLink}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Expires in 30 days • No login required</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 space-y-3">
                    {/* WhatsApp */}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Share on WhatsApp
                    </a>

                    {/* Copy Link */}
                    <button
                        onClick={handleCopy}
                        className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors text-sm"
                    >
                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>

                    {/* Dismiss */}
                    <button
                        onClick={onClose}
                        className="w-full text-center text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
