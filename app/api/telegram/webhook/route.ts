// Telegram bot webhook — thin client over the site's own APIs + public data.
// ADDITIVE: new file only. Info/analysis commands (no demo trading). Cron-free, event-driven.
// Setup (one-time):
//   1. Create a bot with @BotFather, get the token.
//   2. In Vercel env set TELEGRAM_BOT_TOKEN (and TELEGRAM_SECRET optional).
//   3. Register the webhook (replace <TOKEN> and <DOMAIN>):
//      https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<DOMAIN>/api/telegram/webhook
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const SECRET = process.env.TELEGRAM_SECRET || "";

function siteOrigin(req: Request): string {
  // aynı deployment'ın kendi origin'i
  try { return new URL(req.url).origin; } catch { return "https://straw-pearl.vercel.app"; }
}

async function tg(method: string, body: any) {
  if (!TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }).catch(() => {});
}

const fmt$ = (n: number) => `$${Math.abs(n) >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toFixed(2)}`;
const COINS_HINT = "any market listed on straw-pearl.vercel.app (BTC, ETH, SOL, XAUT, ...)";

async function getJson(url: string): Promise<any> {
  try { const r = await fetch(url, { cache: "no-store" }); return await r.json(); } catch { return null; }
}

// site klines -> candle[]
async function candles(origin: string, coin: string, interval = "1d"): Promise<any[] | null> {
  const j = await getJson(`${origin}/api/klines?symbol=SODEX:${coin}-USD&interval=${interval}&limit=300`);
  const rows: any[] = j?.candles || j?.data || (Array.isArray(j) ? j : []);
  if (!Array.isArray(rows) || rows.length < 60) return null;
  const c = rows.map((d: any) => Array.isArray(d)
    ? { time: +d[0], open: +d[1], high: +d[2], low: +d[3], close: +d[4], volume: +d[5] || 0 }
    : { time: +(d.time ?? d.t), open: +(d.open ?? d.o), high: +(d.high ?? d.h), low: +(d.low ?? d.l), close: +(d.close ?? d.c), volume: +(d.volume ?? d.v) || 0 })
    .filter((x: any) => isFinite(x.close) && x.close > 0);
  return c.length >= 60 ? c : null;
}

const WELCOME = [
  "🦅 *Strategy DEX — Market Hunter*",
  "",
  "Your command-driven crypto co-pilot. I run 270+ open-source strategies, SoSoValue ETF flows, live market data and a regime engine — and answer in one readable message.",
  "",
  "Tap a button below, or send a ticker like `btc` for a full scan.",
  "Type /help for every command.",
].join("\n");

// ana menü butonları (inline keyboard) — callback_data komut olarak işlenir
const MENU = {
  inline_keyboard: [
    [{ text: "🎯 Hunt", callback_data: "hunt" }, { text: "🌍 Market", callback_data: "market" }],
    [{ text: "🚀 Movers", callback_data: "movers" }, { text: "📰 News", callback_data: "news" }],
    [{ text: "😨 Fear & Greed", callback_data: "fg" }, { text: "🧭 SSI", callback_data: "ssi" }],
    [{ text: "💹 BTC ETF", callback_data: "etf btc" }, { text: "📡 BTC scan", callback_data: "btc" }],
    [{ text: "🤔 Why BTC", callback_data: "why btc" }, { text: "🛠 Setup BTC", callback_data: "setup btc" }],
    [{ text: "🌐 Open Web App", url: "https://straw-pearl.vercel.app/ai-trade" }],
  ],
};

const HELP = [
  "🦅 *Strategy DEX — Market Hunter*",
  "",
  "*Market intel*",
  "/hunt — strongest LONG/SHORT setups across active markets",
  "/market — regime, Fear & Greed, dominance, ETF flows, risks",
  "/movers — 24h top gainers & losers",
  "/news — latest headlines + sentiment tone",
  "/fg — Fear & Greed + weekly trend",
  "/ssi — SoSoValue index momentum (MAG7/DEFI/MEME)",
  "/funding <coin> — perp funding, crowd positioning",
  "",
  "*Coin analysis*",
  "/coin <sym> — full scan + ETF (e.g. /coin btc)",
  "/signals <sym> — strategy scan only",
  "/etf <sym> — ETF flows only",
  "/why <sym> — reasoned verdict (signals+funding+F&G+ETF)",
  "/setup <sym> — ATR-sized trade plan",
  "/confluence <sym> — which strategy families agree",
  "/vol <sym> — volatility (ATR) read",
  "/corr <a> <b> — price correlation of two coins",
  "/history <sym> — last 7-day price summary",
  "/leaderboard — top coins by strategy conviction",
  "/explain <strategy> — what a strategy does",
  "/compare <a> <b> — head-to-head",
  "/price <sym> — quick price",
  "",
  `Coins: ${COINS_HINT} + all listed markets`,
  "Info only — no trading from Telegram.",
].join("\n");

