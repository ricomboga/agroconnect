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

const WEATHER_FORECAST = [
  { date: "2026-06-15", condition: "partly_cloudy", tempHighC: 24, tempLowC: 14, rainChancePct: 20, humidityPct: 65 },
  { date: "2026-06-16", condition: "rainy",          tempHighC: 19, tempLowC: 12, rainChancePct: 80, humidityPct: 85 },
  { date: "2026-06-17", condition: "cloudy",          tempHighC: 22, tempLowC: 13, rainChancePct: 45, humidityPct: 72 },
  { date: "2026-06-18", condition: "clear",           tempHighC: 26, tempLowC: 15, rainChancePct: 5,  humidityPct: 55 },
  { date: "2026-06-19", condition: "clear",           tempHighC: 27, tempLowC: 16, rainChancePct: 5,  humidityPct: 52 },
  { date: "2026-06-20", condition: "partly_cloudy", tempHighC: 25, tempLowC: 14, rainChancePct: 15, humidityPct: 60 },
  { date: "2026-06-21", condition: "rainy",          tempHighC: 20, tempLowC: 13, rainChancePct: 70, humidityPct: 80 },
];

const WEATHER_ALERTS = [
  {
    id: "a1",
    severity: "warning",
    title: "Heavy Rain Expected",
    description: "Heavy rainfall expected over the Rift Valley. Farmers advised to harvest mature crops.",
    validFrom: "2026-06-16T06:00:00Z",
    validUntil: "2026-06-17T18:00:00Z",
  },
];

const SEASONAL_OUTLOOK = {
  county: "Nakuru",
  season: "Long Rains 2026",
  rainfallOutlook: "Above normal (110–130% of average)",
  temperatureOutlook: "Near normal (19–25°C)",
  farmingAdvisory: "Good season for maize and beans. Prepare well-drained beds to avoid waterlogging.",
};

const PRICE_ALERTS = [
  { id: "pa1", crop: "maize", targetPriceKes: 45, currentPriceKes: 38, trend: "up", enabled: true, createdAt: "2026-06-01" },
  { id: "pa2", crop: "tomato", targetPriceKes: 80, currentPriceKes: 92, trend: "down", enabled: false, createdAt: "2026-06-05" },
  { id: "pa3", crop: "beans", targetPriceKes: 120, currentPriceKes: null, trend: "stable", enabled: true, createdAt: "2026-06-10" },
];

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

  // Weather
  if (url.includes("/weather/forecast"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: WEATHER_FORECAST }) });

  if (url.includes("/weather/alerts"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: WEATHER_ALERTS }) });

  if (url.includes("/weather/seasonal"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: SEASONAL_OUTLOOK }) });

  // Price alerts
  if (url.includes("/market/prices/alerts") && meth === "POST")
    return route.fulfill({ status: 201, contentType: "application/json",
      body: JSON.stringify({ data: { id: "pa4", crop: "potato", targetPriceKes: 60,
        currentPriceKes: 55, trend: "up", enabled: true, createdAt: "2026-06-15" } }) });

  if (url.includes("/market/prices/alerts") && url.match(/\/pa\d+$/) && meth === "PATCH")
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { ...PRICE_ALERTS[0], enabled: false } }) });

  if (url.includes("/market/prices/alerts"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: PRICE_ALERTS }) });

  // Individual farm GETs
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

  if (url.includes("/diagnoses"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 1, total: 12, totalPages: 1 } }) });

  if (url.includes("/market/listings"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 1, total: 5, totalPages: 1 } }) });

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

// ── 32: FarmProfileScreen with WeatherWidget ──────────────────────────────────
// Activate the Farm tab and then navigate to FarmProfile
await fp("Shamba");
try { await waitForText("Shamba la Kamau", 5000); } catch (_) {}
await nav("FarmProfile", { farmId: "f1" });
try { await waitForText("Shamba la Kamau", 8000); } catch (_) {}
try { await waitForText("Hali ya Hewa", 8000); } catch (_) {}
try { await waitForText("Leo", 5000); } catch (_) {}
await shot("32-farm-profile-weather-widget");
console.log("  text:", await pageText(500));

// ── 33: WeatherDetailScreen (via direct nav in Farm stack) ───────────────────
await nav("WeatherDetail", { lat: null, lng: null, county: "Nakuru" });
try { await waitForText("Utabiri wa siku 7", 10000); } catch (_) {}
try { await waitForText("Tahadhari za Hewa", 5000); } catch (_) {}
await shot("33-weather-detail");
console.log("  text:", await pageText(500));

// ── 34: DiagnoseHomeScreen with USSD banner (offline) ────────────────────────
// Simulate offline first, then navigate to Diagnose tab
await page.evaluate(() => {
  localStorage.removeItem("ussd_diagnose_dismissed");
  Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
  window.dispatchEvent(new Event('offline'));
});
await page.waitForTimeout(600);
// Navigate to Diagnose tab using evaluate to click the tab
await page.evaluate(() => {
  for (const el of document.querySelectorAll("*")) {
    if (el.childElementCount === 0 && el.innerText?.trim() === "Uchunguzi") {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return;
    }
  }
});
await page.waitForTimeout(1200);
try { await waitForText("Uchunguzi wa Magonjwa", 8000); } catch (_) {}
try { await waitForText("Piga *384*123#", 3000); } catch (_) {}
await shot("34-diagnose-ussd-banner-offline");
console.log("  text:", await pageText(400));
// Restore online
await page.evaluate(() => {
  Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
  window.dispatchEvent(new Event('online'));
});
await page.waitForTimeout(500);

// ── 35: PriceAlertsScreen ────────────────────────────────────────────────────
// Navigate to Market tab first, then to PriceAlerts
await page.evaluate(() => {
  for (const el of document.querySelectorAll("*")) {
    if (el.childElementCount === 0 && el.innerText?.trim() === "Soko") {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return;
    }
  }
});
await page.waitForTimeout(800);
await nav("PriceAlerts");
try { await waitForText("Arifa za Bei", 10000); } catch (_) {}
try { await waitForText("maize", 5000); } catch (_) {}
await shot("35-price-alerts");
console.log("  text:", await pageText(500));

console.log("\nJS errors:", errors.length);
errors.forEach(e => console.log(" -", e.slice(0, 120)));
await browser.close();
console.log("Done. →", OUT);
