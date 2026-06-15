import { Candle, Signal, makeSignal, sma, ema, rsi, atr, bollingerBands, macd } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function hma(values: number[], period: number): number[] {
  const wma = (arr: number[], p: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (i < p - 1) { out.push(arr[i]); continue; }
      let num = 0, den = 0;
      for (let k = 0; k < p; k++) { const w = p - k; num += arr[i - k] * w; den += w; }
      out.push(num / den);
    }
    return out;
  };
  const half = Math.max(1, Math.floor(period / 2));
  const sqrtP = Math.max(1, Math.round(Math.sqrt(period)));
  const w1 = wma(values, half), w2 = wma(values, period);
  const raw = w1.map((v, i) => 2 * v - w2[i]);
  return wma(raw, sqrtP);
}
function keltner(c: Candle[], p: number, mult: number) {
  const closes = c.map((x) => x.close), mid = ema(closes, p), a = atr(c, p);
  return { mid, upper: mid.map((v, i) => v + mult * a[i]), lower: mid.map((v, i) => v - mult * a[i]) };
}

export function squeezeMomentum(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  // momentum = linreg(close - avg(highest, lowest, sma), 20)
  const mom: number[] = [];
  for (let k = 0; k < c.length; k++) {
    if (k < 20) { mom.push(0); continue; }
    const win = c.slice(k - 20, k);
    const ref = (Math.max(...win.map((x) => x.high)) + Math.min(...win.map((x) => x.low))) / 2;
    const smaV = sma(closes, 20)[k];
    mom.push(closes[k] - (ref + smaV) / 2);
  }
  // Momentum sıfırı keserken + ivme
  if (mom[i - 1] <= 0 && mom[i] > 0) return mk(c, i, "long", a, 0.71, "Squeeze Momentum turned positive");
  if (mom[i - 1] >= 0 && mom[i] < 0) return mk(c, i, "short", a, 0.71, "Squeeze Momentum turned negative");
  return makeSignal({ reason: `Squeeze mom ${mom[i].toFixed(2)}` });
}
