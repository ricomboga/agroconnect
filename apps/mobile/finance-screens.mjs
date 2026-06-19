import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const CHROMIUM = "C:\\Users\\Riks\\AppData\\Local\\ms-playwright\\chromium-1148\\chrome-win\\chrome.exe";
const BASE    = "http://localhost:8082";
const OUT     = "C:\\Users\\Riks\\desktop\\agroconnect\\apps\\mobile\\screenshots";
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false, executablePath: CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

const CREDIT_SCORE = {
  score: 72, band: "B", maxLoanKes: 50000, lastComputedAt: "2026-06-01",
  components: {
    yield:      { score: 80, weight: 0.30 },
    inputs:     { score: 60, weight: 0.25 },
    activities: { score: 75, weight: 0.25 },
    platform:   { score: 65, weight: 0.20 },
  },
};

const LOAN_PRODUCTS = [
  { id: "prod1", name: "Kilimo Salama Loan", partnerId: "p1", partnerName: "Equity Bank",
    interestRate: 12.5, maxAmountKes: 100000, minAmountKes: 5000, repaymentMonths: 24,
    eligibilityBand: "B", description: "Affordable farm input financing for smallholder farmers." },
  { id: "prod2", name: "Mkulima Fund", partnerId: "p2", partnerName: "KCB Bank",
    interestRate: 10.0, maxAmountKes: 50000, minAmountKes: 3000, repaymentMonths: 12,
    eligibilityBand: "C", description: null },
];

const LOAN_DETAIL = {
  id: "loan1", productId: "prod1", productName: "Kilimo Salama Loan", partnerName: "Equity Bank",
  amountRequestedKes: 30000, purpose: "Kununua mbegu za mahindi", repaymentMonths: 12,
  status: "approved", approvedAmountKes: 28000, interestRate: 12.5,
  disbursedAt: null, mpesaRef: null, submittedAt: "2026-06-01",
  timeline: [
    { status: "submitted",    timestamp: "2026-06-01T10:00:00Z" },
    { status: "under_review", timestamp: "2026-06-02T09:00:00Z" },
    { status: "approved",     timestamp: "2026-06-05T14:30:00Z" },
  ],
};

await ctx.route("**/api/v1/**", async (route) => {
  const url  = route.request().url();
  const meth = route.request().method();

  if (url.includes("/auth/me"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ user: { id: "u1", full_name: "Kamau Njoroge", phone: "+254712345678", role: "farmer" } }) });

  // Finance — order: compute before credit-score, specific loan before list
  if (url.includes("/finance/credit-score/compute") && meth === "POST")
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: CREDIT_SCORE }) });

  if (url.includes("/finance/credit-score"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: CREDIT_SCORE }) });

  if (url.includes("/finance/products"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: LOAN_PRODUCTS }) });

  if (url.match(/\/finance\/loans\/loan1/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: LOAN_DETAIL }) });

  if (url.match(/\/finance\/loans(\?|$)/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [LOAN_DETAIL] }) });

  if (url.match(/\/farms\/f1(\?|$)/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { id: "f1", name: "Shamba la Kamau", county: "Nakuru",
        areaAcres: 5.2, soilType: "loam", gpsLat: null, gpsLng: null,
        status: "active", ownerId: "u1", plots: [], createdAt: "2026-01-01" } }) });

  if (url.match(/\/farms(\?|$)/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [{ id: "f1", name: "Shamba la Kamau", county: "Nakuru",
        areaAcres: 5.2, soilType: "loam", gpsLat: null, gpsLng: null,
        status: "active", ownerId: "u1", plots: [], createdAt: "2026-01-01" }],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }) });

  return route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }) });
});

const page = await ctx.newPage();
page.setDefaultTimeout(25000);
const errors = [];
page.on("pageerror", e => {
  console.log("⚠ JS ERROR:", e.message.slice(0, 120));
  const stack = (e.stack || "").split("\n").slice(1, 4).join(" | ");
  if (stack) console.log("  stack:", stack.slice(0, 200));
  errors.push(e.message);
});
page.on("console", msg => {
  if (msg.type() === "error") console.log("⚠ CONSOLE ERR:", msg.text().slice(0, 120));
});

