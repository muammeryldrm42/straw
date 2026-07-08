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

export function donchianMid(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 20, i = c.length - 1;
  const hi = Math.max(...c.slice(i - p, i).map((x) => x.high)), lo = Math.min(...c.slice(i - p, i).map((x) => x.low));
  const mid = (hi + lo) / 2, prevHi = Math.max(...c.slice(i - p - 1, i - 1).map((x) => x.high)), prevLo = Math.min(...c.slice(i - p - 1, i - 1).map((x) => x.low));
  const prevMid = (prevHi + prevLo) / 2, a = atr(c, 14);
  if (c[i - 1].close <= prevMid && c[i].close > mid) return mkBreak(c, i, "long", lo, 0.69, "Crossed above Donchian midline");
  if (c[i - 1].close >= prevMid && c[i].close < mid) return mkBreak(c, i, "short", hi, 0.69, "Crossed below Donchian midline");
  return makeSignal({ reason: "No midline cross" });
}
