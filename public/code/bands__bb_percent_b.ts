import { Candle, Signal, makeSignal, sma, ema, atr, bollingerBands } from "../indicators";

const mkBreak = (c: Candle[], i: number, side: "long" | "short", slPrice: number, conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long") { const r = cur.close - slPrice; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "long", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const r = slPrice - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "short", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function linReg(values: number[], idx: number, p: number) {
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let k = 0; k < p; k++) { const x = k, y = values[idx - p + 1 + k]; sx += x; sy += y; sxy += x * y; sxx += x * x; }
  const n = p, slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), intercept = (sy - slope * sx) / n;
  const end = slope * (p - 1) + intercept;
  // std error
  let se = 0;
  for (let k = 0; k < p; k++) { const pred = slope * k + intercept; se += (values[idx - p + 1 + k] - pred) ** 2; }
  return { slope, end, stderr: Math.sqrt(se / p) };
}

export function bbPercentB(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), bb = bollingerBands(closes, 20, 2), i = c.length - 1, a = atr(c, 14);
  const pctB = (idx: number) => { const d = bb.upper[idx] - bb.lower[idx]; return d ? (closes[idx] - bb.lower[idx]) / d : 0.5; };
  const now = pctB(i), prev = pctB(i - 1);
  if (prev < 0 && now >= 0) return mkBreak(c, i, "long", bb.lower[i] - a[i], 0.7, "BB %B re-entered from below 0");
  if (prev > 1 && now <= 1) return mkBreak(c, i, "short", bb.upper[i] + a[i], 0.7, "BB %B re-entered from above 1");
  return makeSignal({ reason: `BB %B ${(now * 100).toFixed(0)}%` });
}
