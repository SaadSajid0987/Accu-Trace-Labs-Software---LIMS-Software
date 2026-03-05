import cron from 'node-cron';
import { sendSummaryEmail } from '../services/emailService.js';

// Setup Daily Email (Every day at 08:00)
cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily summary email job...');
    try {
        await sendSummaryEmail('daily');
    } catch (err) {
        console.error('[Cron] Failed to send daily summary:', err);
    }
});

// Setup Weekly Email (Every Monday at 08:00)
cron.schedule('0 8 * * 1', async () => {
    console.log('[Cron] Running weekly summary email job...');
    try {
        await sendSummaryEmail('weekly');
    } catch (err) {
        console.error('[Cron] Failed to send weekly summary:', err);
    }
});

console.log('✅ Cron jobs initialized for Daily and Weekly summaries.');
