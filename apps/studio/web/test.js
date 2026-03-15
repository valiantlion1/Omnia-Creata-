import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
        console.error(`[PAGE ERROR] ${error.message}`);
    });

    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 5000 });
    } catch (e) {
        console.log("Navigation timeout or error:", e.message);
    }

    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
