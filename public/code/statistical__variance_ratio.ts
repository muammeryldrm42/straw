import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

const mkS = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function linRegFull(values: number[], idx: number, p: number) {
  let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
  for (let k = 0; k < p; k++) { const x = k, y = values[idx - p + 1 + k]; sx += x; sy += y; sxy += x * y; sxx += x * x; syy += y * y; }
  const n = p, slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), intercept = (sy - slope * sx) / n;
  const r2num = (n * sxy - sx * sy) ** 2, r2den = (n * sxx - sx * sx) * (n * syy - sy * sy);
  return { slope, intercept, r2: r2den ? r2num / r2den : 0, end: slope * (p - 1) + intercept };
}

export function varianceRatio(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const rets1: number[] = [], rets5: number[] = [];
  for (let k = i - 30; k <= i; k++) rets1.push(Math.log(closes[k] / closes[k - 1]));
  for (let k = i - 30; k <= i; k += 5) if (closes[k - 5]) rets5.push(Math.log(closes[k] / closes[k - 5]));
  const varOf = (arr: number[]) => { const m = arr.reduce((x, y) => x + y, 0) / arr.length; return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length; };
  const vr = varOf(rets1) ? varOf(rets5) / (5 * varOf(rets1)) : 1;
  const slope = (closes[i] - closes[i - 10]);
  // VR > 1 = trending (momentum)
  if (vr > 1.2 && slope > 0) return mkS(c, i, "long", a, 0.68, `Variance ratio ${vr.toFixed(2)} (trending up)`);
  if (vr > 1.2 && slope < 0) return mkS(c, i, "short", a, 0.68, `Variance ratio ${vr.toFixed(2)} (trending down)`);
  return makeSignal({ reason: `Variance ratio ${vr.toFixed(2)}` });
}
