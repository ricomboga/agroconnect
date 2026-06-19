import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const CHROMIUM = "C:\\Users\\Riks\\AppData\\Local\\ms-playwright\\chromium-1148\\chrome-win\\chrome.exe";
const BASE    = "http://localhost:8082";
const OUT     = "C:\\Users\\Riks\\desktop\\agroconnect\\apps\\mobile\\screenshots";
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false, executablePath: CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

await ctx.route("**/api/v1/**", async (route) => {
  const url = route.request().url();
  if (url.includes("/auth/me")) return route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ user: { id: "u1", full_name: "Kamau Njoroge", phone: "+254712345678", role: "farmer" } }) });
  if (url.match(/\/market\/listings(\?|$)/)) return route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ data: [
      { id: "l1", crop: "Mahindi", variety: "H614D", quantityKg: 500, pricePerKg: 45,
        qualityGrade: "A", county: "Nakuru", availableFrom: "2026-07-01", availableTo: null,
        description: "Mahindi bora kutoka Nakuru", photoUrls: [], farmerName: "Kamau Njoroge",
        farmerId: "u1", farmId: "f1", harvestId: null, status: "active", createdAt: "2026-06-10" },
      { id: "l2", crop: "Nyanya", variety: null, quantityKg: 200, pricePerKg: 120,
        qualityGrade: "B", county: "Kiambu", availableFrom: "2026-06-20", availableTo: "2026-07-05",
        description: null, photoUrls: [], farmerName: "Grace Wanjiru",
        farmerId: "u2", farmId: null, harvestId: null, status: "active", createdAt: "2026-06-08" },
    ], meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 } }) });
  if (url.match(/\/market\/products(\?|$)/)) return route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ data: [
      { id: "p1", name: "Urea Fertilizer", brand: "MEA", category: "fertilisers",
        pricePerUnit: 3500, unit: "bag (50kg)", stockStatus: "in_stock",
        county: "Nairobi", supplierId: "s1", supplierName: "AgriSupply Kenya",
        description: "High-quality urea for maize", photoUrl: null },
      { id: "p2", name: "Certified Maize Seed H614D", brand: "KARI", category: "seeds",
        pricePerUnit: 850, unit: "2kg packet", stockStatus: "low_stock",
        county: "Nakuru", supplierId: "s2", supplierName: "SeedCo Kenya",
        description: null, photoUrl: null },
    ], meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 } }) });
  if (url.match(/\/farms\/f1(\?|$)/)) return route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ data: { id: "f1", name: "Shamba la Kamau", county: "Nakuru",
      areaAcres: 5.2, soilType: "loam", gpsLat: null, gpsLng: null,
      status: "active", ownerId: "u1", plots: [], createdAt: "2026-01-01" } }) });
  if (url.match(/\/farms(\?|$)/)) return route.fulfill({ status: 200, contentType: "application/json",
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
const pageText   = async () => (await page.evaluate(() => document.body.innerText)).slice(0, 200);
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

// ── 01: Market home — Sell tab (Uza Mazao) ───────────────────────────────────
// Navigate via bottom-tab click — "Soko" is the Market tab label
await fp("Soko");
try { await waitForText("Uza Mazao", 10000); } catch (_) {}
try { await waitForText("Mahindi", 8000); } catch (_) {}
await shot("13-market-home-sell");
console.log("  text:", await pageText());

// ── 02: Market home — Buy tab (Nunua Bidhaa) ─────────────────────────────────
await fp("Nunua Bidhaa");
try { await waitForText("Mbegu", 8000); } catch (_) {}
await shot("14-market-home-buy");
console.log("  text:", await pageText());

console.log("\nJS errors:", errors.length);
errors.forEach(e => console.log(" -", e.slice(0, 120)));
await browser.close();
console.log("Done. →", OUT);
