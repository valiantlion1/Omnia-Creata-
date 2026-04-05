const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Intercept console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating...");
  await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle2' });
  
  // Add a small delay for react to render
  await new Promise(r => setTimeout(r, 2000));
  
  // Dump local storage before
  let ls = await page.evaluate(() => localStorage.getItem('oc-studio-ui-prefs'));
  console.log("LocalStorage BEFORE:", ls);
  
  console.log("Clicking Cyberpunk button...");
  // Find the button by title 'Cyberpunk'
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="Cyberpunk"]');
    if (btn) {
      btn.click();
      console.log("Clicked Cyberpunk button");
    } else {
      console.log("COULD NOT FIND CYBERPUNK BUTTON!");
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  let lsAfter = await page.evaluate(() => localStorage.getItem('oc-studio-ui-prefs'));
  console.log("LocalStorage AFTER:", lsAfter);
  
  let htmlClasses = await page.evaluate(() => document.documentElement.className);
  console.log("HTML classes AFTER:", htmlClasses);

  let activeTheme = await page.evaluate(() => {
    // Find the one with Checkmark icon. We can check which button has ring-2 class
    const btn = document.querySelector('button[title="Cyberpunk"]');
    return btn ? btn.className : 'no btn';
  });
  console.log("Cyberpunk btn classes:", activeTheme);

  await browser.close();
})();
