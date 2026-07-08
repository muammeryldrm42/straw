// MCP server for Strategy DEX — exposes the strategy engine as tools over JSON-RPC 2.0
// (Streamable HTTP transport). This is an ADDITIVE endpoint: it only reads existing
// libraries (registry, strategyBacktest, cmc client) and does not modify anything else.
import { NextResponse } from "next/server";
import { STRATEGIES, CATEGORY_LABELS, type Category } from "@/lib/registry";
import { getOhlcvHistorical } from "@/lib/cmc/client";
import type { Candle } from "@/lib/indicators";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SERVER = { name: "strategy-dex", version: "1.5.0" };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
};

const TOOLS = [
  {
    name: "list_categories",
    description: "List all trading-strategy categories with how many strategies each contains.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_strategies",
    description: "List trading strategies (id, name, category), optionally filtered by category.",
    inputSchema: { type: "object", properties: { category: { type: "string", description: "Optional category id, e.g. 'momentum', 'smc', 'scalping'." } }, additionalProperties: false },
  },
  {
    name: "scan_live_signals",
    description: "Run every strategy on the latest real daily price history for a symbol and return the ones currently firing a long or short signal, with a long/short tally.",
    inputSchema: { type: "object", properties: { symbol: { type: "string", description: "Coin symbol, e.g. BTC, ETH, SOL." } }, required: ["symbol"], additionalProperties: false },
  },
  {
    name: "backtest_strategy",
    description: "Backtest a single strategy (by id) on real BTC history and return its metrics: total return, sharpe, max drawdown, win rate, exposure.",
    inputSchema: { type: "object", properties: { strategyId: { type: "string" }, days: { type: "number", description: "Lookback days (200-1500, default 1460)." } }, required: ["strategyId"], additionalProperties: false },
  },
  {
    name: "get_etf_flows",
    description: "Get US/HK spot-ETF flows for an asset (BTC, ETH, SOL, XRP, DOGE, BNB, ...) from SoSoValue: latest daily & cumulative net inflow, AUM, per-fund breakdown and recent history.",
    inputSchema: { type: "object", properties: { asset: { type: "string", description: "Asset symbol: BTC, ETH, SOL, XRP, DOGE, BNB, LINK, LTC, AVAX, HBAR, DOT. Prefix with 'hk-' for Hong Kong ETFs (hk-btc, hk-eth, hk-sol)." } }, required: ["asset"], additionalProperties: false },
  },
  {
    name: "hunt_setups",
    description: "Scan the most active markets through all strategies and return the strongest LONG and SHORT setups ranked by net conviction. The 'what's the best opportunity right now?' tool.",
    inputSchema: { type: "object", properties: { direction: { type: "string", enum: ["long", "short", "both"], description: "Filter to only long, only short, or both (default both)." } }, additionalProperties: false },
  },
  {
    name: "analyze_coin",
    description: "Full reasoned analysis of one coin: strategy tally, strategy-family consensus (which categories agree), funding, Fear & Greed and ETF flows fused into a net LONG/SHORT/mixed verdict.",
    inputSchema: { type: "object", properties: { symbol: { type: "string", description: "Coin symbol, e.g. BTC, ETH, SOL." } }, required: ["symbol"], additionalProperties: false },
  },
  {
    name: "get_market_overview",
    description: "One-call market read: regime with confidence, Fear & Greed, BTC dominance, Altseason, BTC 7d/30d, breadth, BTC/ETH ETF net flows, engine risk flags and the playbook bias.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_funding",
    description: "Perp funding rate for a coin (OKX/Bybit) with an annualized figure and a crowd-positioning read (who is paying whom, squeeze/contrarian zones).",
    inputSchema: { type: "object", properties: { symbol: { type: "string", description: "Coin symbol, e.g. BTC, ETH, SOL." } }, required: ["symbol"], additionalProperties: false },
  },
  {
    name: "get_fear_greed",
    description: "Crypto Fear & Greed Index: current value, classification and the 7-day trend.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_news",
    description: "Latest crypto news headlines from SoSoValue, each tagged bullish/bearish/neutral, plus an overall news-tone summary.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_movers",
    description: "Top 24h gainers and losers across the listed markets, with prices and percentage moves.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_ssi",
    description: "SoSoValue Indices (MAG7.ssi, DEFI.ssi, MEME.ssi) 24h momentum with a directional bias per index.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_trade_setup",
    description: "An ATR-sized trade plan for a coin: engine direction, stop at 1.5x ATR, take-profit at 3x ATR (1:2 R/R) and a volatility-adjusted leverage suggestion.",
    inputSchema: { type: "object", properties: { symbol: { type: "string", description: "Coin symbol, e.g. BTC, ETH, SOL." } }, required: ["symbol"], additionalProperties: false },
  },
  {
    name: "get_volatility",
    description: "Volatility report for a coin: ATR-based daily volatility %, how it compares to its recent average (calmer/more volatile), and a level (low/moderate/high/extreme).",
    inputSchema: { type: "object", properties: { symbol: { type: "string", description: "Coin symbol, e.g. BTC, ETH, SOL." } }, required: ["symbol"], additionalProperties: false },
  },
  {
    name: "get_correlation",
    description: "Price correlation between two coins over the recent window (-1 to +1), with an interpretation (move together vs independent) useful for diversification.",
    inputSchema: { type: "object", properties: { symbolA: { type: "string" }, symbolB: { type: "string" } }, required: ["symbolA", "symbolB"], additionalProperties: false },
  },
  {
    name: "get_leaderboard",
    description: "Scan active markets and return the top coins ranked by net strategy conviction — the strongest longs and strongest shorts in a compact ranked list.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "explain_strategy",
    description: "Explain a strategy from the library by id or name: what it does, its entry and exit logic, and its category.",
    inputSchema: { type: "object", properties: { strategy: { type: "string", description: "Strategy id or name, e.g. 'fvg' or 'Fair Value Gap'." } }, required: ["strategy"], additionalProperties: false },
  },
  {
    name: "get_price_history",
    description: "Recent price summary for a coin: last N days of open/close, percent change, high/low and a simple trend read.",
    inputSchema: { type: "object", properties: { symbol: { type: "string" }, days: { type: "number", description: "How many days to summarise (default 7)." } }, required: ["symbol"], additionalProperties: false },
  },
];

