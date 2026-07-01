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

export function accelerationBands(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 20, i = c.length - 1, prev = c[i - 1];
  const upper: number[] = [], lower: number[] = [];
  for (let k = 0; k < c.length; k++) {
    const factor = 4 * (c[k].high - c[k].low) / (c[k].high + c[k].low);
    upper.push(c[k].high * (1 + factor)); lower.push(c[k].low * (1 - factor));
  }
  const upBand = sma(upper, p), loBand = sma(lower, p);
  if (c[i].close > upBand[i] && prev.close <= upBand[i - 1]) return mkBreak(c, i, "long", sma(c.map(x=>x.close), p)[i], 0.7, "Acceleration band breakout up");
  if (c[i].close < loBand[i] && prev.close >= loBand[i - 1]) return mkBreak(c, i, "short", sma(c.map(x=>x.close), p)[i], 0.7, "Acceleration band breakdown");
  return makeSignal({ reason: "Inside acceleration bands" });
}