// site MCP scan_live_signals -> parsed sonuç (long/short/signals[].category dahil)
async function scanCoin(origin: string, coin: string): Promise<any | null> {
  const res = await fetch(`${origin}/api/mcp`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "scan_live_signals", arguments: { symbol: coin } } }),
  }).then((r) => r.json()).catch(() => null);
  try { return JSON.parse(res?.result?.content?.[0]?.text || "{}"); } catch { return null; }
}

// genel MCP tool çağrısı (yeni komutlar için)
async function callMcp(origin: string, toolName: string, args: any): Promise<any | null> {
  const res = await fetch(`${origin}/api/mcp`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: toolName, arguments: args } }),
  }).then((r) => r.json()).catch(() => null);
  try { return JSON.parse(res?.result?.content?.[0]?.text || "{}"); } catch { return null; }
}

function atr14(c: any[]): number {
  const trs: number[] = [];
  for (let i = 1; i < c.length; i++) {
    trs.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
  }
  const last = trs.slice(-14);
  return last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
}

// funding: Binance US'ten bloklu olabilir -> OKX -> Bybit fallback
async function fundingRate(coin: string): Promise<number | null> {
  // OKX (usually reachable from Vercel US)
  try {
    const j = await getJson(`https://www.okx.com/api/v5/public/funding-rate?instId=${coin}-USD-SWAP`);
    const r = Number(j?.data?.[0]?.fundingRate);
    if (isFinite(r)) return r;
  } catch { /* next */ }
  try {
    const j = await getJson(`https://www.okx.com/api/v5/public/funding-rate?instId=${coin}-USDT-SWAP`);
    const r = Number(j?.data?.[0]?.fundingRate);
    if (isFinite(r)) return r;
  } catch { /* next */ }
  // Bybit
  try {
    const j = await getJson(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${coin}USDT`);
    const r = Number(j?.result?.list?.[0]?.fundingRate);
    if (isFinite(r)) return r;
  } catch { /* next */ }
  // Binance (works in some regions)
  try {
    const j = await getJson(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${coin}USDT`);
    const r = Number(j?.lastFundingRate);
    if (isFinite(r)) return r;
  } catch { /* give up */ }
  return null;
}

// ---- komut işleyicileri (site API'lerini çağırır) ----
async function cmdSignals(origin: string, coin: string): Promise<string> {
  const d = await scanCoin(origin, coin);
  if (!d || !d.signals) return `Could not fetch signals for ${coin}. Try ${COINS_HINT}.`;
  const top = (d.signals || []).slice(0, 5).map((s: any) => `${s.signal === "long" ? "🟢" : "🔴"} ${s.name} (${s.confidence}) — ${s.reason}`).join("\n");
  return [`📡 *${coin} live scan* — $${Number(d.lastClose).toFixed(2)}`, ``, `🟢 LONG: ${d.long}   🔴 SHORT: ${d.short}   (${d.firing})`, ``, `*Top signals:*`, top].join("\n");
}

async function cmdEtf(origin: string, coin: string): Promise<string> {
  const j = await getJson(`${origin}/api/etf?asset=${coin.toLowerCase()}`);
  const h = j?.history;
  if (!Array.isArray(h) || !h.length) return `No ETF data for ${coin} right now.`;
  const last = h[h.length - 1];
  const wk = h.slice(-7).reduce((a: number, d: any) => a + (+d.net || 0), 0);
  return [
    `💹 *${coin} spot ETF flows* (SoSoValue)`, ``,
    `Daily (${last.date}): ${last.net >= 0 ? "🟢 +" : "🔴 "}${fmt$(last.net)}`,
    `7-day: ${wk >= 0 ? "🟢 +" : "🔴 "}${fmt$(wk)}`,
    `Cumulative: ${fmt$(last.cum)}`,
    last.assets ? `AUM: ${fmt$(last.assets)}` : "",
  ].filter(Boolean).join("\n");
}

