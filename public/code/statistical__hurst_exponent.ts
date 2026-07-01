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

export function hurstExponent(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const series = closes.slice(i - 50, i + 1);
  const mean = series.reduce((x, y) => x + y, 0) / series.length;
  let cumDev = 0, maxD = -Infinity, minD = Infinity;
  for (const v of series) { cumDev += v - mean; maxD = Math.max(maxD, cumDev); minD = Math.min(minD, cumDev); }
  const R = maxD - minD, S = Math.sqrt(series.reduce((s, v) => s + (v - mean) ** 2, 0) / series.length);
  const h = S && R ? Math.log(R / S) / Math.log(series.length) : 0.5;
  const slope = closes[i] - closes[i - 10];
  // H > 0.5 = persistent/trending
  if (h > 0.55 && slope > 0) return mkS(c, i, "long", a, 0.68, `Hurst ${h.toFixed(2)} (persistent uptrend)`);
  if (h > 0.55 && slope < 0) return mkS(c, i, "short", a, 0.68, `Hurst ${h.toFixed(2)} (persistent downtrend)`);
  return makeSignal({ reason: `Hurst ${h.toFixed(2)}` });
}
