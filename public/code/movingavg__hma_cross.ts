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

export function hmaCross(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const h = hma(closes, 21);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (isNaN(h[i]) || isNaN(h[i - 1])) return makeSignal({ reason: "HMA warming up" });
  // HMA eğim dönüşü
  if (h[i - 1] <= h[i - 2] && h[i] > h[i - 1] && cur.close > h[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.72, reason: "Hull MA turned up" });
  }
  if (h[i - 1] >= h[i - 2] && h[i] < h[i - 1] && cur.close < h[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.72, reason: "Hull MA turned down" });
  }
  return makeSignal({ reason: "No HMA turn" });
}
