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

// 1. Linear Regression Slope
export function linRegSlope(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 20, i = c.length - 1, a = atr(c, 14);
  const s = linRegFull(closes, i, p).slope, sPrev = linRegFull(closes, i - 1, p).slope;
  if (sPrev <= 0 && s > 0) return mkS(c, i, "long", a, 0.69, "Linear regression slope turned up");
  if (sPrev >= 0 && s < 0) return mkS(c, i, "short", a, 0.69, "Linear regression slope turned down");
  return makeSignal({ reason: "Flat regression slope" });
}

// 2. R-Squared trend strength filter
export function rSquared(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 20, i = c.length - 1, a = atr(c, 14);
  const { r2, slope } = linRegFull(closes, i, p);
  // R² yüksek = güçlü trend; yön slope ile
  if (r2 > 0.7 && slope > 0) return mkS(c, i, "long", a, 0.71, `Strong fitted uptrend (R²=${r2.toFixed(2)})`);
  if (r2 > 0.7 && slope < 0) return mkS(c, i, "short", a, 0.71, `Strong fitted downtrend (R²=${r2.toFixed(2)})`);
  return makeSignal({ reason: `R²=${r2.toFixed(2)} (weak trend)` });
}

// 3. Z-Score Bands mean reversion
export function zScoreBands(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 20, i = c.length - 1, a = atr(c, 14);
  const win = closes.slice(i - p + 1, i + 1), mean = win.reduce((x, y) => x + y, 0) / p;
  const sd = Math.sqrt(win.reduce((s, v) => s + (v - mean) ** 2, 0) / p);
  const z = sd ? (closes[i] - mean) / sd : 0;
  if (z < -2) return mkS(c, i, "long", a, 0.71, `Z-score ${z.toFixed(1)} (extreme low)`);
  if (z > 2) return mkS(c, i, "short", a, 0.71, `Z-score ${z.toFixed(1)} (extreme high)`);
  return makeSignal({ reason: `Z-score ${z.toFixed(1)}` });
}

// 4. Correlation Trend (price vs time)
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

// 5. Variance Ratio (trend vs random)
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

// 6. Hurst Exponent (persistence)
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

// 7. Polynomial Regression (curve direction)
export function polyRegression(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 15, i = c.length - 1, a = atr(c, 14);
  // İkinci dereceden eğrinin son eğimi (basit fark yaklaşımı)
  const f = linRegFull(closes, i, p).end, fPrev = linRegFull(closes, i - 1, p).end, fPrev2 = linRegFull(closes, i - 2, p).end;
  const curve = f - 2 * fPrev + fPrev2; // ikinci türev
  const vel = f - fPrev;
  if (curve > 0 && vel > 0 && closes[i] > f) return mkS(c, i, "long", a, 0.67, "Polynomial curve accelerating up");
  if (curve < 0 && vel < 0 && closes[i] < f) return mkS(c, i, "short", a, 0.67, "Polynomial curve accelerating down");
  return makeSignal({ reason: "Polynomial curve flat" });
}

// 8. Kalman-style adaptive trend
export function kalmanTrend(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  // Basit Kalman filtresi yaklaşımı
  let est = closes[0], errEst = 1, q = 0.01, r = 0.1;
  const filtered: number[] = [est];
  for (let k = 1; k < closes.length; k++) {
    const predErr = errEst + q;
    const kGain = predErr / (predErr + r);
    est = est + kGain * (closes[k] - est);
    errEst = (1 - kGain) * predErr;
    filtered.push(est);
  }
  if (closes[i - 1] <= filtered[i - 1] && closes[i] > filtered[i] && filtered[i] > filtered[i - 1]) return mkS(c, i, "long", a, 0.7, "Price crossed above rising Kalman line");
  if (closes[i - 1] >= filtered[i - 1] && closes[i] < filtered[i] && filtered[i] < filtered[i - 1]) return mkS(c, i, "short", a, 0.7, "Price crossed below falling Kalman line");
  return makeSignal({ reason: "No Kalman cross" });
}

// 9. Sharpe Filter (risk-adjusted momentum)
export function sharpeFilter(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 20, i = c.length - 1, a = atr(c, 14);
  const rets: number[] = [];
  for (let k = i - p + 1; k <= i; k++) rets.push((closes[k] - closes[k - 1]) / closes[k - 1]);
  const mean = rets.reduce((x, y) => x + y, 0) / p, sd = Math.sqrt(rets.reduce((s, v) => s + (v - mean) ** 2, 0) / p);
  const sharpe = sd ? (mean / sd) * Math.sqrt(p) : 0;
  if (sharpe > 1.5) return mkS(c, i, "long", a, 0.7, `High risk-adjusted momentum (Sharpe ${sharpe.toFixed(2)})`);
  if (sharpe < -1.5) return mkS(c, i, "short", a, 0.7, `Negative risk-adjusted momentum (Sharpe ${sharpe.toFixed(2)})`);
  return makeSignal({ reason: `Sharpe ${sharpe.toFixed(2)}` });
}

// 10. Statistical Mean Reversion (Bollinger-like with std)
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
