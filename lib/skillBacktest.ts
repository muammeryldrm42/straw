// Per-skill SPOT backtest. Each of the 24 skills is a standalone long-only BTC spot
// strategy: we hold spot BTC unless the skill actively says SELL (then we sit in cash).
// We replay the skills daily over real CMC history (OHLCV + volume + Fear & Greed +
// dominance) and derive the market-wide context (breadth, stablecoin share, altseason,
// turnover) each day so every skill gets the inputs it needs. Pure spot: no leverage.
import { SKILLS } from "./skillsEngine/skills";
import type { MarketSignals, CoinInput, Globals } from "./skillsEngine/types";
import { rsi as rsiCalc, macd as macdCalc } from "./indicators";
import { getFearGreedHistorical, getGlobalMetricsHistorical, getOhlcvHistorical } from "./cmc/client";

const pct = (a: number, b?: number) => (b ? ((a - b) / b) * 100 : 0);
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const day = (ts: string) => ts.slice(0, 10);
const lastRsi = (arr: number[]) => { const v = rsiCalc(arr); for (let i = v.length - 1; i >= 0; i--) if (!isNaN(v[i])) return v[i]; return 50; };
const lastMacdHist = (arr: number[]) => { const m = macdCalc(arr); const h = m.histogram; for (let i = h.length - 1; i >= 0; i--) if (!isNaN(h[i])) return h[i]; return 0; };

const BTC_SUPPLY = 19.8e6;
const ETH_SUPPLY = 120.5e6;

export interface SkillBТ {
  id: string; name: string;
  totalReturn: number; sharpe: number; maxDrawdown: number; winRate: number; exposureDays: number; vsHold: number;
}
export interface SkillBacktestResult {
  source: "cmc" | "mock"; days: number;
  hold: { totalReturn: number; sharpe: number; maxDrawdown: number };
  skills: SkillBТ[];
  note: string;
}

function metrics(returns: number[]) {
  const active = returns.filter((r) => r !== 0);
  const mean = active.reduce((a, b) => a + b, 0) / (active.length || 1);
  const std = Math.sqrt(active.reduce((a, b) => a + (b - mean) ** 2, 0) / (active.length || 1)) || 1e-9;
  let eq = 1, peak = 1, maxDD = 0, wins = 0;
  for (const r of returns) { eq *= 1 + r; peak = Math.max(peak, eq); maxDD = Math.min(maxDD, eq / peak - 1); if (r > 0) wins++; }
  return {
    totalReturn: r4(eq - 1), sharpe: Math.round((mean / std) * Math.sqrt(365) * 100) / 100,
    maxDrawdown: r4(maxDD), winRate: Math.round((wins / (active.length || 1)) * 1000) / 1000, exposureDays: active.length,
  };
}

function synth(N: number) {
  const btc: number[] = [], eth: number[] = [], fg: number[] = [], dom: number[] = [], bvol: number[] = [], evol: number[] = [];
  let pb = 20000, pe = 1300;
  const prand = (i: number) => { const r = Math.sin(i * 127.1 + 311.7) * 43758.5453; return (r - Math.floor(r)) * 2 - 1; };
  for (let i = 0; i < N; i++) {
    const macro = Math.sin(i / 200 + 1), swing = Math.sin(i / 40);
    const drift = 0.0002 + 0.0058 * macro + 0.0026 * swing;
    const noise = 0.0075 * Math.sin(i / 2.3) + 0.0055 * Math.cos(i / 5.7) + 0.02 * prand(i);
    pb *= 1 + drift + noise; pe *= 1 + (drift + noise) * 1.18;
    btc.push(pb); eth.push(pe);
    fg.push(Math.round(clamp(50 + 38 * macro + 11 * swing, 6, 94)));
    dom.push(58 - 5 * macro + 1.5 * Math.sin(i / 55));
    bvol.push(pb * BTC_SUPPLY * (0.03 + 0.05 * Math.abs(noise) * 30));
    evol.push(pe * ETH_SUPPLY * (0.04 + 0.06 * Math.abs(noise) * 30));
  }
  return { btc, eth, fg, dom, bvol, evol };
}