async function cmdCoin(origin: string, coin: string): Promise<string> {
  const sig = await cmdSignals(origin, coin);
  const etfAssets = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "LINK", "LTC", "AVAX", "HBAR", "DOT", "HYPE"];
  if (etfAssets.includes(coin)) { const etf = await cmdEtf(origin, coin); return `${sig}\n\n${etf}`; }
  return sig;
}

async function cmdMarket(origin: string): Promise<string> {
  const j = await getJson(`${origin}/api/skills-signal`);
  const m = j?.decision?.market;
  if (!m) return "Could not read the market right now.";
  const fg = Math.round(m.fearGreed ?? 50);
  const alt = Math.round(m.altseasonIndex ?? 50);
  const dom = m.btcDominance != null ? Number(m.btcDominance).toFixed(1) : null;
  const b7 = m.signals?.btcReturn7d;
  const b30 = m.signals?.btcReturn30d;
  const breadth = j.breadth;
  const fgLabel = fg <= 25 ? "extreme fear" : fg <= 45 ? "fear (caution, but often opportunity)" : fg < 55 ? "neutral" : fg < 75 ? "greed" : "extreme greed";

  // ETF: BTC + ETH, günlük + 7 günlük net
  let etfLines: string[] = [];
  try {
    const [bR, eR] = await Promise.all([
      getJson(`${origin}/api/etf?asset=btc`),
      getJson(`${origin}/api/etf?asset=eth`),
    ]);
    const part = (label: string, jj: any) => {
      const h = jj?.history;
      if (!Array.isArray(h) || !h.length) return null;
      const last = h[h.length - 1];
      const wk = h.slice(-7).reduce((a: number, d: any) => a + (Number(d.net) || 0), 0);
      return `${label}: ${last.net >= 0 ? "🟢 +" : "🔴 "}${fmt$(last.net)} today · ${wk >= 0 ? "🟢 +" : "🔴 "}${fmt$(wk)} 7d`;
    };
    etfLines = [part("BTC ETF", bR), part("ETH ETF", eR)].filter(Boolean) as string[];
  } catch { /* etf yoksa özet yine döner */ }

  const risk = (m.riskFlags || []).length ? `⚠️ Risks: ${m.riskFlags.join(", ")}` : "✅ No active risk flags from the engine";

  return [
    `🌍 *Market overview*`, ``,
    `📊 Regime: ${m.regimeLabel || m.regime}${m.regimeConfidence ? ` (${Math.round(m.regimeConfidence)}%)` : ""}`,
    `😨 Fear & Greed: ${fg}/100 — ${fgLabel}`,
    dom ? `👑 BTC dominance: ${dom}%  ·  Altseason: ${alt}/100` : `Altseason: ${alt}/100`,
    (b7 != null && b30 != null) ? `📈 BTC: ${b7 >= 0 ? "+" : ""}${Number(b7).toFixed(1)}% 7d · ${b30 >= 0 ? "+" : ""}${Number(b30).toFixed(1)}% 30d` : "",
    breadth ? `🌐 Breadth: ${breadth.advancers24h}/${breadth.universe} coins up in 24h` : "",
    etfLines.length ? `` : "",
    ...etfLines,
    ``,
    risk,
    m.playbook?.directionBias ? `` : "",
    m.playbook?.directionBias ? `🧭 ${m.playbook.directionBias}` : "",
  ].filter((x) => x !== "").join("\n");
}

async function cmdFg(): Promise<string> {
  const j = await getJson("https://api.alternative.me/fng/?limit=8");
  const arr = j?.data || [];
  if (!arr.length) return "Fear & Greed unavailable right now.";
  const now = +arr[0].value, wk = arr[7] ? +arr[7].value : null;
  const bar = "█".repeat(Math.round(now / 10)) + "░".repeat(10 - Math.round(now / 10));
  return [`😨 *Fear & Greed: ${now}/100* — ${arr[0].value_classification}`, bar, wk != null ? `7-day: ${now - wk >= 0 ? "🟢 +" : "🔴 "}${now - wk} (${wk} → ${now})` : ""].filter(Boolean).join("\n");
}

