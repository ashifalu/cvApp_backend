const express = require('express');
const puppeteer = require('puppeteer')
const userController = require('./controllers/userController')

const routes = new express.Router();

routes.post('/register',userController.registerController)

routes.post('/verify-email',userController.verifyEmailController)

routes.post('/login',userController.loginController)

routes.post('/generate-pdf', async (req, res) => {
    const { html, cssText } = req.body;
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    /* Remove scale wrapper */
                    #pdf-scale-wrapper {
                        transform: none !important;
                        margin: 0 !important;
                        width: 794px !important;
                    }
                    .print-page {
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    ${cssText}
                </style>
            </head>
            <body>
                <div style="width:794px">
                    ${html}
                </div>
            </body>
            </html>
        `;

        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
        await page.setViewport({ width: 794, height: 1123 });

        // Wait a bit for fonts/images to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        const pdf = await page.pdf({
            width: '794px',
            height: '1123px',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=resume.pdf',
            'Content-Length': pdf.length,
        });
        res.send(pdf);

    } catch (error) {
        console.error('PDF error:', error);
        res.status(500).json({ error: 'PDF generation failed' });
    } finally {
        if (browser) await browser.close();
    }
});

module.exports = routes