async function real(count: number) {
  const [fgH, gm, btcH, ethH] = await Promise.all([
    getFearGreedHistorical(count), getGlobalMetricsHistorical(count),
    getOhlcvHistorical("BTC", count), getOhlcvHistorical("ETH", count),
  ]);
  const fgBy = new Map(fgH.data.map((d) => [day(d.timestamp), d.value] as const));
  const domBy = new Map(gm.data.quotes.map((q) => [day(q.timestamp), q.btc_dominance] as const));
  const ethBy = new Map(ethH.data.quotes.map((q) => [day(q.time_close), q.quote.USD.close] as const));
  const evolBy = new Map(ethH.data.quotes.map((q) => [day(q.time_close), q.quote.USD.volume ?? 0] as const));
  const rows = btcH.data.quotes
    .map((q) => ({ date: day(q.time_close), close: q.quote.USD.close, vol: q.quote.USD.volume ?? 0 }))
    .filter((p) => fgBy.has(p.date) && ethBy.has(p.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const btc = rows.map((r) => r.close);
  const bvol = rows.map((r) => r.vol);
  const eth = rows.map((r) => ethBy.get(r.date)!);
  const evol = rows.map((r) => evolBy.get(r.date) ?? 0);
  const fg = rows.map((r) => fgBy.get(r.date)!);
  const dom = rows.map((r) => domBy.get(r.date) ?? 55);
  return { btc, eth, fg, dom, bvol, evol };
}

export async function runSkillBacktest(count = 1460, forceMock = false): Promise<SkillBacktestResult> {
  let series: { btc: number[]; eth: number[]; fg: number[]; dom: number[]; bvol: number[]; evol: number[] } | null = null;
  let source: "cmc" | "mock" = "mock";
  if (!forceMock) {
    try { const r = await real(count); if (r.btc.length > 45) { series = r; source = "cmc"; } } catch { /* fall back */ }
  }
  if (!series) series = synth(Math.max(120, Math.min(count, 1500)));
  const { btc, eth, fg, dom, bvol, evol } = series;

  const perSkill: number[][] = SKILLS.map(() => []);
  const holdRet: number[] = [];

  for (let i = 30; i < btc.length - 1; i++) {
    const btcRet24 = pct(btc[i], btc[i - 1]), ethRet24 = pct(eth[i], eth[i - 1]);
    const btcRet7 = pct(btc[i], btc[i - 7]), ethRet7 = pct(eth[i], eth[i - 7]);

    const market: MarketSignals = {
      fearGreed: fg[i],
      altseasonIndex: clamp(50 + (ethRet7 - btcRet7) * 4, 5, 95),
      btcDominance: dom[i], btcDominanceTrend: dom[i] - dom[i - 7],
      btcReturn7d: btcRet7, btcReturn30d: pct(btc[i], btc[i - 30]),
    };

    const btcMcap = btc[i] * BTC_SUPPLY, ethMcap = eth[i] * ETH_SUPPLY;
    const coins: CoinInput[] = [
      { symbol: "BTC", name: "Bitcoin", marketCap: btcMcap, volume24h: bvol[i] || btcMcap * 0.04, pctChange24h: btcRet24, pctChange7d: btcRet7, pctChange30d: pct(btc[i], btc[i - 30]), pctChange90d: pct(btc[i], btc[Math.max(0, i - 90)]), rsi: lastRsi(btc.slice(Math.max(0, i - 60), i + 1)), macdHistogram: lastMacdHist(btc.slice(Math.max(0, i - 60), i + 1)) },
      { symbol: "ETH", name: "Ethereum", marketCap: ethMcap, volume24h: evol[i] || ethMcap * 0.05, pctChange24h: ethRet24, pctChange7d: ethRet7, pctChange30d: pct(eth[i], eth[i - 30]), pctChange90d: pct(eth[i], eth[Math.max(0, i - 90)]), rsi: lastRsi(eth.slice(Math.max(0, i - 60), i + 1)), macdHistogram: lastMacdHist(eth.slice(Math.max(0, i - 60), i + 1)) },
    ];

    const totalMcap = btcMcap / (clamp(dom[i], 20, 80) / 100);
    const advProxy = clamp(50 + ((btcRet24 + ethRet24) / 2) * 4, 5, 95);
    const adv7Proxy = clamp(50 + ((btcRet7 + ethRet7) / 2) * 1.5, 5, 95);
    const stableShare = clamp(0.07 + (50 - fg[i]) * 0.0008, 0.04, 0.16);
    const globals: Globals = {
      totalMarketCap: totalMcap,
      stablecoinMarketCap: totalMcap * stableShare,
      ethDominance: (ethMcap / totalMcap) * 100,
      breadth: {
        universe: 100,
        advancers24h: Math.round(advProxy), decliners24h: Math.round(100 - advProxy),
        advancers7d: Math.round(adv7Proxy), decliners7d: Math.round(100 - adv7Proxy),
        avgChange24h: (btcRet24 + ethRet24) / 2,
      },
    };

    const ctx = { market, coins, globals };
    const nbtc = pct(btc[i + 1], btc[i]) / 100;
    holdRet.push(nbtc);

    SKILLS.forEach((sk, si) => {
      let sig = "NEUTRAL";
      try { const v = sk.evaluate(ctx).find((x) => x.symbol === "BTC"); sig = v?.signal ?? "NEUTRAL"; } catch { /* keep NEUTRAL */ }
      perSkill[si].push(sig === "SELL" ? 0 : nbtc); // SELL -> cash, else hold BTC
    });
  }

  const holdM = metrics(holdRet);
  const skills = SKILLS.map((sk, si) => {
    const m = metrics(perSkill[si]);
    return { id: sk.id, name: sk.name, ...m, vsHold: r4(m.totalReturn - holdM.totalReturn) };
  }).sort((a, b) => b.sharpe - a.sharpe);

  return {
    source, days: holdRet.length,
    hold: { totalReturn: holdM.totalReturn, sharpe: holdM.sharpe, maxDrawdown: holdM.maxDrawdown },
    skills,
    note: `Each skill as a long-only BTC spot strategy: hold BTC unless the skill says SELL (then cash). ${source === "cmc" ? "Real CMC daily history (price, volume, Fear & Greed, dominance); breadth, stablecoin share and altseason derived per day." : "Synthetic series (logic proof)."}`,
  };
}