async function cmdMovers(origin: string): Promise<string> {
  const j = await getJson(`${origin}/api/market-tickers`);
  const rows: any[] = (j?.rows || []).filter((x: any) => x.base && isFinite(x.change) && x.price > 0);
  if (!rows.length) return "Could not fetch tickers right now.";
  const up = [...rows].sort((a, b) => b.change - a.change).slice(0, 5);
  const dn = [...rows].sort((a, b) => a.change - b.change).slice(0, 5);
  const r = (x: any) => `${x.change >= 0 ? "🟢" : "🔴"} ${x.base} ${x.change >= 0 ? "+" : ""}${x.change.toFixed(1)}%`;
  return [`🚀 *24h movers*`, ``, `📈 Gainers:`, ...up.map(r), ``, `📉 Losers:`, ...dn.map(r)].join("\n");
}

async function cmdFunding(coin: string): Promise<string> {
  const rate = await fundingRate(coin);
  if (rate == null) return `Funding unavailable for ${coin} (no perp market found).`;
  const pct = rate * 100;
  const annual = pct * 3 * 365;
  const read = pct > 0.05 ? "🔥 Longs paying heavily — crowd long, contrarian short zone" : pct > 0.01 ? "Longs paying — crowd leans long" : pct < -0.05 ? "🔥 Shorts paying heavily — squeeze-up risk" : pct < -0.01 ? "Shorts paying — crowd leans short" : "Flat — no crowding";
  return [`⚖️ *${coin} funding* (perp)`, ``, `${pct >= 0 ? "🟢" : "🔴"} ${pct >= 0 ? "+" : ""}${pct.toFixed(4)}% / 8h  (~${annual >= 0 ? "+" : ""}${annual.toFixed(0)}% annualized)`, ``, read].join("\n");
}

async function cmdConfluence(origin: string, coin: string): Promise<string> {
  const d = await scanCoin(origin, coin);
  if (!d || !d.signals) return `Could not scan ${coin}. Try ${COINS_HINT}.`;
  const byCat: Record<string, { l: number; s: number }> = {};
  (d.signals || []).forEach((s: any) => {
    const c = (byCat[s.category] ||= { l: 0, s: 0 });
    if (s.signal === "long") c.l++; else c.s++;
  });
  const cats = Object.entries(byCat).map(([cat, v]) => ({ cat, ...v, net: v.l - v.s })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  if (!cats.length) return `No family produced a signal on ${coin} right now.`;
  const agree = cats.filter((x) => x.net > 0).length, disagree = cats.filter((x) => x.net < 0).length;
  return [`🧩 *${coin} confluence* — which families agree`, ``, ...cats.slice(0, 12).map((x) => `${x.net > 0 ? "🟢" : x.net < 0 ? "🔴" : "⚪"} ${x.cat}: ${x.l}L/${x.s}S`), ``, `Consensus: 🟢 ${agree} long · 🔴 ${disagree} short`].join("\n");
}

async function cmdWhy(origin: string, coin: string): Promise<string> {
  const d = await scanCoin(origin, coin);
  if (!d || !d.signals) return `Could not scan ${coin}. Try ${COINS_HINT}.`;
  const dir: "long" | "short" | "flat" = d.long > d.short * 1.3 ? "long" : d.short > d.long * 1.3 ? "short" : "flat";
  const byCat: Record<string, { l: number; s: number }> = {};
  (d.signals || []).forEach((s: any) => { const c = (byCat[s.category] ||= { l: 0, s: 0 }); if (s.signal === "long") c.l++; else c.s++; });
  const famL = Object.values(byCat).filter((v) => v.l > v.s).length, famS = Object.values(byCat).filter((v) => v.s > v.l).length;
  const bullets = [
    `${dir === "long" ? "🟢" : dir === "short" ? "🔴" : "⚪"} Strategies: ${d.long} long vs ${d.short} short`,
    `${famL >= famS ? "🟢" : "🔴"} Families: ${famL} lean long, ${famS} lean short`,
  ];
  const fr = await fundingRate(coin);
  if (fr != null) { const p = fr * 100; bullets.push(p > 0.03 ? "🔴 Funding: longs paying — contrarian headwind" : p < -0.03 ? "🟢 Funding: shorts paying — squeeze fuel" : "⚪ Funding: flat"); }
  const fj = await getJson("https://api.alternative.me/fng/?limit=1");
  const fg = Number(fj?.data?.[0]?.value);
  if (isFinite(fg)) bullets.push(fg <= 30 ? `🟢 Fear & Greed ${fg}: fear supports contrarian longs` : fg >= 70 ? `🔴 Fear & Greed ${fg}: greed, tops form here` : `⚪ Fear & Greed ${fg}: neutral`);
  const etfAssets = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "LINK", "LTC", "AVAX", "HBAR", "DOT", "HYPE"];
  if (etfAssets.includes(coin)) {
    const ej = await getJson(`${origin}/api/etf?asset=${coin.toLowerCase()}`);
    const h = ej?.history;
    if (Array.isArray(h) && h.length) { const wk = h.slice(-7).reduce((a: number, x: any) => a + (+x.net || 0), 0); bullets.push(`${wk >= 0 ? "🟢" : "🔴"} ETF: ${wk >= 0 ? "+" : "-"}${fmt$(Math.abs(wk))} net 7d — institutions ${wk >= 0 ? "accumulating" : "distributing"}`); }
  }
  const verdict = dir === "long" ? "the evidence leans LONG." : dir === "short" ? "the evidence leans SHORT." : "mixed — no clear edge right now.";
  return [`🤔 *Why ${coin}* — the full read`, ``, ...bullets, ``, `🧭 Net read on ${coin}: ${verdict}`].join("\n");
}

