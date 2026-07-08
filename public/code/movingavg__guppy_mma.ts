import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

function hma(values: number[], period: number): number[] {
  const wma = (arr: number[], p: number, end: number) => {
    if (end < p - 1) return NaN;
    let num = 0, den = 0;
    for (let k = 0; k < p; k++) { num += arr[end - k] * (p - k); den += (p - k); }
    return num / den;
  };
  const half = Math.floor(period / 2), sq = Math.floor(Math.sqrt(period));
  const raw: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const w1 = wma(values, half, i), w2 = wma(values, period, i);
    raw.push(isNaN(w1) || isNaN(w2) ? NaN : 2 * w1 - w2);
  }
  const out: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (i < period + sq) { out.push(NaN); continue; }
    let num = 0, den = 0;
    for (let k = 0; k < sq; k++) { const v = raw[i - k]; if (!isNaN(v)) { num += v * (sq - k); den += (sq - k); } }
    out.push(den ? num / den : NaN);
  }
  return out;
}

export function guppyMMA(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const shortP = [3, 5, 8, 10, 12, 15], longP = [30, 35, 40, 45, 50, 60];
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const shortMAs = shortP.map((p) => ema(closes, p)[i]);
  const longMAs = longP.map((p) => ema(closes, Math.min(p, Math.floor(c.length / 2)))[i]);
  const shortMin = Math.min(...shortMAs), shortMax = Math.max(...shortMAs);
  const longMax = Math.max(...longMAs), longMin = Math.min(...longMAs);
  // Kısa grup tamamen uzun grubun üstünde = güçlü uptrend
  if (shortMin > longMax) {
    const prevShortMin = Math.min(...shortP.map((p) => ema(closes, p)[i - 3]));
    const prevLongMax = Math.max(...longP.map((p) => ema(closes, Math.min(p, Math.floor(c.length / 2)))[i - 3]));
    if (prevShortMin <= prevLongMax) {
      const sl = cur.close - 2.5 * a[i], r = cur.close - sl;
      return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.74, reason: "Guppy ribbon flipped bullish (short group over long)" });
    }
  }
  if (shortMax < longMin) {
    const prevShortMax = Math.max(...shortP.map((p) => ema(closes, p)[i - 3]));
    const prevLongMin = Math.min(...longP.map((p) => ema(closes, Math.min(p, Math.floor(c.length / 2)))[i - 3]));
    if (prevShortMax >= prevLongMin) {
      const sl = cur.close + 2.5 * a[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.74, reason: "Guppy ribbon flipped bearish (short group under long)" });
    }
  }
  return makeSignal({ reason: "Guppy ribbon not aligned" });
}
