import { Candle, Signal, makeSignal, ema, sma, rsi, macd, atr, bollingerBands, vwap, swingHighs, swingLows } from "../indicators";

function calcAdx(c: Candle[], p = 14): number[] {
  const res: number[] = new Array(c.length).fill(NaN);
  if (c.length < p * 2) return res;
  const pdm = [0], mdm = [0], trs = [c[0].high - c[0].low];
  for (let i = 1; i < c.length; i++) {
    const up = c[i].high - c[i - 1].high, dn = c[i - 1].low - c[i].low;
    pdm.push(up > dn && up > 0 ? up : 0); mdm.push(dn > up && dn > 0 ? dn : 0);
    trs.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
  }
  let sp = pdm.slice(1, p + 1).reduce((a, b) => a + b, 0), sm = mdm.slice(1, p + 1).reduce((a, b) => a + b, 0), st = trs.slice(1, p + 1).reduce((a, b) => a + b, 0);
  const dx: number[] = [];
  for (let i = p; i < c.length; i++) {
    if (i > p) { sp = sp - sp / p + pdm[i]; sm = sm - sm / p + mdm[i]; st = st - st / p + trs[i]; }
    const pdi = 100 * (sp / (st || 1e-10)), mdi = 100 * (sm / (st || 1e-10));
    dx.push(100 * (Math.abs(pdi - mdi) / ((pdi + mdi) || 1e-10)));
  }
  for (let i = 0; i < dx.length; i++) { if (i < p - 1) continue; res[i + p] = dx.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p; }
  return res;
}
function calcSt(c: Candle[], p = 10, m = 3) {
  const a = atr(c, p), st: number[] = new Array(c.length).fill(NaN), dir: number[] = new Array(c.length).fill(0);
  for (let i = 0; i < c.length; i++) {
    const hl2 = (c[i].high + c[i].low) / 2, ub = hl2 + m * a[i], lb = hl2 - m * a[i];
    if (i === 0) { st[i] = ub; dir[i] = -1; continue; }
    if (c[i - 1].close > st[i - 1]) { st[i] = Math.max(lb, st[i - 1]); if (c[i].close < st[i]) { st[i] = ub; dir[i] = -1; } else dir[i] = 1; }
    else { st[i] = Math.min(ub, st[i - 1]); if (c[i].close > st[i]) { st[i] = lb; dir[i] = 1; } else dir[i] = -1; }
  }
  return { st, dir };
}

export function ichimoku(c: Candle[]): Signal {
  if (c.length < 100) return makeSignal({ reason: "Insufficient data" });
  const highs = c.map((x) => x.high), lows = c.map((x) => x.low);
  const rMax = (arr: number[], p: number, idx: number) => Math.max(...arr.slice(Math.max(0, idx - p + 1), idx + 1));
  const rMin = (arr: number[], p: number, idx: number) => Math.min(...arr.slice(Math.max(0, idx - p + 1), idx + 1));
  const i = c.length - 1;
  const tenkan = (rMax(highs, 9, i) + rMin(lows, 9, i)) / 2;
  const kijun = (rMax(highs, 26, i) + rMin(lows, 26, i)) / 2;
  const tenkanP = (rMax(highs, 9, i - 1) + rMin(lows, 9, i - 1)) / 2;
  const kijunP = (rMax(highs, 26, i - 1) + rMin(lows, 26, i - 1)) / 2;
  const ci = Math.max(0, i - 26);
  const sa = ((rMax(highs, 9, ci) + rMin(lows, 9, ci)) / 2 + (rMax(highs, 26, ci) + rMin(lows, 26, ci)) / 2) / 2;
  const sb = (rMax(highs, 52, ci) + rMin(lows, 52, ci)) / 2;
  const cloudTop = Math.max(sa, sb), cloudBot = Math.min(sa, sb), green = sa > sb;
  const cur = c[i];
  if (cur.close > cloudTop && tenkan > kijun && tenkanP <= kijunP && green) {
    const r = cur.close - kijun; if (r <= 0) return makeSignal({ reason: "Invalid risk" });
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: kijun, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.8, reason: "Ichimoku full bullish" });
  }
  if (cur.close < cloudBot && tenkan < kijun && tenkanP >= kijunP && !green) {
    const r = kijun - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" });
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: kijun, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.8, reason: "Ichimoku full bearish" });
  }
  return makeSignal({ reason: "Ichimoku not aligned" });
}