async function cmdSetup(origin: string, coin: string): Promise<string> {
  const d = await scanCoin(origin, coin);
  const c = await candles(origin, coin);
  if (!d || !d.signals || !c) return `Could not build a setup for ${coin}. Try ${COINS_HINT}.`;
  const net = (d.signals || []).reduce((a: number, s: any) => a + (s.signal === "long" ? s.confidence : -s.confidence), 0);
  const dir: "long" | "short" | null = net > 0 ? "long" : net < 0 ? "short" : null;
  if (!dir) return `${coin} is flat right now — no directional edge for a setup.`;
  const price = c[c.length - 1].close;
  const a = atr14(c);
  if (a <= 0) return `Could not compute volatility for ${coin}.`;
  const atrPct = (a / price) * 100;
  const slPct = Math.round(atrPct * 1.5 * 10) / 10, tpPct = Math.round(atrPct * 3 * 10) / 10;
  const mul = dir === "long" ? 1 : -1;
  const sl = price * (1 - mul * slPct / 100), tp = price * (1 + mul * tpPct / 100);
  const lev = atrPct > 5 ? 2 : atrPct > 3 ? 3 : atrPct > 1.5 ? 5 : 10;
  const px = (v: number) => v >= 100 ? v.toFixed(2) : v.toFixed(4);
  return [
    `🛠 *${coin} trade setup*`, ``,
    `${dir === "long" ? "🟢 LONG" : "🔴 SHORT"} @ ${px(price)}  (${d.long}L/${d.short}S)`,
    ``,
    `📏 ATR(14): ${atrPct.toFixed(1)}% daily volatility`,
    `🛑 SL: ${px(sl)} (${slPct}% = 1.5×ATR)`,
    `🎯 TP: ${px(tp)} (${tpPct}% = 3×ATR, 1:2 R/R)`,
    `⚖️ Suggested leverage: ${lev}x`,
    ``,
    `_Levels are ATR-based. Not financial advice._`,
  ].join("\n");
}

async function cmdHunt(origin: string): Promise<string> {
  const tj = await getJson(`${origin}/api/market-tickers`);
  let targets = ["BTC", "ETH", "SOL"];
  const movers = (tj?.rows || []).filter((x: any) => x.base && isFinite(x.change)).sort((a: any, b: any) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 8).map((x: any) => String(x.base).toUpperCase());
  targets = Array.from(new Set([...targets, ...movers])).slice(0, 10);
  const scored: any[] = [];
  for (const coin of targets) {
    const res = await fetch(`${origin}/api/mcp`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "scan_live_signals", arguments: { symbol: coin } } }),
    }).then((r) => r.json()).catch(() => null);
    try {
      const d = JSON.parse(res?.result?.content?.[0]?.text || "{}");
      if (d.signals) {
        const net = (d.signals || []).reduce((a: number, s: any) => a + (s.signal === "long" ? s.confidence : -s.confidence), 0);
        scored.push({ coin, price: d.lastClose, long: d.long, short: d.short, net });
      }
    } catch { /* skip */ }
  }
  if (!scored.length) return "Could not fetch market data for the hunt.";
  const L = scored.filter((s) => s.net > 0).sort((a, b) => b.net - a.net).slice(0, 3);
  const S = scored.filter((s) => s.net < 0).sort((a, b) => a.net - b.net).slice(0, 3);
  const row = (s: any) => `${s.net > 0 ? "🟢" : "🔴"} ${s.coin} @ ${s.price >= 100 ? (+s.price).toFixed(0) : (+s.price).toFixed(3)} — ${s.long}L/${s.short}S · score ${s.net > 0 ? "+" : ""}${Math.round(s.net)}`;
  return [`🎯 *Hunt* — ${scored.length} markets scanned`, ``, L.length ? `*Strongest LONG:*` : "", ...L.map(row), S.length ? `` : "", S.length ? `*Strongest SHORT:*` : "", ...S.map(row)].filter(Boolean).join("\n");
}