const shot  = async (name) => {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("✅", name);
};
const pageText    = async () => (await page.evaluate(() => document.body.innerText)).slice(0, 300);
const waitForText = async (text, timeout = 15000) =>
  page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout });
const nav = async (screen, params = {}) => {
  const r = await page.evaluate(([s, p]) => {
    const n = window.__nav__;
    if (!n) return `no ref:${s}`;
    try { n.navigate(s, p); return `navigate:${s}`; }
    catch (e) { return `error:${String(e.message).slice(0, 60)}:${s}`; }
  }, [screen, params]);
  console.log("  nav →", r);
  await page.waitForTimeout(1500);
};
const fp = async (text) => {
  const r = await page.evaluate((t) => {
    for (const el of document.querySelectorAll("*")) {
      if (el.childElementCount === 0 && el.innerText?.trim() === t) {
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return `dispatch:${t}`;
      }
    }
    return `notFound:${t}`;
  }, text);
  console.log(`  fp("${text}") →`, r);
  await page.waitForTimeout(500);
};
const freezeQueries = async () => {
  await page.evaluate(() => {
    const qc = window.__queryClient__;
    if (qc) qc.setDefaultOptions({ queries: {
      staleTime: Infinity, refetchOnWindowFocus: false,
      refetchOnReconnect: false, retry: false,
    } });
  });
};

// ── Boot ──────────────────────────────────────────────────────────────────────
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.setItem("__agroconnect_secure_auth_access_token", "tok"));
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await waitForText("Shamba la Kamau");
await freezeQueries();
await page.waitForTimeout(400);

// ── 15: Finance home ─────────────────────────────────────────────────────────
await fp("Fedha");
try { await waitForText("Alama ya Mkopo", 10000); } catch (_) {}
try { await waitForText("72", 5000); } catch (_) {}
await shot("15-finance-home");
console.log("  text:", await pageText());

// ── 16: Credit score detail ───────────────────────────────────────────────────
await nav("CreditScoreDetail");
try { await waitForText("Maelezo ya Alama", 10000); } catch (_) {}
await shot("16-credit-score-detail");
console.log("  text:", await pageText());

// ── 17: Loan products ─────────────────────────────────────────────────────────
await nav("LoanProducts");
try { await waitForText("Bidhaa za Mikopo", 10000); } catch (_) {}
try { await waitForText("Kilimo Salama", 5000); } catch (_) {}
await shot("17-loan-products");
console.log("  text:", await pageText());

// ── 18: Loan application ──────────────────────────────────────────────────────
await nav("LoanApplication", { productId: "prod1" });
try { await waitForText("Omba mkopo", 10000); } catch (_) {}
await page.waitForTimeout(1000);

// Fill form fields
const purposeInput = await page.$("textarea, input[placeholder*='mbegu'], input[placeholder*='Mfano']");
if (purposeInput) {
  await purposeInput.click();
  await purposeInput.type("Kununua mbegu za mahindi H614D");
}
// Fill amount — find numeric input
const inputs = await page.$$("input");
for (const inp of inputs) {
  const ph = await inp.getAttribute("placeholder");
  if (ph === "30000") {
    await inp.click();
    await inp.fill("30000");
    break;
  }
}
// Select 12-month repayment chip
await fp("12");
await page.waitForTimeout(600);

await shot("18-loan-application");
console.log("  text:", await pageText());

// ── 19: Loan status ───────────────────────────────────────────────────────────
await nav("LoanStatus", { loanId: "loan1" });
try { await waitForText("Hali ya mkopo", 10000); } catch (_) {}
try { await waitForText("Kilimo Salama", 5000); } catch (_) {}
await shot("19-loan-status");
console.log("  text:", await pageText());

console.log("\nJS errors:", errors.length);
errors.forEach(e => console.log(" -", e.slice(0, 120)));
await browser.close();
console.log("Done. →", OUT);
