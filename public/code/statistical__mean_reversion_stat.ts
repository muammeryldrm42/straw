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

export function meanReversionStat(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 30, i = c.length - 1, a = atr(c, 14);
  const win = closes.slice(i - p + 1, i + 1), mean = win.reduce((x, y) => x + y, 0) / p;
  const sd = Math.sqrt(win.reduce((s, v) => s + (v - mean) ** 2, 0) / p);
  const z = sd ? (closes[i] - mean) / sd : 0, zPrev = sd ? (closes[i - 1] - mean) / sd : 0;
  // Aşırı sapmadan ortalamaya dönüş başlangıcı
  if (zPrev < -2.5 && z > zPrev) return mkS(c, i, "long", a, 0.7, "Mean reversion from statistical low", 1.5);
  if (zPrev > 2.5 && z < zPrev) return mkS(c, i, "short", a, 0.7, "Mean reversion from statistical high", 1.5);
  return makeSignal({ reason: `Stat deviation z=${z.toFixed(1)}` });
}
