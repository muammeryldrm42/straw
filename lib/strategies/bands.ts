import { Candle, Signal, makeSignal, sma, ema, atr, bollingerBands } from "../indicators";

const mkBreak = (c: Candle[], i: number, side: "long" | "short", slPrice: number, conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long") { const r = cur.close - slPrice; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "long", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const r = slPrice - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "short", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

// Linear regression for a window ending at idx
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

// 1. Price Channel (Donchian-style with midline target)
export function priceChannel(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 20, i = c.length - 1, prev = c[i - 1];
  const hi = Math.max(...c.slice(i - p, i).map((x) => x.high)), lo = Math.min(...c.slice(i - p, i).map((x) => x.low));
  if (c[i].close > hi && prev.close <= hi) return mkBreak(c, i, "long", (hi + lo) / 2, 0.71, "Price channel breakout up");
  if (c[i].close < lo && prev.close >= lo) return mkBreak(c, i, "short", (hi + lo) / 2, 0.71, "Price channel breakdown");
  return makeSignal({ reason: "Inside price channel" });
}

// 2. Linear Regression Channel
export function linRegChannel(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 20, i = c.length - 1, a = atr(c, 14);
  const { end, stderr, slope } = linReg(closes, i, p);
  const upper = end + 2 * stderr, lower = end - 2 * stderr;
  // Alt banttan dönüş (yükselen trend) = long
  if (c[i - 1].close <= lower && c[i].close > lower && slope > 0) return mkBreak(c, i, "long", lower - a[i], 0.7, "Lin-reg channel lower bounce (uptrend)");
  if (c[i - 1].close >= upper && c[i].close < upper && slope < 0) return mkBreak(c, i, "short", upper + a[i], 0.7, "Lin-reg channel upper rejection (downtrend)");
  return makeSignal({ reason: "Inside lin-reg channel" });
}

// 3. STARC Bands (SMA ± ATR×2)
export function starcBands(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), mid = sma(closes, 10), a = atr(c, 15), i = c.length - 1;
  const up = mid[i] + 2 * a[i], lo = mid[i] - 2 * a[i];
  if (c[i - 1].low <= mid[i - 1] - 2 * a[i - 1] && c[i].close > c[i].open) return mkBreak(c, i, "long", lo - a[i] * 0.5, 0.69, "STARC lower band bounce");
  if (c[i - 1].high >= mid[i - 1] + 2 * a[i - 1] && c[i].close < c[i].open) return mkBreak(c, i, "short", up + a[i] * 0.5, 0.69, "STARC upper band rejection");
  return makeSignal({ reason: "Inside STARC bands" });
}

// 4. Acceleration Bands
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

// 5. Median Price Bands
export function medianBands(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const med = c.map((x) => (x.high + x.low) / 2), mid = ema(med, 20), a = atr(c, 14), i = c.length - 1;
  const up = mid[i] + 1.5 * a[i], lo = mid[i] - 1.5 * a[i];
  if (c[i].close > up && c[i - 1].close <= mid[i - 1] + 1.5 * a[i - 1]) return mkBreak(c, i, "long", mid[i], 0.69, "Median band breakout up");
  if (c[i].close < lo && c[i - 1].close >= mid[i - 1] - 1.5 * a[i - 1]) return mkBreak(c, i, "short", mid[i], 0.69, "Median band breakdown");
  return makeSignal({ reason: "Inside median bands" });
}

// 6. Standard Error Bands
export function stdErrorBands(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 21, i = c.length - 1, a = atr(c, 14);
  const { end, stderr } = linReg(closes, i, p);
  const up = end + 2 * stderr, lo = end - 2 * stderr;
  if (c[i - 1].close <= lo && c[i].close > lo) return mkBreak(c, i, "long", lo - a[i], 0.69, "Std-error band lower bounce");
  if (c[i - 1].close >= up && c[i].close < up) return mkBreak(c, i, "short", up + a[i], 0.69, "Std-error band upper rejection");
  return makeSignal({ reason: "Inside std-error bands" });
}

// 7. Pivot Bands (rolling pivot ± range)
export function pivotBands(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, prev = c[i - 1];
  const pivot = (prev.high + prev.low + prev.close) / 3;
  const r1 = 2 * pivot - prev.low, s1 = 2 * pivot - prev.high, a = atr(c, 14);
  if (c[i].close > r1 && prev.close <= r1) return mkBreak(c, i, "long", pivot, 0.68, "Pivot R1 breakout");
  if (c[i].close < s1 && prev.close >= s1) return mkBreak(c, i, "short", pivot, 0.68, "Pivot S1 breakdown");
  return makeSignal({ reason: "Between pivot bands" });
}

// 8. Fibonacci Channel bounce
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

// 9. Donchian Midline trend
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

// 10. Keltner Bounce (mean reversion off bands)
export function keltnerBounce(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), mid = ema(closes, 20), a = atr(c, 14), i = c.length - 1;
  const up = mid[i] + 2 * a[i], lo = mid[i] - 2 * a[i];
  if (c[i - 1].low <= mid[i - 1] - 2 * a[i - 1] && c[i].close > c[i].open && c[i].close > c[i - 1].close) return mkBreak(c, i, "long", lo - a[i] * 0.5, 0.7, "Keltner lower band bounce");
  if (c[i - 1].high >= mid[i - 1] + 2 * a[i - 1] && c[i].close < c[i].open && c[i].close < c[i - 1].close) return mkBreak(c, i, "short", up + a[i] * 0.5, 0.7, "Keltner upper band rejection");
  return makeSignal({ reason: "Inside Keltner" });
}

// 11. Regression Slope momentum
export function regressionSlope(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 20, i = c.length - 1, a = atr(c, 14);
  const slopeNow = linReg(closes, i, p).slope, slopePrev = linReg(closes, i - 1, p).slope;
  if (slopePrev <= 0 && slopeNow > 0) return mkBreak(c, i, "long", c[i].close - 2 * a[i], 0.68, "Regression slope turned positive");
  if (slopePrev >= 0 && slopeNow < 0) return mkBreak(c, i, "short", c[i].close + 2 * a[i], 0.68, "Regression slope turned negative");
  return makeSignal({ reason: "Flat regression slope" });
}

// 12. BB %B extremes
export function bbPercentB(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), bb = bollingerBands(closes, 20, 2), i = c.length - 1, a = atr(c, 14);
  const pctB = (idx: number) => { const d = bb.upper[idx] - bb.lower[idx]; return d ? (closes[idx] - bb.lower[idx]) / d : 0.5; };
  const now = pctB(i), prev = pctB(i - 1);
  if (prev < 0 && now >= 0) return mkBreak(c, i, "long", bb.lower[i] - a[i], 0.7, "BB %B re-entered from below 0");
  if (prev > 1 && now <= 1) return mkBreak(c, i, "short", bb.upper[i] + a[i], 0.7, "BB %B re-entered from above 1");
  return makeSignal({ reason: `BB %B ${(now * 100).toFixed(0)}%` });
}
