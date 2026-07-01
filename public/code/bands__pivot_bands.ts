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

export function pivotBands(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, prev = c[i - 1];
  const pivot = (prev.high + prev.low + prev.close) / 3;
  const r1 = 2 * pivot - prev.low, s1 = 2 * pivot - prev.high, a = atr(c, 14);
  if (c[i].close > r1 && prev.close <= r1) return mkBreak(c, i, "long", pivot, 0.68, "Pivot R1 breakout");
  if (c[i].close < s1 && prev.close >= s1) return mkBreak(c, i, "short", pivot, 0.68, "Pivot S1 breakdown");
  return makeSignal({ reason: "Between pivot bands" });
}
