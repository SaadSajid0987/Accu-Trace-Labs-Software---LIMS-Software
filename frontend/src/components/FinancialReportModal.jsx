import React, { useState } from 'react';
import { invoicesAPI, expensesAPI, labSettingsAPI } from '../api/index.js';
import { FileText, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../contexts/AuthContext.jsx';
import ReactDOM from 'react-dom/client';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatPKR(val) {
    const n = parseFloat(val) || 0;
    return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function FinancialReportModal({ isOpen, onClose }) {
    const { user } = useAuth();
    
    // Default to previous month
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    
    const [month, setMonth] = useState(prevMonthDate.getMonth());
    const [year, setYear] = useState(prevMonthDate.getFullYear());
    const [isGenerating, setIsGenerating] = useState(false);

    // Compute year range: 2024 up to current year + 1
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2024; y <= Math.max(currentYear + 1, 2026); y++) {
        years.push(y);
    }

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const startDate = new Date(year, month, 1, 0, 0, 0);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
            const fromStr = startDate.toISOString().slice(0, 10);
            const toStr = endDate.toISOString().slice(0, 10);

            // Fetch Lab info
            const labRes = await labSettingsAPI.get();
            const lab = labRes.data;

            // Fetch Invoices
            const invRes = await invoicesAPI.list({ limit: 10000 });
            const monthInvoices = invRes.data.invoices.filter(i => {
                if (i.payment_status !== 'Paid' && i.payment_status !== 'Partial') return false;
                const d = new Date(i.payment_date || i.updated_at || i.created_at);
                return d >= startDate && d <= endDate;
            });

            // Fetch Expenses
            const expRes = await expensesAPI.list({ from: fromStr, to: toStr, limit: 10000 });
            const monthExpenses = expRes.data.expenses;

            // Totals
            const totalIncome = monthInvoices.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
            const totalExpenses = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
            const netBalance = totalIncome - totalExpenses;
            const profitMargin = totalIncome > 0 ? (netBalance / totalIncome) * 100 : null;

            // Daily Data
            const dailyData = {};
            for (let d = 1; d <= endDate.getDate(); d++) {
                const dateKey = new Date(year, month, d).toISOString().slice(0, 10);
                dailyData[dateKey] = { inc: 0, exp: 0 };
            }

            monthInvoices.forEach(i => {
                const dStr = new Date(i.payment_date || i.updated_at || i.created_at).toISOString().slice(0, 10);
                if (dailyData[dStr]) dailyData[dStr].inc += parseFloat(i.amount_paid || 0);
            });

            monthExpenses.forEach(e => {
                const dStr = new Date(e.date).toISOString().slice(0, 10);
                if (dailyData[dStr]) dailyData[dStr].exp += parseFloat(e.amount || 0);
            });

            // Group Expenses
            const groupedExpenses = {};
            monthExpenses.forEach(e => {
                if (!groupedExpenses[e.category]) groupedExpenses[e.category] = [];
                groupedExpenses[e.category].push(e);
            });

            // Calculate daily table rows
            let runningBalance = 0;
            const daysArr = Object.keys(dailyData).sort();
            const dailyRows = [];

            daysArr.forEach(dStr => {
                const day = dailyData[dStr];
                if (day.inc === 0 && day.exp === 0) return; // Skip no activity
                
                const netDay = day.inc - day.exp;
                runningBalance += netDay;
                
                dailyRows.push({
                    date: dStr,
                    inc: day.inc,
                    exp: day.exp,
                    netDay: netDay,
                    runBal: runningBalance
                });
            });

            // Render highly styled HTML template
            await generatePDFFromHTML({
                month, year, lab, monthInvoices, monthExpenses, totalIncome, totalExpenses, netBalance, profitMargin,
                groupedExpenses, dailyRows, startDate, endDate, user, fromStr, toStr
            });

            toast.success('Report downloaded successfully');
            onClose();

        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" /> Generate Report
                    </h2>
                    <button onClick={onClose} disabled={isGenerating} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Select a month and year to generate a full PDF financial report covering incomes, expenses, and net summary.
                    </p>
                    
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Month</label>
                            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                                {MONTHS.map((m, idx) => (
                                    <option key={m} value={idx}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
                            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <button onClick={onClose} disabled={isGenerating} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-75">
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        {isGenerating ? 'Generating...' : 'Generate PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// HTML to PDF Code below 
// ----------------------------------------------------

async function generatePDFFromHTML(data) {
    const { month, year, lab, monthInvoices, monthExpenses, totalIncome, totalExpenses, netBalance, profitMargin,
        groupedExpenses, dailyRows, startDate, endDate, user, fromStr, toStr } = data;

    // A4 Portrait exact dimensions at standard 96 DPI scale
    const A4_WIDTH = 794; 
    const A4_HEIGHT = 1123;
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${A4_WIDTH}px`;
    container.style.backgroundColor = '#0a1628';
    
    // Setup shadow root or raw HTML content
    const colors = {
        bg: '#0a1628',
        cardHeader: '#0d1b2e',
        innerCard: '#101e33',
        textPrimary: '#e8f0fc',
        textSecondary: '#7b96ba',
        textMuted: '#3d5878',
        border: 'rgba(255,255,255,0.07)',
        teal: '#00d4aa',
        red: '#f87171',
        green: '#34d399',
        blue: '#4f8ef7',
        rent: '#fb923c',
        eq: '#a78bfa',
        sup: '#38bdf8',
        util: '#fbbf24',
        sal: '#34d399',
        main: '#00d4aa',
        oth: '#94a3b8'
    };

    const catColor = (cat) => {
        switch(cat) {
            case 'Rent': return colors.rent;
            case 'Equipment': return colors.eq;
            case 'Supplies': return colors.sup;
            case 'Utilities': return colors.util;
            case 'Salaries': return colors.sal;
            case 'Maintenance': return colors.main;
            default: return colors.oth;
        }
    };

    const GlobalStyles = `
        * { box-sizing: border-box; }
        .pdf-page {
            width: ${A4_WIDTH}px;
            height: ${A4_HEIGHT}px;
            background-color: ${colors.bg};
            color: ${colors.textPrimary};
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            page-break-after: always;
        }
        .header {
            background-color: ${colors.cardHeader};
            padding: 30px 40px;
            border-bottom: 1px solid ${colors.border};
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header-title { font-size: 24px; font-weight: bold; margin: 0 0 4px 0; color: ${colors.textPrimary}; }
        .header-sub { font-size: 14px; color: ${colors.textMuted}; margin: 0; }
        .badge {
            background-color: rgba(79,142,247,0.15);
            color: ${colors.blue};
            border: 1px solid rgba(79,142,247,0.3);
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: bold;
        }
        .page-title {
            padding: 30px 40px 10px 40px;
            font-size: 22px;
            font-weight: bold;
            color: ${colors.textPrimary};
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .page-title span { font-size: 18px; }
        .content { padding: 20px 40px; flex-grow: 1; display:flex; flex-direction: column;}
        .footer {
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: ${colors.textMuted};
            border-top: 1px solid ${colors.border};
            margin-top: auto;
        }
        .mono { font-family: 'Courier New', Courier, monospace; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;}
        th { background-color: ${colors.innerCard}; color: ${colors.textPrimary}; font-weight: bold; text-align: left; padding: 12px; border-bottom: 2px solid ${colors.border}; }
        th.right, td.right { text-align: right; }
        td { padding: 12px; border-bottom: 1px solid ${colors.border}; color: ${colors.textSecondary}; }
        
        .hero-row { display: flex; gap: 20px; align-items: stretch; margin-top: 30px; }
        .hero-card { flex: 1; background-color: ${colors.cardHeader}; border-radius: 8px; padding: 20px; position: relative; overflow: hidden; }
        .hero-card-title { font-size: 12px; color: ${colors.textMuted}; margin-bottom: 8px; }
        .hero-card-val { font-size: 24px; font-weight: bold; }
        .hero-card-accent { position: absolute; top: 0; left: 0; right: 0; height: 4px; }
        
        .no-data { text-align: center; color: ${colors.textMuted}; font-size: 14px; padding: 40px; }
    `;

    const HeaderHTML = () => `
        <div class="header">
            <div>
                <h1 class="header-title">${lab.name || 'Accu Trace Labs'}</h1>
                <p class="header-sub">${lab.tagline || 'Excellence in Diagnostics'}</p>
            </div>
            <div class="badge">Financial Report / Confidential</div>
        </div>
    `;
    const FooterHTML = (pageNum) => `
        <div class="footer">
            <div>${lab.address || ''} | ${lab.phone || ''} | ${lab.email || ''}</div>
            <div>Generated by Accu Trace Labs LIMS V1.0 &middot; Prepared by ${user?.name || 'Admin'} &middot; Page ${pageNum} of 4</div>
        </div>
    `;

            // Render logic to pure HTML string using template literals
    const displayProfitMargin = profitMargin !== null ? profitMargin.toFixed(1) + '%' : 'N/A';

    const sortedInvoices = [...monthInvoices].sort((a,b) => new Date(a.payment_date || a.updated_at) - new Date(b.payment_date || b.updated_at));

    const expensesTableBody = Object.keys(groupedExpenses).map(cat => {
        const group = groupedExpenses[cat];
        const catTotal = group.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        return `
            <tr>
                <td colspan="2" style="font-weight:bold; background-color:${colors.innerCard}; color:${colors.textPrimary}">
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${catColor(cat)}; margin-right:8px;"></span>
                    ${cat}
                </td>
                <td class="right" style="font-weight:bold; background-color:${colors.innerCard}; color:${colors.textPrimary}">${formatPKR(catTotal)}</td>
            </tr>
            ${[...group].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e => `
                <tr>
                    <td>${new Date(e.date).toLocaleDateString('en-PK')}</td>
                    <td>${e.item_description}</td>
                    <td class="right">${formatPKR(e.amount)}</td>
                </tr>
            `).join('')}
        `;
    }).join('');

    const htmlContent = `
        <style>${GlobalStyles}</style>

        <!-- PAGE 1 -->
        <div class="pdf-page">
            ${HeaderHTML()}
            <div class="page-title">Financial Report Summary</div>
            <div class="content">
                <div style="font-size: 32px; font-weight: bold; margin-bottom: 20px;">${MONTHS[month]} ${year}</div>
                <div class="mono" style="color: ${colors.textMuted}; font-size: 12px; margin-bottom: 5px;">Period: 01 ${MONTHS[month]} ${year} &mdash; ${endDate.getDate()} ${MONTHS[month]} ${year}</div>
                <div class="mono" style="color: ${colors.textMuted}; font-size: 12px;">Generated: ${new Date().toLocaleString()}</div>
                
                <div class="hero-row">
                    <div class="hero-card">
                        <div class="hero-card-accent" style="background-color: ${colors.teal}"></div>
                        <div class="hero-card-title">Total Income</div>
                        <div class="hero-card-val" style="color: ${colors.teal}">${formatPKR(totalIncome)}</div>
                    </div>
                    <div class="hero-card">
                        <div class="hero-card-accent" style="background-color: ${colors.red}"></div>
                        <div class="hero-card-title">Total Expenses</div>
                        <div class="hero-card-val" style="color: ${colors.red}">-${formatPKR(totalExpenses)}</div>
                    </div>
                    <div class="hero-card">
                        <div class="hero-card-accent" style="background-color: ${netBalance >= 0 ? colors.green : colors.red}"></div>
                        <div class="hero-card-title">Net Balance</div>
                        <div class="hero-card-val" style="color: ${netBalance >= 0 ? colors.green : colors.red}">${netBalance < 0 ? '-' : ''}${formatPKR(Math.abs(netBalance))}</div>
                    </div>
                    <div class="hero-card">
                        <div class="hero-card-accent" style="background-color: ${colors.blue}"></div>
                        <div class="hero-card-title">Total Invoices</div>
                        <div class="hero-card-val" style="color: ${colors.blue}">${monthInvoices.length}</div>
                    </div>
                </div>
            </div>
            ${FooterHTML(1)}
        </div>

        <!-- PAGE 2 -->
        <div class="pdf-page">
            ${HeaderHTML()}
            <div class="page-title">
                Income Breakdown
                <span style="color: ${colors.teal}; font-weight: bold;">${formatPKR(totalIncome)}</span>
            </div>
            <div class="content">
                ${sortedInvoices.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Invoice #</th><th>Patient Name</th><th>Date</th><th>Tests</th><th class="right">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedInvoices.map(i => `
                            <tr>
                                <td>${i.invoice_number}</td>
                                <td>${i.patient_name_snapshot}</td>
                                <td>${new Date(i.payment_date || i.updated_at || i.created_at).toLocaleDateString('en-PK')}</td>
                                <td>${i.test_count || 1}</td>
                                <td class="right">${formatPKR(i.amount_paid)}${i.payment_status === 'Partial' ? ' (Partial)' : ''}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="4" class="right" style="font-weight:bold; color: ${colors.teal}; border:none;">Subtotal</td>
                            <td class="right" style="font-weight:bold; color: ${colors.teal}; border:none;">${formatPKR(totalIncome)}</td>
                        </tr>
                    </tbody>
                </table>
                ` : `<div class="no-data">No income recorded for this period.</div>`}
            </div>
            ${FooterHTML(2)}
        </div>

        <!-- PAGE 3 -->
        <div class="pdf-page">
            ${HeaderHTML()}
            <div class="page-title">
                Expense Breakdown
                <span style="color: ${colors.red}; font-weight: bold;">${formatPKR(totalExpenses)}</span>
            </div>
            <div class="content">
                 ${monthExpenses.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th><th>Description</th><th class="right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expensesTableBody}
                            <tr>
                                <td colspan="2" class="right" style="font-weight:bold; color: ${colors.red}; border:none;">Grand Total</td>
                                <td class="right" style="font-weight:bold; color: ${colors.red}; border:none;">${formatPKR(totalExpenses)}</td>
                            </tr>
                        </tbody>
                    </table>
                 ` : `<div class="no-data">No expenses recorded for this period.</div>`}
            </div>
            ${FooterHTML(3)}
        </div>

        <!-- PAGE 4 -->
        <div class="pdf-page">
            ${HeaderHTML()}
            <div class="page-title">Net Summary &amp; Daily Breakdown</div>
            <div class="content">
                <div style="height: 2px; background: linear-gradient(90deg, ${colors.teal}, ${colors.blue}); margin-top: 10px;"></div>
                <div style="display:flex; justify-content:space-between; text-align:center; margin: 20px 0 30px 0;">
                    <div style="flex:1;">
                        <div style="font-size: 12px; color: ${colors.textMuted}; margin-bottom: 5px;">Total Income</div>
                        <div style="font-size: 20px; font-weight: bold; color: ${colors.teal}">${formatPKR(totalIncome)}</div>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size: 12px; color: ${colors.textMuted}; margin-bottom: 5px;">Total Expenses</div>
                        <div style="font-size: 20px; font-weight: bold; color: ${colors.red}">-${formatPKR(totalExpenses)}</div>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size: 12px; color: ${colors.textMuted}; margin-bottom: 5px;">Net Balance</div>
                        <div style="font-size: 20px; font-weight: bold; color: ${netBalance >= 0 ? colors.green : colors.red}">${netBalance < 0 ? '-' : ''}${formatPKR(Math.abs(netBalance))}</div>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size: 12px; color: ${colors.textMuted}; margin-bottom: 5px;">Profit Margin</div>
                        <div style="font-size: 20px; font-weight: bold; color: ${colors.blue}">${displayProfitMargin}</div>
                    </div>
                </div>

                ${dailyRows.length > 0 ? `
                <table style="margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Date</th><th class="right">Income</th><th class="right">Expenses</th><th class="right">Daily Net</th><th class="right">Running Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dailyRows.map(r => `
                            <tr>
                                <td style="border-left: 3px solid ${r.netDay >= 0 ? colors.green : colors.red}; padding-left: 9px; background-color: rgba(0,0,0,0.1)">
                                    ${new Date(r.date).toLocaleDateString('en-PK', {day:'2-digit', month:'short'})}
                                </td>
                                <td class="right">${formatPKR(r.inc)}</td>
                                <td class="right">${formatPKR(r.exp)}</td>
                                <td class="right" style="color: ${r.netDay >= 0 ? colors.green : colors.red}">${r.netDay < 0 ? '-' : ''}${formatPKR(Math.abs(r.netDay))}</td>
                                <td class="right" style="font-weight:bold; color: ${r.runBal >= 0 ? colors.teal : colors.red}">${r.runBal < 0 ? '-' : ''}${formatPKR(Math.abs(r.runBal))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : `<div class="no-data">No daily activity recorded for this period.</div>`}

                <p style="font-size: 9px; color: ${colors.textMuted}; font-style: italic; line-height: 1.4; margin-top: auto;">
                    This report was automatically generated by Accu Trace Labs LIMS V1.0 based on recorded invoice payments and manually logged expenses for the period ${fromStr} &ndash; ${toStr}. All figures are in Pakistani Rupees (PKR). This document is confidential and intended for internal financial review and accounting purposes only.
                </p>
            </div>
            ${FooterHTML(4)}
        </div>
    `;

    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
        const pages = container.querySelectorAll('.pdf-page');
        const pdf = new jsPDF('p', 'pt', 'a4');
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const canvas = await html2canvas(page, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: colors.bg,
                logging: false,
                windowWidth: A4_WIDTH,
            });
            
            const imgData = canvas.toDataURL('image/png');
            if (i > 0) pdf.addPage();
            
            // a4 size in pt is 595.28 x 841.89
            pdf.addImage(imgData, 'PNG', 0, 0, 595.28, 841.89);
        }
        
        pdf.save(`AccuTraceLabs-Financial-Report-${MONTHS[month]}-${year}.pdf`);
    } finally {
        document.body.removeChild(container);
    }
}
