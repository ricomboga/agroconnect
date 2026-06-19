import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const CHROMIUM = "C:\\Users\\Riks\\AppData\\Local\\ms-playwright\\chromium-1148\\chrome-win\\chrome.exe";
const BASE    = "http://localhost:8082";
const OUT     = "C:\\Users\\Riks\\desktop\\agroconnect\\apps\\mobile\\screenshots";
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const THREADS = [
  { id: "t1", title: "Mahindi yangu yana madoa ya njano — nifanye nini?",
    body: "Nimegundua madoa ya njano kwenye majani ya mahindi yangu wiki moja iliyopita. Nilinyunyizia dawa lakini haisaidii.",
    category: "crops", cropTag: "Mahindi", authorId: "u1", authorName: "Kamau Njoroge",
    isExpert: false, replyCount: 2, upvoteCount: 12, createdAt: "2026-06-14T08:00:00Z" },
  { id: "t2", title: "Bei ya parachichi Nairobi — Juni 2026",
    body: "Parachichi zinauzwa kwa KES 800 kwa kasha. Je, ni bei nzuri?",
    category: "market", cropTag: "Parachichi", authorId: "u2", authorName: "Grace Wanjiru",
    isExpert: false, replyCount: 7, upvoteCount: 28, createdAt: "2026-06-13T14:00:00Z" },
  { id: "t3", title: "Ng'ombe wangu wanapoteza uzito — msaada!",
    body: "Ng'ombe zangu tatu wamepoteza uzito haraka. Wanakula vizuri lakini wanaonekana dhaifu.",
    category: "livestock", cropTag: null, authorId: "u4", authorName: "Dr. James Mwangi",
    isExpert: true, replyCount: 2, upvoteCount: 5, createdAt: "2026-06-12T10:00:00Z" },
];

const THREAD_DETAIL = {
  thread: { ...THREADS[0], replyCount: 2 },
  replies: [
    { id: "r1", threadId: "t1", authorId: "u2", authorName: "Grace Wanjiru", isExpert: false,
      body: "Nadhani ni Grey Leaf Spot. Jaribu kutumia Mancozeb.",
      upvoteCount: 3, isVerified: false, createdAt: "2026-06-14T09:00:00Z" },
    { id: "r2", threadId: "t1", authorId: "e1", authorName: "Dr. Amina Odhiambo", isExpert: true,
      body: "Ndio, ni dalili za Grey Leaf Spot (MAI-GLS-001). Tumia Mancozeb 80WP kwa 2.5g/L kila siku 7 kwa wiki 3. Kata majani yenye madoa mara moja.",
      upvoteCount: 15, isVerified: true, createdAt: "2026-06-14T10:30:00Z" },
  ],
};

const EXPERTS = [
  { id: "e1", name: "Dr. Amina Odhiambo", photoUrl: null, providerType: "agronomist",
    specialisations: ["Mazao ya nafaka", "Udhibiti wa wadudu", "Kilimo endelevu"],
    countiesServed: ["Nakuru", "Uasin Gishu", "Nandi"],
    rating: 4.8, reviewCount: 127, phone: "+254700123456", whatsapp: "+254700123456" },
  { id: "e2", name: "Dr. Peter Kamau", photoUrl: null, providerType: "vet",
    specialisations: ["Mifugo ya maziwa", "Magonjwa ya ng'ombe"],
    countiesServed: ["Kiambu", "Murang'a"],
    rating: 4.5, reviewCount: 84, phone: "+254701234567", whatsapp: null },
];

