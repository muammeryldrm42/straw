import { Candle, Signal, makeSignal, atr, rsi, macd, sma, ema } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function lastTwoLows(c: Candle[], end: number, lb = 3, span = 40) {
  const lows: number[] = [];
  for (let k = end - 1; k >= Math.max(2, end - span); k--) {
    let isLow = true;
    for (let j = 1; j <= lb; j++) if (c[k - j]?.low < c[k].low || c[k + j]?.low < c[k].low) { isLow = false; break; }
    if (isLow) { lows.push(k); if (lows.length === 2) break; }
  }
  return lows;
}
function lastTwoHighs(c: Candle[], end: number, lb = 3, span = 40) {
  const highs: number[] = [];
  for (let k = end - 1; k >= Math.max(2, end - span); k--) {
    let isHigh = true;
    for (let j = 1; j <= lb; j++) if (c[k - j]?.high > c[k].high || c[k + j]?.high > c[k].high) { isHigh = false; break; }
    if (isHigh) { highs.push(k); if (highs.length === 2) break; }
  }
  return highs;
}
function detectDiv(c: Candle[], osc: number[], i: number, a: number[], name: string, conf: number, hidden = false): Signal {
  const lows = lastTwoLows(c, i), highs = lastTwoHighs(c, i);
  if (lows.length === 2) {
    const [l1, l2] = lows; // l1 daha yeni
    if (!hidden && c[l1].low < c[l2].low && osc[l1] > osc[l2]) return mk(c, i, "long", a, conf, `Bullish ${name} divergence (price LL, ${name} HL)`);
    if (hidden && c[l1].low > c[l2].low && osc[l1] < osc[l2]) return mk(c, i, "long", a, conf, `Hidden bullish ${name} divergence`);
  }
  if (highs.length === 2) {
    const [h1, h2] = highs;
    if (!hidden && c[h1].high > c[h2].high && osc[h1] < osc[h2]) return mk(c, i, "short", a, conf, `Bearish ${name} divergence (price HH, ${name} LH)`);
    if (hidden && c[h1].high < c[h2].high && osc[h1] > osc[h2]) return mk(c, i, "short", a, conf, `Hidden bearish ${name} divergence`);
  }
  return makeSignal({ reason: `No ${name} divergence` });
}
function obvArr(c: Candle[]) { const o: number[] = [0]; for (let k = 1; k < c.length; k++) o.push(o[k - 1] + (c[k].close > c[k - 1].close ? c[k].volume : c[k].close < c[k - 1].close ? -c[k].volume : 0)); return o; }
function cciArr(c: Candle[], p = 20) {
  const tp = c.map((x) => (x.high + x.low + x.close) / 3), m = sma(tp, p), out: number[] = [];
  for (let i = 0; i < c.length; i++) { if (i < p - 1) { out.push(0); continue; } const win = tp.slice(i - p + 1, i + 1); const md = win.reduce((s, v) => s + Math.abs(v - m[i]), 0) / p; out.push(md ? (tp[i] - m[i]) / (0.015 * md) : 0); }
  return out;
}
function mfiArr(c: Candle[], p = 14) {
  const out: number[] = []; for (let i = 0; i < c.length; i++) { if (i < p) { out.push(50); continue; } let pos = 0, neg = 0; for (let k = i - p + 1; k <= i; k++) { const tp = (c[k].high + c[k].low + c[k].close) / 3, tpPrev = (c[k - 1].high + c[k - 1].low + c[k - 1].close) / 3; const rmf = tp * c[k].volume; if (tp > tpPrev) pos += rmf; else neg += rmf; } out.push(neg === 0 ? 100 : 100 - 100 / (1 + pos / neg)); }
  return out;
}
function stochArr(c: Candle[], p = 14) { const out: number[] = []; for (let i = 0; i < c.length; i++) { if (i < p - 1) { out.push(50); continue; } const w = c.slice(i - p + 1, i + 1); const hh = Math.max(...w.map((x) => x.high)), ll = Math.min(...w.map((x) => x.low)); out.push(hh === ll ? 50 : ((c[i].close - ll) / (hh - ll)) * 100); } return sma(out, 3); }
function aoArr(c: Candle[]) { const mp = c.map((x) => (x.high + x.low) / 2); const f = sma(mp, 5), s = sma(mp, 34); return f.map((v, i) => v - s[i]); }

export function rsiDivergence(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  return detectDiv(c, rsi(c.map((x) => x.close), 14), c.length - 1, atr(c, 14), "RSI", 0.72);
}
