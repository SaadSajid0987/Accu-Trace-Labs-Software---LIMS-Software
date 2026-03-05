import nodemailer from 'nodemailer';
import pool from '../db/pool.js';

// Mail transport setup
// Use ethereal.email for local dev or environment variables
let transporter;
const initializeTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    return transporter;
};

// HTML rendering for table
const buildTable = (title, data) => `
    <h3 style="color:#0f172a; margin-bottom:8px;">${title}</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 14px; text-align: left; border-color: #cbd5e1;">
        <tr style="background:#f1f5f9;">
            ${Object.keys(data[0] || {}).map(k => `<th style="text-transform: capitalize;">${k.replace(/_/g, ' ')}</th>`).join('')}
        </tr>
        ${data.map(row => `
            <tr>
                ${Object.values(row).map(v => `<td>${v || '—'}</td>`).join('')}
            </tr>
        `).join('')}
        ${data.length === 0 ? `<tr><td colspan="100%" style="text-align:center;color:#64748b;">No data in this period</td></tr>` : ''}
    </table>
    <br/>
`;

export const generateSummaryHtml = async (periodType = 'daily') => {
    // Determine time range query string
    const timeFilter = periodType === 'daily'
        ? `created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'`
        : `created_at >= CURRENT_DATE - INTERVAL '7 days' AND created_at < CURRENT_DATE + INTERVAL '1 day'`;

    // 1. New Patients
    const { rows: patients } = await pool.query(
        `SELECT id, name, gender, cnic FROM patients WHERE ${timeFilter} ORDER BY created_at DESC LIMIT 50`
    );

    // 2. Samples Logged
    const { rows: samples } = await pool.query(
        `SELECT sample_id, status, is_verified FROM samples WHERE ${timeFilter} ORDER BY created_at DESC LIMIT 50`
    );

    // 3. Invoice Revenue Collected
    const { rows: [{ revenue }] } = await pool.query(
        `SELECT SUM(amount_paid) as revenue FROM invoices WHERE payment_status = 'Paid' AND ${timeFilter}`
    );

    // 4. Abnormal Results Configured (count of results for period)
    const { rows: abnResults } = await pool.query(
        `SELECT count(*) as total_abnormal FROM test_results WHERE is_abnormal = true AND updated_at >= CURRENT_DATE ${periodType === 'weekly' ? `- INTERVAL '7 days'` : ''}`
    );

    const prettyRev = parseFloat(revenue || 0).toLocaleString();
    const abnCount = abnResults[0]?.total_abnormal || 0;

    const summaryStr = periodType === 'daily' ? 'Daily' : 'Weekly';

    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background:#1e293b; color: white; padding: 16px; border-radius: 6px 6px 0 0;">
                <h2 style="margin: 0;">AccuTrace Labs</h2>
                <p style="margin: 4px 0 0 0; opacity: 0.8;">${summaryStr} Summary Report</p>
            </div>
            
            <div style="padding: 24px; background: white;">
                <p>Hello Admin,</p>
                <p>Here is your ${periodType} summary of lab activities.</p>

                <div style="display:flex; gap: 16px; margin: 24px 0;">
                    <div style="flex:1; background:#f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <span style="font-size:12px; color:#64748b; text-transform:uppercase; font-weight:bold;">Revenue Collected</span><br/>
                        <span style="font-size:24px; font-weight:bold; color:#0f172a;">PKR ${prettyRev}</span>
                    </div>
                    <div style="flex:1; background:#fef2f2; padding: 16px; border-radius: 8px; border: 1px solid #fecaca;">
                        <span style="font-size:12px; color:#ef4444; text-transform:uppercase; font-weight:bold;">Abnormal Flags</span><br/>
                        <span style="font-size:24px; font-weight:bold; color:#991b1b;">${abnCount}</span>
                    </div>
                </div>

                ${buildTable('New Patients Registered', patients)}
                ${buildTable('Recent Samples Logged', samples.map(s => ({
        ID: s.sample_id,
        Status: s.status,
        Verification: s.is_verified ? 'Verified' : 'Pending'
    })))}
                
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px;">
                    This is an automated message from OpenLab LIMS.
                </p>
            </div>
        </div>
    `;
};

export const sendSummaryEmail = async (periodType = 'daily') => {
    try {
        const { rows } = await pool.query('SELECT * FROM email_settings WHERE id = 1');
        if (rows.length === 0) return;
        const settings = rows[0];

        if (periodType === 'daily' && !settings.daily_enabled) return;
        if (periodType === 'weekly' && !settings.weekly_enabled) return;
        if (!settings.recipient_email) return;

        const htmlConfig = await generateSummaryHtml(periodType);
        const tp = initializeTransporter();

        const subjPeriod = periodType === 'daily' ? 'Daily' : 'Weekly';

        const info = await tp.sendMail({
            from: '"AccuTrace LIMS System" <noreply@accutracelabs.com>',
            to: settings.recipient_email,
            subject: `AccuTrace Labs ${subjPeriod} Summary`,
            html: htmlConfig,
        });

        console.log(`[EmailService] ${subjPeriod} summary sent to ${settings.recipient_email}. MessageID: ${info.messageId}`);
        // If ethereal, you can grab the test message URL from info
        if (info.messageId && process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
            console.log(`Preview Email: ${nodemailer.getTestMessageUrl(info)}`);
        }

        return info;
    } catch (err) {
        console.error('[EmailService] Error sending summary:', err);
        throw err;
    }
};

// Method specifically for the "Test" button in the admin UI
export const sendTestEmail = async (emailAddr) => {
    const tp = initializeTransporter();
    const info = await tp.sendMail({
        from: '"AccuTrace LIMS System" <noreply@accutracelabs.com>',
        to: emailAddr,
        subject: `Test Verification Email - AccuTrace LIMS`,
        html: `<h2>Email Verification Successful</h2><p>This means your email settings are working!</p>`,
    });

    let previewUrl = null;
    if (info.messageId && process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
        previewUrl = nodemailer.getTestMessageUrl(info);
    }
    return { success: true, previewUrl };
};
