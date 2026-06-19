import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const CHROMIUM = "C:\\Users\\Riks\\AppData\\Local\\ms-playwright\\chromium-1148\\chrome-win\\chrome.exe";
const BASE    = "http://localhost:8082";
const OUT     = "C:\\Users\\Riks\\desktop\\agroconnect\\apps\\mobile\\screenshots";
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ── Browser setup ─────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: false, executablePath: CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

await ctx.route("**/api/v1/**", async (route) => {
  const url = route.request().url();
  if (url.includes("/auth/me")) return route.fulfill({ status:200, contentType:"application/json",
    body: JSON.stringify({ user:{ id:"u1", full_name:"Kamau Njoroge", phone:"+254712345678", role:"farmer" } }) });
  if (url.match(/\/farms\/f1(\?|$)/)) return route.fulfill({ status:200, contentType:"application/json",
    body: JSON.stringify({ data:{ id:"f1", name:"Shamba la Kamau", county:"Nakuru",
      areaAcres:5.2, soilType:"loam", gpsLat:null, gpsLng:null,
      status:"active", ownerId:"u1", plots:[], createdAt:"2026-01-01" } }) });
  // /farms list — must match only the collection, NOT sub-resources like /farms/f1/inputs
  if (url.match(/\/farms(\?|$)/)) return route.fulfill({ status:200, contentType:"application/json",
    body: JSON.stringify({ data:[{ id:"f1", name:"Shamba la Kamau", county:"Nakuru",
      areaAcres:5.2, soilType:"loam", gpsLat:null, gpsLng:null,
      status:"active", ownerId:"u1", plots:[], createdAt:"2026-01-01" }],
      meta:{ page:1, pageSize:20, total:1, totalPages:1 } }) });
  return route.fulfill({ status:200, contentType:"application/json",
    body: JSON.stringify({ data:[], meta:{ page:1, pageSize:20, total:0, totalPages:0 } }) });
});

const page = await ctx.newPage();
page.setDefaultTimeout(25000);
const errors = [];
page.on("pageerror", e => {
  const msg = e.message.slice(0, 120);
  const stack = (e.stack || "").split("\n").slice(1, 5).join(" | ");
  console.log("⚠ JS ERROR:", msg);
  if (stack) console.log("  stack:", stack.slice(0, 200));
  errors.push(msg);
});
page.on("console", msg => {
  if (msg.type() === "error") console.log("⚠ CONSOLE ERR:", msg.text().slice(0, 120));
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const shot = async (name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("✅", name);
};

const pageText = async () => (await page.evaluate(() => document.body.innerText)).slice(0, 140);

const waitForText = async (text, timeout = 15000) => {
  await page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout });
};

// Navigate directly via nav ref (no isReady check — just try/catch)
const nav = async (screen, params = {}) => {
  const r = await page.evaluate(([s, p]) => {
    const n = window.__nav__;
    if (!n) return `no ref:${s}`;
    try { n.navigate(s, p); return `navigate:${s}`; }
    catch(e) { return `error:${String(e.message).slice(0,60)}:${s}`; }
  }, [screen, params]);
  console.log("  nav →", r);
  await page.waitForTimeout(1200);
};

// Reset to FarmList via full page reload (clears React state & nav stack)
const resetToList = async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForText("Shamba la Kamau", 20000);
  await freezeQueries();
  await page.waitForTimeout(1500);  // extra settle time after reload
};

// Reduce React Query noise (allow initial fetches but block background re-fetches)
const freezeQueries = async () => {
  await page.evaluate(() => {
    const qc = window.__queryClient__;
    if (qc) qc.setDefaultOptions({ queries: {
      staleTime: Infinity,          // cached data is never stale — no re-fetch
      refetchOnWindowFocus: false,  // no re-fetch on tab focus
      refetchOnReconnect: false,    // no re-fetch on reconnect
      retry: false,                 // no retries on failure
      // refetchOnMount intentionally NOT set — allow first-time fetches
    }});
  });
};

// Click by exact leaf text — dispatches a real bubbling MouseEvent.
// React's event delegation at the document root picks it up correctly (no double-fire).
const fp = async (text) => {
  const r = await page.evaluate((t) => {
    for (const el of document.querySelectorAll("*")) {
      if (el.childElementCount === 0 && el.innerText?.trim() === t) {
        el.dispatchEvent(new MouseEvent("click", { bubbles:true, cancelable:true, view:window }));
        return `dispatch:${t}`;
      }
    }
    return `notFound:${t}`;
  }, text);
  console.log(`  fp("${text}") →`, r);
  await page.waitForTimeout(400);
};