// MCP-içi hafif backtest (site backtest motorundan bağımsız; aynı mantık: long+short, min-hold, cost).
function mcpMetrics(returns: number[]) {
  const active = returns.filter((r) => r !== 0);
  const mean = active.reduce((a, b) => a + b, 0) / (active.length || 1);
  const std = Math.sqrt(active.reduce((a, b) => a + (b - mean) ** 2, 0) / (active.length || 1)) || 1e-9;
  let eq = 1, peak = 1, maxDD = 0, wins = 0;
  for (const r of returns) { eq *= 1 + r; peak = Math.max(peak, eq); maxDD = Math.min(maxDD, eq / peak - 1); if (r > 0) wins++; }
  return {
    totalReturn: Math.round((eq - 1) * 1e4) / 1e4,
    sharpe: Math.round((mean / std) * Math.sqrt(365) * 100) / 100,
    maxDrawdown: Math.round(maxDD * 1e4) / 1e4,
    winRate: Math.round((wins / (active.length || 1)) * 1000) / 1000,
    exposureDays: active.length,
  };
}
function mcpBacktest(run: NonNullable<(typeof STRATEGIES)[number]["run"]>, candles: Candle[]) {
  const W = Math.min(120, Math.floor(candles.length / 3)), COST = 0.0006, MIN_HOLD = 8;
  let pos = 0, lockUntil = -1;
  const rets: number[] = [];
  for (let i = W; i < candles.length - 1; i++) {
    const prev = pos;
    if (i > lockUntil) {
      let sig: any = null;
      try { sig = run(candles.slice(Math.max(0, i - W), i + 1)); } catch { sig = null; }
      if (sig) {
        if (sig.signal === "long" && pos !== 1) { pos = 1; lockUntil = i + MIN_HOLD; }
        else if (sig.signal === "short" && pos !== -1) { pos = -1; lockUntil = i + MIN_HOLD; }
      }
    }
    const nbtc = (candles[i + 1].close - candles[i].close) / candles[i].close;
    let r = pos * nbtc;
    if (pos !== prev) r -= COST;
    rets.push(r);
  }
  return mcpMetrics(rets);
}

