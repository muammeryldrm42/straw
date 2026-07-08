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

export function correlationTrend(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 20, i = c.length - 1, a = atr(c, 14);
  const r2 = linRegFull(closes, i, p).r2, slope = linRegFull(closes, i, p).slope;
  const corr = Math.sqrt(r2) * Math.sign(slope);
  const prevSlope = linRegFull(closes, i - 1, p).slope, prevCorr = Math.sqrt(linRegFull(closes, i - 1, p).r2) * Math.sign(prevSlope);
  if (prevCorr < 0.5 && corr >= 0.5) return mkS(c, i, "long", a, 0.69, `Price-time correlation rose (${corr.toFixed(2)})`);
  if (prevCorr > -0.5 && corr <= -0.5) return mkS(c, i, "short", a, 0.69, `Price-time correlation fell (${corr.toFixed(2)})`);
  return makeSignal({ reason: `Correlation ${corr.toFixed(2)}` });
}
