const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = 3002;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PDF server running' });
});

app.post('/generate-pdf', async (req, res) => {
  const { html, filename } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'html is required' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 800));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '30mm',
        left: '10mm',
        right: '10mm',
      },
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="
          width: 100%;
          margin: 0 10mm;
          padding-top: 10px;
          border-top: 2px solid #0f172a;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          font-size: 10px;
          font-family: Arial, sans-serif;
          color: #475569;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
        ">
          <div style="line-height: 1.7;">
            <span style="font-size: 11px; font-weight: 700; color: #0f172a; display: block;">Accu Trace Labs (Pvt) Ltd</span>
            Near Askari Bank, Tramari, Islamabad<br/>
            +92 310 1599399 &middot; info@accutracelabs.com
          </div>
          <div style="text-align: right; color: #64748b; font-family: monospace; line-height: 1.7;">
            This is a computer-generated report<br/>
            Accu Trace Labs LIMS V1.0
          </div>
        </div>
      `,
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename || 'report'}.pdf"`
    );
    res.end(pdf);

  } catch (err) {
    console.error('PDF generation error:', err);
    if (browser) await browser.close();
    res.status(500).json({ error: 'PDF generation failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PDF server running at http://localhost:${PORT}`);
});
