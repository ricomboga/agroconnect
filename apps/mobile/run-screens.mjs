import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const CHROMIUM_PATH = "C:\\Users\\Riks\\AppData\\Local\\ms-playwright\\chromium-1148\\chrome-win\\chrome.exe";
const BASE = "http://localhost:8082";
const OUT = "C:\\Users\\Riks\\desktop\\agroconnect\\apps\\mobile\\screenshots";

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false, executablePath: CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);

const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

console.log("Opening app...");
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(4000);

async function shot(name) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`Screenshot: ${name}`);
}

await shot("01-welcome");

// Check what text is visible
const body = await page.evaluate(() => document.body.innerText);
console.log("=== VISIBLE TEXT ===");
console.log(body.substring(0, 500));

// Try clicking Ingia (Login)
const loginBtn = page.getByText("Ingia").first();
const loginVisible = await loginBtn.isVisible().catch(() => false);
console.log("Login button visible:", loginVisible);

if (loginVisible) {
  await loginBtn.click();
  await page.waitForTimeout(1500);
  await shot("02-login");

  // Go back and try Register
  const backBtn = page.getByText("Jiunge").first();
  const hasBack = await backBtn.isVisible().catch(() => false);
  if (!hasBack) {
    await page.goBack().catch(() => {});
    await page.waitForTimeout(1000);
  }
  const joinBtn = page.getByText("Jiunge").first();
  if (await joinBtn.isVisible().catch(() => false)) {
    await joinBtn.click();
    await page.waitForTimeout(1500);
    await shot("03-register");
  }
}

console.log("=== PAGE ERRORS ===");
errors.forEach(e => console.log(" -", e));
console.log("DONE");

await browser.close();
