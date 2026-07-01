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

export function fibChannel(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const win = c.slice(-50), hi = Math.max(...win.map((x) => x.high)), lo = Math.min(...win.map((x) => x.low));
  const range = hi - lo, i = c.length - 1, a = atr(c, 14);
  const f382 = lo + range * 0.382, f618 = lo + range * 0.618;
  // 0.382 destekten dönüş = long, 0.618 dirençten = short
  if (Math.abs(c[i].low - f382) < a[i] * 0.5 && c[i].close > c[i].open) return mkBreak(c, i, "long", f382 - a[i], 0.69, "Fib 0.382 support bounce");
  if (Math.abs(c[i].high - f618) < a[i] * 0.5 && c[i].close < c[i].open) return mkBreak(c, i, "short", f618 + a[i], 0.69, "Fib 0.618 resistance rejection");
  return makeSignal({ reason: "Not at fib level" });
}
