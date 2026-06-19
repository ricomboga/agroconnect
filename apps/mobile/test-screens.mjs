import { chromium } from 'playwright-core';

const CHROMIUM_PATH =
  'C:\\Users\\Riks\\AppData\\Local\\ms-playwright\\chromium-1148\\chrome-win\\chrome.exe';

const browser = await chromium.launch({
  headless: true,
  executablePath: CHROMIUM_PATH,
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.setDefaultTimeout(25000);

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') pageErrors.push(`[console.error] ${m.text()}`);
});

async function cap(name) {
  await page.screenshot({ path: `screen-${name}.png` });
  const text = (await page.evaluate(() => document.body.innerText)).trim().substring(0, 400);
  console.log(`\n=== ${name.toUpperCase()} ===`);
  console.log(text || '(no visible text)');
}

await page.goto('http://localhost:8082');
try {
  await page.waitForFunction(() => document.body.innerText.trim().length > 20, { timeout: 20000 });
} catch { console.log('Warn: content took too long'); }

await cap('1-welcome');

// --- Login ---
try {
  await page.getByText('Ingia').first().click();
  await page.waitForTimeout(1500);
  await cap('2-login');

  // Check phone input starts with +254
  const phoneVal = await page.locator('input[type="tel"], input').first().inputValue().catch(() => '');
  console.log('Phone field value:', phoneVal);
} catch (e) { console.log('Login error:', e.message); }

// --- Back to Welcome ---
try {
  await page.getByText('← Rudi').first().click();
  await page.waitForTimeout(800);
} catch {
  await page.goto('http://localhost:8082');
  await page.waitForTimeout(1000);
}

// --- Register ---
try {
  await page.getByText('Jiunge').first().click();
  await page.waitForTimeout(1500);
  await cap('3-register');

  // Try opening county picker
  await page.getByText('Chagua kaunti').first().click();
  await page.waitForTimeout(1000);
  await cap('4-county-picker');

  // Pick Nakuru
  await page.getByText('Nakuru').first().click();
  await page.waitForTimeout(500);
  await cap('5-county-selected');
} catch (e) { console.log('Register error:', e.message); }

// --- Zod validation: submit empty form ---
try {
  await page.getByText('Unda akaunti').first().click();
  await page.waitForTimeout(800);
  await cap('6-register-validation');
} catch (e) { console.log('Validation test error:', e.message); }

console.log('\n=== PAGE ERRORS ===');
pageErrors.slice(0, 5).forEach((e) => console.log(' -', e.substring(0, 200)));

await browser.close();