// Bir coin cevabının altına ilgili aksiyon butonları üretir — SADECE gerçek coin sorgularında.
// market/news/hunt/fg/ssi/movers gibi komutlarda buton ÇIKMAZ.
function coinButtons(text: string): any | undefined {
  const parts = String(text).trim().toLowerCase().split(/\s+/);
  const cmd = parts[0].replace(/^\//, "").replace(/@.*$/, "");
  // coin ile birlikte gelen aksiyon komutları (ör. "why btc")
  const coinActions = ["coin", "signals", "why", "setup", "confluence", "etf", "funding", "price"];
  // coin OLAMAYACAK komut isimleri (tek başına yazılınca buton çıkmamalı)
  const commands = new Set(["start", "help", "hunt", "market", "movers", "top", "fg", "fear", "ssi", "news", "funding", "coin", "signals", "etf", "why", "setup", "confluence", "compare", "price", "vol", "volatility", "corr", "correlation", "leaderboard", "explain", "history", "hist"]);

  let coin: string | null = null;
  let action = "scan";
  if (coinActions.includes(cmd) && parts[1]) { action = cmd; coin = parts[1]; }
  else if (/^[a-z0-9]{2,8}$/.test(cmd) && !commands.has(cmd)) {
    coin = cmd;
    const sub = parts[1];
    action = sub && coinActions.includes(sub) ? sub : "scan";
  }
  if (!coin || commands.has(coin)) return undefined; // komut ismi coin sayılmaz
  const C = coin.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!C) return undefined;
  const lc = C.toLowerCase();
  const B = {
    why: { text: `🤔 Why ${C}`, callback_data: `why ${lc}` },
    setup: { text: `🛠 Setup ${C}`, callback_data: `setup ${lc}` },
    signals: { text: `📡 Signals ${C}`, callback_data: `signals ${lc}` },
    confluence: { text: `🧩 Confluence ${C}`, callback_data: `confluence ${lc}` },
  };
  let row: any[];
  switch (action) {
    case "why": row = [B.setup, B.confluence]; break;
    case "setup": row = [B.why, B.signals]; break;
    case "confluence": row = [B.why, B.setup]; break;
    case "etf": row = [B.signals, B.why]; break;
    case "funding": row = [B.why, B.setup]; break;
    case "price": row = [B.signals, B.setup]; break;
    default: row = [B.why, B.setup]; break; // düz coin / coin / signals
  }
  return { inline_keyboard: [row] };
}

// vol <coin>
async function cmdVol(origin: string, coin: string): Promise<string> {
  const d = await callMcp(origin, "get_volatility", { symbol: coin });
  if (!d || d.atrDailyPct == null) return `Could not read volatility for ${coin}.`;
  return [`📊 *${d.symbol} volatility*`, ``, `ATR daily: ${d.atrDailyPct}% (${d.level})`, `vs recent: ${d.vsRecentAverage}`, `30d avg range: ${d.avg30dRangePct}%`].join("\n");
}

// correlation <a> <b>
async function cmdCorr(origin: string, a: string, b: string): Promise<string> {
  const d = await callMcp(origin, "get_correlation", { symbolA: a, symbolB: b });
  if (!d || d.correlation == null) return `Could not compute correlation for ${a}/${b}.`;
  return [`🔗 *${d.symbolA} vs ${d.symbolB}* correlation`, ``, `${d.correlation} (${d.window})`, d.read].join("\n");
}