const browser = await chromium.launch({ headless: false, executablePath: CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

await ctx.route("**/api/v1/**", async (route) => {
  const url  = route.request().url();
  const meth = route.request().method();

  if (url.includes("/auth/me"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ user: { id: "u1", full_name: "Kamau Njoroge", phone: "+254712345678", role: "farmer" } }) });

  // Finance endpoints needed because FinanceHomeScreen is mounted in background tab
  if (url.includes("/finance/credit-score"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { score: 72, band: "B", maxLoanKes: 50000, lastComputedAt: "2026-06-01",
        components: { yield: { score: 80, weight: 0.30 }, inputs: { score: 60, weight: 0.25 },
          activities: { score: 75, weight: 0.25 }, platform: { score: 65, weight: 0.20 } } } }) });
  if (url.includes("/finance/products"))
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
  if (url.includes("/finance/loans"))
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });

  if (url.includes("/community/experts"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: EXPERTS }) });

  if (url.match(/\/community\/threads\/t1\/replies/) && meth === "POST")
    return route.fulfill({ status: 201, contentType: "application/json",
      body: JSON.stringify({ data: { id: "r3", threadId: "t1", authorId: "u1",
        authorName: "Kamau Njoroge", isExpert: false, body: "Asante sana!",
        upvoteCount: 0, isVerified: false, createdAt: new Date().toISOString() } }) });

  if (url.match(/\/community\/threads\/t1(\?|$)/))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: THREAD_DETAIL }) });

  if (url.match(/\/community\/threads\/t1\/upvote/) && meth === "POST")
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: {} }) });

  if (url.includes("/community/threads") && meth === "POST")
    return route.fulfill({ status: 201, contentType: "application/json",
      body: JSON.stringify({ data: { ...THREADS[0], id: "t4", title: "Swali jipya" } }) });

  if (url.includes("/community/threads"))
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: THREADS, meta: { page: 1, pageSize: 20, total: 3, totalPages: 1 } }) });

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

// ── 20: Community home ────────────────────────────────────────────────────────
await fp("Jamii");
try { await waitForText("Jamii", 10000); } catch (_) {}
try { await waitForText("Mahindi", 8000); } catch (_) {}
await shot("20-community-home");
console.log("  text:", await pageText());

// ── 21: Thread detail (initial state) ─────────────────────────────────────────
await nav("ThreadDetail", { threadId: "t1" });
try { await waitForText("Grey Leaf Spot", 10000); } catch (_) {}
await shot("21-thread-detail");
console.log("  text:", await pageText());

// ── 22: Thread detail (WebSocket live reply) ──────────────────────────────────
// Wait for __simulateReply__ to be registered by useCommunitySocket hook
try {
  await page.waitForFunction(() => typeof window.__simulateReply__ === "function", { timeout: 5000 });
  console.log("  __simulateReply__ ready");
} catch (_) {
  console.log("  __simulateReply__ not found — simulating anyway");
}

await page.evaluate(() => {
  const liveReply = {
    id: "r3", threadId: "t1", authorId: "u3", authorName: "James Mwangi",
    isExpert: true, body: "Pia angalia mifereji ya maji. Unyevu mwingi husababisha ugonjwa huu.",
    upvoteCount: 0, isVerified: false, createdAt: new Date().toISOString(),
  };
  if (typeof window.__simulateReply__ === "function") {
    window.__simulateReply__(liveReply);
  }
});
await page.waitForTimeout(600);
try { await waitForText("James Mwangi", 5000); } catch (_) {}
await shot("22-thread-detail-live-reply");
console.log("  text (live reply check):", await pageText(700));

// ── 23: New thread ────────────────────────────────────────────────────────────
await nav("NewThread");
try { await waitForText("Swali jipya", 10000); } catch (_) {}
// Select "crops" category chip
await fp("Ushauri wa Mazao");
await page.waitForTimeout(800);
// Use placeholder-specific selectors to avoid matching ThreadDetail's reply textarea in the nav stack
await page.locator('input[placeholder="Mfano: Mahindi"]').fill("Viazi");
await page.locator('textarea[placeholder="Andika swali lako kwa ufupi"]').fill("Viazi vyangu vina madoa meusi — ugonjwa gani huu?");
await page.locator('textarea[placeholder="Eleza tatizo lako kwa undani zaidi..."]').fill("Nimeona madoa meusi kwenye majani ya viazi vyangu kwa wiki mbili. Madoa yanaenea haraka. Je, ni ugonjwa wa blight? Nifanye nini?");
await page.waitForTimeout(400);
await shot("23-new-thread");
console.log("  text:", await pageText());

// ── 24: Expert profile ────────────────────────────────────────────────────────
await nav("ExpertProfile", { expertId: "e1" });
try { await waitForText("Dr. Amina Odhiambo", 10000); } catch (_) {}
await shot("24-expert-profile");
console.log("  text:", await pageText());

console.log("\nJS errors:", errors.length);
errors.forEach(e => console.log(" -", e.slice(0, 120)));
await browser.close();
console.log("Done. →", OUT);