function text(obj: unknown) {
  return { content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] };
}

// Canlı sinyal taraması için gerçek OHLCV. Kaynak zinciri: site SoDEX klines (ALL listed markets) ->
// Coinbase -> CryptoCompare -> CMC. İlk yeterli veriyi döndüreni kullanır. backtest motoruna dokunmaz.
async function fetchLiveCandles(symbol: string, origin?: string): Promise<Candle[] | null> {
  // 0. Site's own SoDEX klines — supports every market the site lists (XAUT, stocks, etc.)
  if (origin) {
    try {
      const r = await fetch(`${origin}/api/klines?symbol=SODEX:${symbol}-USD&interval=1d&limit=300`, { cache: "no-store" });
      const j: any = await r.json();
      const rows: any[] = j?.candles || j?.data || (Array.isArray(j) ? j : []);
      if (Array.isArray(rows) && rows.length > 60) {
        const c: Candle[] = rows
          .map((d: any) => Array.isArray(d)
            ? { time: +d[0], open: +d[1], high: +d[2], low: +d[3], close: +d[4], volume: +d[5] || 0 }
            : { time: +(d.time ?? d.t), open: +(d.open ?? d.o), high: +(d.high ?? d.h), low: +(d.low ?? d.l), close: +(d.close ?? d.c), volume: +(d.volume ?? d.v) || 0 })
          .filter((x: Candle) => isFinite(x.close) && x.close > 0);
        if (c.length > 60) return c;
      }
    } catch { /* fall through */ }
  }
  // 1. Coinbase Exchange (public, keyless, reachable from Vercel US)
  try {
    const r = await fetch(`https://api.exchange.coinbase.com/products/${symbol}-USD/candles?granularity=86400`, { cache: "no-store", headers: { "User-Agent": "strategy-dex" } });
    const j: any = await r.json();
    if (Array.isArray(j) && j.length > 60) {
      // Coinbase row: [time, low, high, open, close, volume]
      const c: Candle[] = j
        .map((d: any[]) => ({ time: d[0], low: d[1], high: d[2], open: d[3], close: d[4], volume: d[5] }))
        .filter((x: Candle) => isFinite(x.close) && x.close > 0)
        .sort((a: Candle, b: Candle) => a.time - b.time);
      if (c.length > 60) return c;
    }
  } catch { /* fall through */ }
  // 2. CryptoCompare (keyless real OHLCV)
  try {
    const r = await fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=300`, { cache: "no-store" });
    const j: any = await r.json();
    const rows = j?.Data?.Data;
    if (Array.isArray(rows) && rows.length > 60) {
      const c: Candle[] = rows
        .map((d: any) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volumeto ?? d.volumefrom ?? 0 }))
        .filter((x: Candle) => isFinite(x.close) && x.close > 0);
      if (c.length > 60) return c;
    }
  } catch { /* fall through */ }
  // 3. CMC (may be key-gated)
  try {
    const h = await getOhlcvHistorical(symbol, 300);
    const c: Candle[] = h.data.quotes
      .map((q) => { const u = q.quote.USD; const close = u.close; return { time: Math.floor(new Date(q.time_close).getTime() / 1000), open: u.open ?? close, high: u.high ?? close, low: u.low ?? close, close, volume: u.volume ?? 0 }; })
      .filter((x) => isFinite(x.close) && x.close > 0)
      .sort((a, b) => a.time - b.time);
    if (c.length > 60) return c;
  } catch { /* fall through */ }
  return null;
}

async function callTool(name: string, args: any, origin: string) {
  const active = STRATEGIES.filter((s) => s.category !== "memecoin");

  if (name === "get_etf_flows") {
    const asset = String(args?.asset || "btc").toLowerCase().replace(/[^a-z-]/g, "");
    if (!asset) return text("An 'asset' is required (e.g. BTC, ETH, SOL).");
    try {
      const r = await fetch(`${origin}/api/etf?asset=${asset}`, { cache: "no-store" });
      const j: any = await r.json();
      if (!j || j.error) return text(`ETF data unavailable for ${asset.toUpperCase()} (${j?.error || "no data"}).`);
      const hist: any[] = Array.isArray(j.history) ? j.history : [];
      const last = hist[hist.length - 1];
      return text({
        asset: asset.toUpperCase(),
        latest: last ? { date: last.date, netInflowUsd: last.net, cumulativeUsd: last.cum, aumUsd: last.assets } : null,
        recent: hist.slice(-14),
        funds: j.funds ?? [],
        summary: j.summary ?? null,
      });
    } catch {
      return text(`Could not fetch ETF flows for ${asset.toUpperCase()}.`);
    }
  }

  if (name === "list_categories") {
    const counts: Record<string, number> = {};
    active.forEach((s) => { counts[s.category] = (counts[s.category] || 0) + 1; });
    return text(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ id: c, label: CATEGORY_LABELS[c as Category] ?? c, strategies: n })));
  }

  if (name === "list_strategies") {
    const cat = args?.category ? String(args.category) : null;
    const list = active.filter((s) => !cat || s.category === cat).map((s) => ({ id: s.id, name: s.name, category: s.category }));
    return text({ count: list.length, strategies: list });
  }

  if (name === "scan_live_signals") {
    const symbol = String(args?.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!symbol) return text("A 'symbol' is required (e.g. BTC).");
    const candles = await fetchLiveCandles(symbol, origin);
    if (!candles || candles.length < 60) return text(`Could not fetch enough price history for ${symbol}. Try BTC, ETH or SOL.`);
    const firing: any[] = [];
    active.filter((s) => s.run).forEach((s) => {
      try {
        const sig = s.run!(candles);
        if (sig && sig.signal !== "neutral") firing.push({ id: s.id, name: s.name, category: s.category, signal: sig.signal, confidence: sig.confidence, reason: sig.reason });
      } catch { /* strategy skipped */ }
    });
    firing.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    return text({
      symbol,
      candlesUsed: candles.length,
      lastClose: candles[candles.length - 1].close,
      firing: firing.length,
      long: firing.filter((f) => f.signal === "long").length,
      short: firing.filter((f) => f.signal === "short").length,
      signals: firing,
    });
  }

  if (name === "backtest_strategy") {
    const id = String(args?.strategyId || "");
    if (!id) return text("A 'strategyId' is required.");
    const strat = active.find((s) => s.id === id);
    if (!strat || !strat.run) return text(`Strategy '${id}' not found (or off-chain). Use list_strategies to see valid ids.`);
    const candles = await fetchLiveCandles("BTC", origin);
    if (!candles || candles.length < 80) return text("Could not fetch enough BTC history to backtest right now.");
    const m = mcpBacktest(strat.run, candles);
    return text({ id: strat.id, name: strat.name, category: strat.category, symbol: "BTC", daysTested: candles.length, direction: "long+short", ...m });
  }

  // ---- yeni tool'lar ----

  // ortak: bir coin'i skorla (net conviction)
  const scoreOne = (candles: Candle[]) => {
    let longs = 0, shorts = 0, net = 0;
    const byCat: Record<string, { l: number; s: number }> = {};
    active.filter((s) => s.run).forEach((s) => {
      try {
        const sig = s.run!(candles);
        if (sig && sig.signal !== "neutral") {
          const c = sig.confidence ?? 0;
          const cat = (byCat[s.category] ||= { l: 0, s: 0 });
          if (sig.signal === "long") { longs++; net += c; cat.l++; } else { shorts++; net -= c; cat.s++; }
        }
      } catch { /* skip */ }
    });
    return { longs, shorts, net, byCat };
  };

  const atr14 = (c: Candle[]) => {
    const trs: number[] = [];
    for (let i = 1; i < c.length; i++) trs.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
    const last = trs.slice(-14);
    return last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
  };

  const getFunding = async (coin: string): Promise<number | null> => {
    for (const u of [`https://www.okx.com/api/v5/public/funding-rate?instId=${coin}-USD-SWAP`, `https://www.okx.com/api/v5/public/funding-rate?instId=${coin}-USDT-SWAP`]) {
      try { const j: any = await (await fetch(u, { cache: "no-store" })).json(); const r = Number(j?.data?.[0]?.fundingRate); if (isFinite(r)) return r; } catch { /* next */ }
    }
    try { const j: any = await (await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${coin}USDT`, { cache: "no-store" })).json(); const r = Number(j?.result?.list?.[0]?.fundingRate); if (isFinite(r)) return r; } catch { /* next */ }
    return null;
  };

  const originGet = async (path: string) => { try { return await (await fetch(`${origin}${path}`, { cache: "no-store" })).json(); } catch { return null; } };

  if (name === "hunt_setups") {
    const dir = args?.direction || "both";
    let targets = ["BTC", "ETH", "SOL"];
    const tj = await originGet("/api/market-tickers");
    const movers = (tj?.rows || []).filter((x: any) => x.base && isFinite(x.change)).sort((a: any, b: any) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 9).map((x: any) => String(x.base).toUpperCase());
    targets = Array.from(new Set([...targets, ...movers])).slice(0, 10);
    const scored: any[] = [];
    for (const coin of targets) {
      const c = await fetchLiveCandles(coin, origin);
      if (!c) continue;
      const s = scoreOne(c);
      scored.push({ coin, price: c[c.length - 1].close, longs: s.longs, shorts: s.shorts, net: Math.round(s.net) });
    }
    if (!scored.length) return text("Could not fetch market data for the hunt.");
    const longs = dir === "short" ? [] : scored.filter((s) => s.net > 0).sort((a, b) => b.net - a.net).slice(0, 5);
    const shorts = dir === "long" ? [] : scored.filter((s) => s.net < 0).sort((a, b) => a.net - b.net).slice(0, 5);
    return text({ scanned: scored.length, strongestLong: longs, strongestShort: shorts });
  }

  if (name === "analyze_coin") {
    const symbol = String(args?.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!symbol) return text("A 'symbol' is required.");
    const candles = await fetchLiveCandles(symbol, origin);
    if (!candles) return text(`Could not fetch price history for ${symbol}.`);
    const s = scoreOne(candles);
    const dir = s.longs > s.shorts * 1.3 ? "long" : s.shorts > s.longs * 1.3 ? "short" : "mixed";
    const families = Object.entries(s.byCat).map(([cat, v]) => ({ category: cat, long: v.l, short: v.s, net: v.l - v.s })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    const famLong = families.filter((f) => f.net > 0).length, famShort = families.filter((f) => f.net < 0).length;
    const funding = await getFunding(symbol);
    let etf7d: number | null = null;
    try { const ej = await originGet(`/api/etf?asset=${symbol.toLowerCase()}`); const h = ej?.history; if (Array.isArray(h) && h.length) etf7d = h.slice(-7).reduce((a: number, d: any) => a + (Number(d.net) || 0), 0); } catch { /* skip */ }
    return text({
      symbol, lastClose: candles[candles.length - 1].close,
      strategies: { long: s.longs, short: s.shorts, netConviction: Math.round(s.net) },
      familyConsensus: { leanLong: famLong, leanShort: famShort, byFamily: families.slice(0, 12) },
      fundingRatePct: funding != null ? Math.round(funding * 1e6) / 1e4 : null,
      etfNet7dUsd: etf7d,
      verdict: dir,
    });
  }

  if (name === "get_market_overview") {
    const j = await originGet("/api/skills-signal");
    const m = j?.decision?.market;
    if (!m) return text("Could not read the market right now.");
    let btcEtf7d: number | null = null, ethEtf7d: number | null = null;
    try { const b = await originGet("/api/etf?asset=btc"); if (b?.history?.length) btcEtf7d = b.history.slice(-7).reduce((a: number, d: any) => a + (Number(d.net) || 0), 0); } catch { /* skip */ }
    try { const e = await originGet("/api/etf?asset=eth"); if (e?.history?.length) ethEtf7d = e.history.slice(-7).reduce((a: number, d: any) => a + (Number(d.net) || 0), 0); } catch { /* skip */ }
    return text({
      regime: m.regimeLabel || m.regime,
      regimeConfidence: m.regimeConfidence ?? null,
      fearGreed: Math.round(m.fearGreed ?? 50),
      btcDominancePct: m.btcDominance ?? null,
      altseasonIndex: Math.round(m.altseasonIndex ?? 50),
      btcReturn7dPct: m.signals?.btcReturn7d ?? null,
      btcReturn30dPct: m.signals?.btcReturn30d ?? null,
      breadth: j.breadth ?? null,
      btcEtfNet7dUsd: btcEtf7d,
      ethEtfNet7dUsd: ethEtf7d,
      riskFlags: m.riskFlags || [],
      playbookBias: m.playbook?.directionBias ?? null,
    });
  }

  if (name === "get_funding") {
    const symbol = String(args?.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!symbol) return text("A 'symbol' is required.");
    const r = await getFunding(symbol);
    if (r == null) return text(`Funding unavailable for ${symbol} (no perp market found).`);
    const pct = r * 100;
    const read = pct > 0.05 ? "longs paying heavily (crowd long, contrarian short zone)" : pct > 0.01 ? "longs paying (crowd leans long)" : pct < -0.05 ? "shorts paying heavily (squeeze-up risk)" : pct < -0.01 ? "shorts paying (crowd leans short)" : "flat (no crowding)";
    return text({ symbol, fundingRatePctPer8h: Math.round(pct * 1e4) / 1e4, annualizedPct: Math.round(pct * 3 * 365 * 10) / 10, read });
  }

  if (name === "get_fear_greed") {
    try {
      const r: any = await (await fetch("https://api.alternative.me/fng/?limit=8", { cache: "no-store" })).json();
      const arr = r?.data || [];
      if (!arr.length) return text("Fear & Greed unavailable right now.");
      const now = Number(arr[0].value), wk = arr[7] ? Number(arr[7].value) : null;
      return text({ value: now, classification: arr[0].value_classification, weekAgo: wk, weeklyChange: wk != null ? now - wk : null });
    } catch { return text("Fear & Greed unavailable right now."); }
  }

  if (name === "get_news") {
    const j = await originGet("/api/news?page=1");
    const items = (j?.items || []).slice(0, 8);
    if (!items.length) return text("No news available right now.");
    let bull = 0, bear = 0;
    const headlines = items.map((n: any) => { if (n.sentiment === "bullish") bull++; if (n.sentiment === "bearish") bear++; return { title: String(n.title).slice(0, 140), sentiment: n.sentiment || "neutral", currencies: n.currencies || [] }; });
    return text({ tone: bull > bear ? "leaning bullish" : bear > bull ? "leaning bearish" : "mixed", bullish: bull, bearish: bear, headlines });
  }

  if (name === "get_movers") {
    const j = await originGet("/api/market-tickers");
    const rows: any[] = (j?.rows || []).filter((x: any) => x.base && isFinite(x.change) && x.price > 0);
    if (!rows.length) return text("Could not fetch tickers right now.");
    const map = (x: any) => ({ symbol: x.base, changePct: Math.round(x.change * 10) / 10, price: x.price });
    return text({ gainers: [...rows].sort((a, b) => b.change - a.change).slice(0, 5).map(map), losers: [...rows].sort((a, b) => a.change - b.change).slice(0, 5).map(map) });
  }

  if (name === "get_ssi") {
    const j = await originGet("/api/market-tickers");
    const rows: any[] = (j?.rows || []).filter((x: any) => x.category === "ssi");
    if (!rows.length) return text("SSI index data unavailable right now.");
    return text({ indices: rows.map((x: any) => { const ch = Number(x.change); const bias = ch >= 2 ? "bullish" : ch >= 0.5 ? "leaning bullish" : ch <= -2 ? "bearish" : ch <= -0.5 ? "leaning bearish" : "neutral"; return { index: x.display || x.base, changePct: Math.round(ch * 100) / 100, bias }; }) });
  }

  if (name === "get_trade_setup") {
    const symbol = String(args?.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!symbol) return text("A 'symbol' is required.");
    const candles = await fetchLiveCandles(symbol, origin);
    if (!candles) return text(`Could not fetch price history for ${symbol}.`);
    const s = scoreOne(candles);
    const dir: "long" | "short" | null = s.net > 0 ? "long" : s.net < 0 ? "short" : null;
    if (!dir) return text(`${symbol} is flat right now — no directional edge for a setup.`);
    const price = candles[candles.length - 1].close;
    const a = atr14(candles);
    if (a <= 0) return text(`Could not compute volatility for ${symbol}.`);
    const atrPct = (a / price) * 100;
    const slPct = Math.round(atrPct * 1.5 * 10) / 10, tpPct = Math.round(atrPct * 3 * 10) / 10;
    const mul = dir === "long" ? 1 : -1;
    const lev = atrPct > 5 ? 2 : atrPct > 3 ? 3 : atrPct > 1.5 ? 5 : 10;
    return text({
      symbol, direction: dir, entry: price,
      stopLoss: Math.round(price * (1 - mul * slPct / 100) * 1e4) / 1e4, stopLossPct: slPct,
      takeProfit: Math.round(price * (1 + mul * tpPct / 100) * 1e4) / 1e4, takeProfitPct: tpPct,
      riskReward: "1:2", atrPct: Math.round(atrPct * 10) / 10, suggestedLeverage: lev,
      note: "SL = 1.5x ATR, TP = 3x ATR. Not financial advice.",
    });
  }

  if (name === "get_volatility") {
    const symbol = String(args?.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!symbol) return text("A 'symbol' is required.");
    const candles = await fetchLiveCandles(symbol, origin);
    if (!candles) return text(`Could not fetch price history for ${symbol}.`);
    const price = candles[candles.length - 1].close;
    const a = atr14(candles);
    if (a <= 0) return text(`Could not compute volatility for ${symbol}.`);
    const atrPct = (a / price) * 100;
    // son 30 günün günlük range % ortalaması ile kıyas
    const recent = candles.slice(-30);
    const avgRangePct = recent.reduce((s, c) => s + ((c.high - c.low) / c.close) * 100, 0) / recent.length;
    const rel = avgRangePct > 0 ? atrPct / avgRangePct : 1;
    const level = atrPct > 8 ? "extreme" : atrPct > 4 ? "high" : atrPct > 2 ? "moderate" : "low";
    const vsAvg = rel > 1.25 ? "more volatile than usual" : rel < 0.8 ? "calmer than usual" : "around its usual range";
    return text({ symbol, atrDailyPct: Math.round(atrPct * 10) / 10, level, vsRecentAverage: vsAvg, avg30dRangePct: Math.round(avgRangePct * 10) / 10 });
  }

  if (name === "get_correlation") {
    const A = String(args?.symbolA || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const B = String(args?.symbolB || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!A || !B) return text("Both 'symbolA' and 'symbolB' are required.");
    const [ca, cb] = await Promise.all([fetchLiveCandles(A, origin), fetchLiveCandles(B, origin)]);
    if (!ca || !cb) return text(`Could not fetch price history for ${!ca ? A : B}.`);
    const n = Math.min(ca.length, cb.length, 90);
    const ra = ca.slice(-n).map((c, i, arr) => i ? (c.close - arr[i - 1].close) / arr[i - 1].close : 0).slice(1);
    const rb = cb.slice(-n).map((c, i, arr) => i ? (c.close - arr[i - 1].close) / arr[i - 1].close : 0).slice(1);
    const m = Math.min(ra.length, rb.length);
    const xa = ra.slice(-m), xb = rb.slice(-m);
    const ma = xa.reduce((s, v) => s + v, 0) / m, mb = xb.reduce((s, v) => s + v, 0) / m;
    let cov = 0, va = 0, vb = 0;
    for (let i = 0; i < m; i++) { const da = xa[i] - ma, db = xb[i] - mb; cov += da * db; va += da * da; vb += db * db; }
    const corr = va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0;
    const r = Math.round(corr * 100) / 100;
    const read = r > 0.7 ? "strongly move together (little diversification)" : r > 0.3 ? "moderately correlated" : r > -0.3 ? "largely independent (good for diversification)" : "tend to move oppositely";
    return text({ symbolA: A, symbolB: B, correlation: r, window: `${m} days`, read });
  }

  if (name === "get_leaderboard") {
    let targets = ["BTC", "ETH", "SOL"];
    const tj = await originGet("/api/market-tickers");
    const movers = (tj?.rows || []).filter((x: any) => x.base && isFinite(x.change)).sort((a: any, b: any) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 12).map((x: any) => String(x.base).toUpperCase());
    targets = Array.from(new Set([...targets, ...movers])).slice(0, 12);
    const scored: any[] = [];
    for (const coin of targets) {
      const c = await fetchLiveCandles(coin, origin);
      if (!c) continue;
      const s = scoreOne(c);
      scored.push({ coin, netConviction: Math.round(s.net), long: s.longs, short: s.shorts });
    }
    if (!scored.length) return text("Could not fetch market data for the leaderboard.");
    return text({
      scanned: scored.length,
      topLong: scored.filter((s) => s.netConviction > 0).sort((a, b) => b.netConviction - a.netConviction).slice(0, 5),
      topShort: scored.filter((s) => s.netConviction < 0).sort((a, b) => a.netConviction - b.netConviction).slice(0, 5),
    });
  }

  if (name === "explain_strategy") {
    const q = String(args?.strategy || "").toLowerCase().trim();
    if (!q) return text("A 'strategy' id or name is required.");
    const s = STRATEGIES.find((x) => x.id.toLowerCase() === q || x.slug?.toLowerCase() === q || x.name.toLowerCase() === q)
      || STRATEGIES.find((x) => x.name.toLowerCase().includes(q) || x.id.toLowerCase().includes(q));
    if (!s) return text(`No strategy found matching '${args?.strategy}'. Use list_strategies to browse.`);
    return text({ id: s.id, name: s.name, category: s.category, summary: s.short, description: s.description, entry: s.entry, exit: s.exit, backtestable: !!s.run });
  }

  if (name === "get_price_history") {
    const symbol = String(args?.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!symbol) return text("A 'symbol' is required.");
    const days = Math.max(2, Math.min(30, Number(args?.days) || 7));
    const candles = await fetchLiveCandles(symbol, origin);
    if (!candles) return text(`Could not fetch price history for ${symbol}.`);
    const slice = candles.slice(-days);
    const first = slice[0], last = slice[slice.length - 1];
    const changePct = ((last.close - first.open) / first.open) * 100;
    const high = Math.max(...slice.map((c) => c.high));
    const low = Math.min(...slice.map((c) => c.low));
    const trend = changePct > 3 ? "uptrend" : changePct < -3 ? "downtrend" : "range-bound";
    return text({ symbol, days: slice.length, open: first.open, close: last.close, changePct: Math.round(changePct * 10) / 10, high, low, trend });
  }

  throw new Error(`Unknown tool: ${name}`);
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { headers: CORS }); }
  const { id, method, params } = body || {};
  try {
    if (method === "initialize") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: SERVER } }, { headers: CORS });
    }
    if (typeof method === "string" && method.startsWith("notifications/")) {
      return new NextResponse(null, { status: 204, headers: CORS });
    }
    if (method === "ping") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: {} }, { headers: CORS });
    }
    if (method === "tools/list") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } }, { headers: CORS });
    }
    if (method === "tools/call") {
      const origin = new URL(req.url).origin;
      const result = await callTool(params?.name, params?.arguments || {}, origin);
      return NextResponse.json({ jsonrpc: "2.0", id, result }, { headers: CORS });
    }
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } }, { headers: CORS });
  } catch (e: any) {
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32603, message: e?.message || "Internal error" } }, { headers: CORS });
  }
}

export async function GET() {
  return NextResponse.json({ name: SERVER.name, version: SERVER.version, transport: "streamable-http", protocol: "mcp", tools: TOOLS.map((t) => ({ name: t.name, description: t.description })) }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