// top / leaderboard
async function cmdLeaderboard(origin: string): Promise<string> {
  const d = await callMcp(origin, "get_leaderboard", {});
  if (!d || !d.topLong) return "Could not build the leaderboard right now.";
  const row = (s: any) => `${s.netConviction > 0 ? "🟢" : "🔴"} ${s.coin} — ${s.long}L/${s.short}S · ${s.netConviction > 0 ? "+" : ""}${s.netConviction}`;
  return [`🏆 *Leaderboard* — ${d.scanned} markets`, ``, `*Strongest LONG:*`, ...d.topLong.map(row), ``, `*Strongest SHORT:*`, ...d.topShort.map(row)].join("\n");
}

// explain <strategy>
async function cmdExplain(origin: string, q: string): Promise<string> {
  const d = await callMcp(origin, "explain_strategy", { strategy: q });
  if (!d || !d.name) return `No strategy found matching "${q}". Try /signals for live signals.`;
  return [`📖 *${d.name}* (${d.category})`, ``, d.description, ``, `*Entry:* ${d.entry}`, `*Exit:* ${d.exit}`].join("\n");
}

// history <coin>
async function cmdHistory(origin: string, coin: string): Promise<string> {
  const d = await callMcp(origin, "get_price_history", { symbol: coin, days: 7 });
  if (!d || d.close == null) return `Could not fetch history for ${coin}.`;
  return [`📅 *${d.symbol}* — last ${d.days}d`, ``, `Open ${d.open} → Close ${d.close}`, `Change: ${d.changePct >= 0 ? "+" : ""}${d.changePct}% (${d.trend})`, `High ${d.high} · Low ${d.low}`].join("\n");
}

// SSI: SoSoValue index momentum (MAG7/DEFI/MEME)
async function cmdSsi(origin: string): Promise<string> {
  const j = await getJson(`${origin}/api/market-tickers`);
  const rows: any[] = (j?.rows || []).filter((x: any) => x.category === "ssi");
  if (!rows.length) return "SSI index data unavailable right now.";
  const lines = rows.map((x: any) => {
    const ch = Number(x.change);
    const bias = ch >= 2 ? "🟢 Bullish" : ch >= 0.5 ? "🟢 leaning bullish" : ch <= -2 ? "🔴 Bearish" : ch <= -0.5 ? "🔴 leaning bearish" : "⚪ Neutral";
    return `${x.display || x.base}: ${ch >= 0 ? "+" : ""}${isFinite(ch) ? ch.toFixed(2) : "0"}% — ${bias}`;
  });
  return [`🧭 *SoSoValue Indices (SSI)* — 24h momentum`, ``, ...lines].join("\n");
}

