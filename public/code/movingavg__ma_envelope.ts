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

export function maEnvelope(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const mid = sma(closes, 20), a = atr(c, 14);
  const pct = 0.025;
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  const upper = mid[i] * (1 + pct), lower = mid[i] * (1 - pct);
  // Alt zarftan dönüş = long
  if (prev.low <= mid[i - 1] * (1 - pct) && cur.close > cur.open && cur.close > prev.close) {
    const sl = prev.low - 0.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [mid[i], upper], confidence: 0.69, reason: "MA envelope lower bounce" });
  }
  if (prev.high >= mid[i - 1] * (1 + pct) && cur.close < cur.open && cur.close < prev.close) {
    const sl = prev.high + 0.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [mid[i], lower], confidence: 0.69, reason: "MA envelope upper rejection" });
  }
  return makeSignal({ reason: "Inside MA envelope" });
}
