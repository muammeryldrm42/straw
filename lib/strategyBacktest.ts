// Strateji backtest: CMC'den gerçek BTC OHLCV (open/high/low/close/volume) çeker,
// her stratejiyi long+short BTC spot olarak backtest eder, düşük riskli (min tutma süresi
// + işlem maliyeti) ve kategoriye göre gruplar. Gerçek OHLCV sayesinde high/low/volume
// kullanan stratejiler de sinyal üretir.
import type { Candle, Signal } from "./indicators";
import { STRATEGIES } from "./registry";
import { getOhlcvHistorical } from "./cmc/client";

const W = 150, COST = 0.0006, MIN_HOLD = 8;
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

export interface StratRow {
  id: string; name: string;
  totalReturn: number; sharpe: number; maxDrawdown: number; winRate: number; exposureDays: number;
}
export interface CategoryBlock { category: string; count: number; strategies: StratRow[]; }
export interface StrategyBacktestResult {
  source: "cmc" | "mock"; days: number;
  categories: CategoryBlock[];
}

const CAT_ORDER = (c: CategoryBlock) => c.count;

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

// long + short, min tutma süresi (düşük risk: az işlem, az whipsaw)
function backtest(run: (c: Candle[]) => Signal | null, candles: Candle[]) {
  let pos = 0, lockUntil = -1;
  const rets: number[] = [];
  for (let i = W; i < candles.length - 1; i++) {
    const prev = pos;
    if (i > lockUntil) {
      let sig: Signal | null = null;
      try { sig = run(candles.slice(Math.max(0, i - W), i + 1)); } catch { sig = null; }
      if (sig) {
        if (sig.signal === "long" && pos !== 1) { pos = 1; lockUntil = i + MIN_HOLD; }
        else if (sig.signal === "short" && pos !== -1) { pos = -1; lockUntil = i + MIN_HOLD; }
        // neutral -> pozisyonu koru
      }
    }
    const nbtc = (candles[i + 1].close - candles[i].close) / candles[i].close;
    let r = pos * nbtc;
    if (pos !== prev) r -= COST;
    rets.push(r);
  }
  return metrics(rets);
}

async function fetchBtc(count: number): Promise<Candle[] | null> {
  try {
    const h = await getOhlcvHistorical("BTC", count);
    const out: Candle[] = [];
    for (const q of h.data.quotes) {
      const u = q.quote.USD;
      const close = u.close;
      if (!isFinite(close) || close <= 0) continue;
      out.push({
        time: Math.floor(new Date(q.time_close).getTime() / 1000),
        open: u.open ?? close, high: u.high ?? close, low: u.low ?? close, close, volume: u.volume ?? 0,
      });
    }
    out.sort((a, b) => a.time - b.time);
    return out.length > 60 ? out : null;
  } catch { return null; }
}

// sentetik OHLCV (CMC erişilemezse mantık ispatı)
function synth(N: number): Candle[] {
  const out: Candle[] = [];
  let p = 20000;
  const prand = (i: number) => { const r = Math.sin(i * 91.7 + 13.1) * 43758.5; return (r - Math.floor(r)) * 2 - 1; };
  for (let i = 0; i < N; i++) {
    const drift = 0.0004 + 0.006 * Math.sin(i / 180 + 1) + 0.003 * Math.sin(i / 35);
    const noise = 0.02 * prand(i);
    const open = p;
    p *= 1 + drift + noise;
    const close = p;
    const hi = Math.max(open, close) * (1 + Math.abs(noise) * 0.6);
    const lo = Math.min(open, close) * (1 - Math.abs(noise) * 0.6);
    out.push({ time: 1600000000 + i * 86400, open, high: hi, low: lo, close, volume: close * 1000 * (1 + Math.abs(noise) * 20) });
  }
  return out;
}

export async function runStrategyBacktest(count = 1460, forceMock = false): Promise<StrategyBacktestResult> {
  let candles: Candle[] | null = null;
  let source: "cmc" | "mock" = "mock";
  if (!forceMock) { candles = await fetchBtc(count); if (candles) source = "cmc"; }
  if (!candles) candles = synth(Math.min(count, 1200));

  const list = STRATEGIES.filter((s) => s.category !== "memecoin" && s.run);
  const byCat: Record<string, StratRow[]> = {};
  for (const s of list) {
    const m = backtest(s.run!, candles);
    (byCat[s.category] ||= []).push({ id: s.id, name: s.name, ...m });
  }
  const categories: CategoryBlock[] = Object.entries(byCat)
    .map(([category, strategies]) => ({ category, count: strategies.length, strategies: strategies.sort((a, b) => b.totalReturn - a.totalReturn) }))
    .sort((a, b) => CAT_ORDER(b) - CAT_ORDER(a));

  return { source, days: candles.length - W, categories };
}