// Fill TextInput by index
const fill = async (idx, value) => {
  const inp = page.locator("input:not([type='password'])").nth(idx);
  if (await inp.count() > 0) { await inp.clear(); await inp.fill(value); }
};

// ── Boot: authenticate and wait for FarmList ──────────────────────────────────
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.setItem("__agroconnect_secure_auth_access_token", "tok"));
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await waitForText("Shamba la Kamau");
await freezeQueries();
await page.waitForTimeout(400);

// ── 01. FarmList ──────────────────────────────────────────────────────────────
await shot("01-farm-list");
console.log("  text:", await pageText());

// ── 02. FarmProfile ───────────────────────────────────────────────────────────
await nav("FarmProfile", { farmId:"f1" });
try { await waitForText("Rekodi shughuli", 12000); } catch(_) {}
await shot("02-farm-profile");
console.log("  text:", await pageText());

// ── 03. ActivityCalendar ──────────────────────────────────────────────────────
await nav("ActivityCalendar", { farmId:"f1" });
try { await waitForText("2026", 8000); } catch(_) {}
await shot("03-activity-calendar");
console.log("  text:", (await pageText()).slice(0, 80));

// ── 04. ActivityForm ──────────────────────────────────────────────────────────
await nav("ActivityForm", { farmId:"f1" });
try { await waitForText("Aina ya shughuli", 8000); } catch(_) {}
await shot("04-activity-form");
console.log("  text:", await pageText());

// ── RESET ─────────────────────────────────────────────────────────────────────
await resetToList();

// ── 05. InputLog ──────────────────────────────────────────────────────────────
await nav("InputLog", { farmId:"f1" });
try { await waitForText("Hakuna pembejeo", 10000); } catch(_) {}  // empty-state title
await page.waitForTimeout(500);
await shot("05-input-log");
console.log("  text:", await pageText());

// ── 06. InputForm ─────────────────────────────────────────────────────────────
await nav("InputForm", { farmId:"f1" });
try { await waitForText("Aina ya pembejeo", 8000); } catch(_) {}
await shot("06-input-form");
console.log("  text:", await pageText());

// ── RESET ─────────────────────────────────────────────────────────────────────
await resetToList();

// ── 07. HarvestLog ────────────────────────────────────────────────────────────
await nav("HarvestLog", { farmId:"f1" });
try { await waitForText("Hakuna mavuno", 10000); } catch(_) {}  // empty-state title
await page.waitForTimeout(500);
await shot("07-harvest-log");
console.log("  text:", await pageText());

// ── 08. HarvestForm ──────────────────────────────────────────────────────────
await nav("HarvestForm", { farmId:"f1" });
await page.waitForTimeout(1500);
await shot("08-harvest-form");
console.log("  text:", await pageText());

// ── RESET ─────────────────────────────────────────────────────────────────────
await resetToList();

// ── 09–12. Wizard ─────────────────────────────────────────────────────────────
await nav("FarmSetupWizard");
try { await waitForText("Jina na Kaunti", 10000); } catch(_) {}
await shot("09-wizard-step1");
console.log("  text:", await pageText());

// Fill step 1
await fill(0, "Shamba Jipya");
await fp("Nakuru");
await shot("09b-wizard-step1-filled");

await fp("Endelea");
try { await waitForText("Eneo na Udongo", 6000); } catch(_) {}
await shot("10-wizard-step2");
console.log("  text:", await pageText());

await fill(0, "3.5");
await fp("loam");
await shot("10b-wizard-step2-filled");

await fp("Endelea");
try { await waitForText("Mahali", 6000); } catch(_) {}
await shot("11-wizard-step3-gps");
console.log("  text:", await pageText());

await fp("Endelea");
try { await waitForText("Zao la kwanza", 6000); } catch(_) {}
await shot("12-wizard-step4-crops");
console.log("  text:", await pageText());

await fp("Mahindi");
await fp("Nyanya");
await fp("Chai");
await page.waitForTimeout(300);
await shot("12b-wizard-step4-selected");

// ── Done ──────────────────────────────────────────────────────────────────────
console.log("\nJS errors:", errors.length);
errors.slice(0, 5).forEach(e => console.log(" -", e.slice(0, 120)));
await browser.close();
console.log("Done. →", OUT);
