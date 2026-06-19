import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const CHROMIUM = "C:\\Users\\Riks\\AppData\\Local\\ms-playwright\\chromium-1148\\chrome-win\\chrome.exe";
const BASE    = "http://localhost:8082";
const OUT     = "C:\\Users\\Riks\\desktop\\agroconnect\\apps\\mobile\\screenshots";
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const USER_PROFILE = {
  id: "u1", full_name: "Kamau Njoroge", phone: "+254712345678", role: "farmer",
  county: "Nakuru", photoUrl: null,
  notificationPreferences: {
    activityReminders: true, diagnosisResults: true, priceAlerts: false,
    loanUpdates: true, weatherAlerts: true, communityReplies: false,
  },
};

const FARMS = [
  { id: "f1", name: "Shamba la Kamau", county: "Nakuru", areaAcres: 5.2,
    soilType: "loam", gpsLat: null, gpsLng: null, status: "active",
    ownerId: "u1", plots: [], createdAt: "2026-01-01" },
  { id: "f2", name: "Shamba la Nakuru", county: "Nakuru", areaAcres: 3.1,
    soilType: "clay", gpsLat: null, gpsLng: null, status: "active",
    ownerId: "u1", plots: [], createdAt: "2026-02-01" },
];

const FARM_SUMMARY = {
  farmId: "f1", totalYieldKg: 1250, totalInputCostsKes: 8000,
  totalLabourCostsKes: 7000, totalCostsKes: 15000,
  totalRevenueKes: 62500, profitEstimateKes: 47500,
};

const browser = await chromium.launch({ headless: false, executablePath: CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

await ctx.route("**/api/v1/**", async (route) => {
  const url  = route.request().url();
  const meth = route.request().method();

  if (url.includes("/auth/me") && meth === "PATCH")
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ user: USER_PROFILE }) });

  if (url.includes("/auth/me"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ user: USER_PROFILE }) });

  if (url.match(/\/farms\/f1\/report/))
    return route.fulfill({ status: 200, contentType: "application/pdf",
      body: "%PDF-1.4 fake pdf" });

  if (url.match(/\/farms\/f1\/summary/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: FARM_SUMMARY }) });

  if (url.match(/\/farms\/f2\/summary/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { ...FARM_SUMMARY, farmId: "f2", totalYieldKg: 900 } }) });

  // Individual farm GETs must come before the list route
  if (url.match(/\/farms\/f1\/plots/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [] }) });

  if (url.match(/\/farms\/f1\/activities/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }) });

  if (url.match(/\/farms\/f1\/inputs/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }) });

  if (url.match(/\/farms\/f1\/harvests/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }) });

  if (url.match(/\/farms\/f2\/plots/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [] }) });

  if (url.match(/\/farms\/f2\/activities/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }) });

  if (url.match(/\/farms\/f2\/inputs/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }) });

  if (url.match(/\/farms\/f2\/harvests/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }) });

  if (url.match(/\/farms\/f1(\?|$)/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: FARMS[0] }) });

  if (url.match(/\/farms\/f2(\?|$)/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: FARMS[1] }) });

  if (url.includes("/farms") && meth === "GET")
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: FARMS,
        meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 } }) });

  // Stats endpoints for profile screen
  if (url.includes("/diagnoses"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 1, total: 12, totalPages: 1 } }) });

  if (url.includes("/market/listings"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 1, total: 5, totalPages: 1 } }) });

  // Finance endpoints needed for background FinanceHomeScreen
  if (url.includes("/finance/credit-score"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { score: 72, band: "B", maxLoanKes: 50000,
        lastComputedAt: "2026-06-01",
        components: { yield: { score: 80, weight: 0.30 }, inputs: { score: 60, weight: 0.25 },
          activities: { score: 75, weight: 0.25 }, platform: { score: 65, weight: 0.20 } } } }) });

  if (url.includes("/finance/products"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [] }) });

  if (url.includes("/finance/loans"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [] }) });

  if (url.includes("/community/threads"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }) });

  if (url.includes("/community/experts"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [] }) });

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

const shot = async (name) => {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("✅", name);
};
const pageText    = async (limit = 400) => (await page.evaluate(() => document.body.innerText)).slice(0, limit);
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

// ── 25: Profile home ──────────────────────────────────────────────────────────
await fp("Wasifu");
try { await waitForText("Kamau Njoroge", 10000); } catch (_) {}
try { await waitForText("Mashamba", 5000); } catch (_) {}
await shot("25-profile-home");
console.log("  text:", await pageText());

// ── 26: EditProfileScreen (Swahili) ───────────────────────────────────────────
await nav("EditProfile");
try { await waitForText("Hariri wasifu", 10000); } catch (_) {}
try { await waitForText("Jina kamili", 5000); } catch (_) {}
await shot("26-edit-profile-sw");
console.log("  text (sw):", await pageText(300));

// ── 27: Switch to English ─────────────────────────────────────────────────────
await fp("English");
await page.waitForTimeout(1200);
try { await waitForText("Edit profile", 5000); } catch (_) {}
await shot("27-edit-profile-en");
console.log("  text (en):", await pageText(300));

// ── 28: Switch back to Swahili ───────────────────────────────────────────────
await fp("Kiswahili");
await page.waitForTimeout(1200);
try { await waitForText("Hariri wasifu", 5000); } catch (_) {}
await shot("28-edit-profile-sw-restored");
console.log("  text (sw restored):", await pageText(300));

// ── 29: NotificationSettingsScreen ───────────────────────────────────────────
await nav("NotificationSettings");
try { await waitForText("Mipangilio ya Arifa", 10000); } catch (_) {}
try { await waitForText("Vikumbusho vya shughuli", 5000); } catch (_) {}
await shot("29-notification-settings");
console.log("  text:", await pageText(400));

// ── 30: FarmSummaryExportScreen ───────────────────────────────────────────────
await nav("FarmSummaryExport");
try { await waitForText("Muhtasari wa Shamba", 10000); } catch (_) {}
try { await waitForText("Shamba la Kamau", 6000); } catch (_) {}
// Select 2025 season — use locator to avoid hitting other years in DOM
try {
  // Find all buttons that have exactly "2025" text, click the one inside season selector
  const seasonBtn = await page.evaluate(() => {
    for (const el of document.querySelectorAll("*")) {
      if (el.childElementCount === 0 && el.innerText?.trim() === "2025") {
        // Only click if its parent chain is not in the background Farm/Finance/Community tabs
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return `dispatch:2025`;
      }
    }
    return "notFound:2025";
  });
  console.log("  season →", seasonBtn);
} catch (_) {}
await page.waitForTimeout(1200);
try { await waitForText("Mavuno (kg)", 5000); } catch (_) {}
await shot("30-farm-summary-export");
console.log("  text:", await pageText(400));

// ── 31: OfflineStatusScreen ───────────────────────────────────────────────────
await nav("OfflineStatus");
try { await waitForText("Hali ya Offline", 10000); } catch (_) {}
try { await waitForText("Hali ya Mtandao", 5000); } catch (_) {}
await shot("31-offline-status");
console.log("  text:", await pageText(400));

console.log("\nJS errors:", errors.length);
errors.forEach(e => console.log(" -", e.slice(0, 120)));
await browser.close();
console.log("Done. →", OUT);