async function handle(origin: string, text: string): Promise<string> {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/^\//, "").replace(/@.*$/, "");
  const arg1 = (parts[1] || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const arg2 = (parts[2] || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  switch (cmd) {
    case "start": return "__WELCOME__";
    case "help": return HELP;
    case "hunt": return await cmdHunt(origin);
    case "market": return await cmdMarket(origin);
    case "movers": case "top": return await cmdMovers(origin);
    case "fg": case "fear": return await cmdFg();
    case "ssi": return await cmdSsi(origin);
    case "news": {
      const j = await getJson(`${origin}/api/news?page=1`);
      const items = (j?.items || []).slice(0, 6);
      if (!items.length) return "No news available right now.";
      return [`📰 *Latest news*`, ``, ...items.map((n: any) => `${n.sentiment === "bullish" ? "🟢" : n.sentiment === "bearish" ? "🔴" : "⚪"} ${String(n.title).slice(0, 110)}`)].join("\n");
    }
    case "funding": return arg1 ? await cmdFunding(arg1) : "Usage: /funding btc";
    case "coin": return arg1 ? await cmdCoin(origin, arg1) : "Usage: /coin btc";
    case "signals": return arg1 ? await cmdSignals(origin, arg1) : "Usage: /signals btc";
    case "etf": return arg1 ? await cmdEtf(origin, arg1) : "Usage: /etf btc";
    case "why": return arg1 ? await cmdWhy(origin, arg1) : "Usage: /why btc";
    case "setup": return arg1 ? await cmdSetup(origin, arg1) : "Usage: /setup btc";
    case "confluence": return arg1 ? await cmdConfluence(origin, arg1) : "Usage: /confluence btc";
    case "vol": case "volatility": return arg1 ? await cmdVol(origin, arg1) : "Usage: /vol btc";
    case "corr": case "correlation": return arg1 && arg2 ? await cmdCorr(origin, arg1, arg2) : "Usage: /corr btc eth";
    case "leaderboard": return await cmdLeaderboard(origin);
    case "explain": return parts.slice(1).join(" ") ? await cmdExplain(origin, parts.slice(1).join(" ")) : "Usage: /explain fvg";
    case "history": case "hist": return arg1 ? await cmdHistory(origin, arg1) : "Usage: /history btc";
    case "price": {
      if (!arg1) return "Usage: /price btc";
      const c = await candles(origin, arg1, "1m"); const p = c ? c[c.length - 1].close : null;
      return p ? `💲 *${arg1}*: $${p >= 100 ? p.toFixed(2) : p.toFixed(4)}` : `Could not fetch price for ${arg1}.`;
    }
    case "compare": {
      if (!arg1 || !arg2) return "Usage: /compare btc eth";
      const [a, b] = await Promise.all([cmdSignals(origin, arg1), cmdSignals(origin, arg2)]);
      return `⚔️ *${arg1} vs ${arg2}*\n\n${a}\n\n———\n\n${b}`;
    }
    default: {
      // slash'sız kullanım: "btc" -> full scan+etf, "btc signals" / "btc why" / "btc etf" ...
      if (/^[A-Z0-9]{2,8}$/.test(cmd.toUpperCase())) {
        const coin = cmd.toUpperCase();
        const sub = (parts[1] || "").toLowerCase();
        if (sub === "signals") return await cmdSignals(origin, coin);
        if (sub === "etf") return await cmdEtf(origin, coin);
        if (sub === "why") return await cmdWhy(origin, coin);
        if (sub === "setup") return await cmdSetup(origin, coin);
        if (sub === "confluence") return await cmdConfluence(origin, coin);
        if (sub === "funding") return await cmdFunding(coin);
        if (sub === "price") { const c = await candles(origin, coin, "1m"); const p = c ? c[c.length - 1].close : null; return p ? `💲 *${coin}*: $${p >= 100 ? p.toFixed(2) : p.toFixed(4)}` : `Could not fetch price for ${coin}.`; }
        return await cmdCoin(origin, coin); // düz "btc" -> tam analiz
      }
      return "Unknown command. Send /help for the list.";
    }
  }
}

export async function POST(req: Request) {
  if (SECRET) {
    const hdr = req.headers.get("x-telegram-bot-api-secret-token");
    if (hdr !== SECRET) return NextResponse.json({ ok: true }); // sessiz
  }
  const origin = siteOrigin(req);
  let update: any;
  try { update = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  // --- buton tıklaması (inline keyboard) ---
  const cq = update?.callback_query;
  if (cq) {
    const chatId = cq.message?.chat?.id;
    const data: string = cq.data || "";
    await tg("answerCallbackQuery", { callback_query_id: cq.id }); // "yükleniyor" halkasını kapat
    if (chatId && data) {
      try {
        const reply = await handle(origin, data);
        await tg("sendMessage", { chat_id: chatId, text: reply === "__WELCOME__" ? WELCOME : reply, parse_mode: "Markdown", disable_web_page_preview: true, reply_markup: coinButtons(data) });
      } catch {
        await tg("sendMessage", { chat_id: chatId, text: "Something went wrong. Try /help." });
      }
    }
    return NextResponse.json({ ok: true });
  }

  const msg = update?.message || update?.edited_message;
  const chatId = msg?.chat?.id;
  const text: string = msg?.text || "";
  if (!chatId || !text) return NextResponse.json({ ok: true });

  try {
    const reply = await handle(origin, text);
    if (reply === "__WELCOME__") {
      await tg("sendMessage", { chat_id: chatId, text: WELCOME, parse_mode: "Markdown", disable_web_page_preview: true, reply_markup: MENU });
    } else {
      await tg("sendMessage", { chat_id: chatId, text: reply, parse_mode: "Markdown", disable_web_page_preview: true, reply_markup: coinButtons(text) });
    }
  } catch {
    await tg("sendMessage", { chat_id: chatId, text: "Something went wrong. Try /help." });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ bot: "strategy-dex", status: TOKEN ? "configured" : "missing TELEGRAM_BOT_TOKEN", commands: ["hunt", "market", "movers", "news", "fg", "funding", "coin", "signals", "etf", "price", "compare", "help"] });
}
