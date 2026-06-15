import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

function aroonCalc(c: Candle[], end: number, p: number) {
  const win = c.slice(end - p, end + 1);
  let hiIdx = 0, loIdx = 0;
  for (let k = 0; k < win.length; k++) { if (win[k].high >= win[hiIdx].high) hiIdx = k; if (win[k].low <= win[loIdx].low) loIdx = k; }
  const up = ((p - (p - hiIdx)) / p) * 100, dn = ((p - (p - loIdx)) / p) * 100;
  return { up, dn };
}

// 1. Aroon
export function aroon(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 25, i = c.length - 1, a = atr(c, 14);
  const now = aroonCalc(c, i, p), prev = aroonCalc(c, i - 1, p);
  if (prev.up <= prev.dn && now.up > now.dn && now.up > 70) return mk(c, i, "long", a, 0.71, "Aroon-Up crossed above Aroon-Down");
  if (prev.dn <= prev.up && now.dn > now.up && now.dn > 70) return mk(c, i, "short", a, 0.71, "Aroon-Down crossed above Aroon-Up");
  return makeSignal({ reason: `Aroon up ${now.up.toFixed(0)} / dn ${now.dn.toFixed(0)}` });
}

// 2. Aroon Oscillator zero cross
export function aroonOscillator(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 25, i = c.length - 1, a = atr(c, 14);
  const now = aroonCalc(c, i, p).up - aroonCalc(c, i, p).dn, prev = aroonCalc(c, i - 1, p).up - aroonCalc(c, i - 1, p).dn;
  if (prev <= 0 && now > 0) return mk(c, i, "long", a, 0.7, "Aroon Oscillator turned positive");
  if (prev >= 0 && now < 0) return mk(c, i, "short", a, 0.7, "Aroon Oscillator turned negative");
  return makeSignal({ reason: `Aroon Osc ${now.toFixed(0)}` });
}

// 3. Vortex (trend-strength variant with threshold)
export function vortexStrength(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14, vmP: number[] = [], vmM: number[] = [], tr: number[] = [];
  for (let k = 1; k < c.length; k++) { vmP.push(Math.abs(c[k].high - c[k - 1].low)); vmM.push(Math.abs(c[k].low - c[k - 1].high)); tr.push(Math.max(c[k].high - c[k].low, Math.abs(c[k].high - c[k - 1].close), Math.abs(c[k].low - c[k - 1].close))); }
  const sum = (arr: number[], e: number) => arr.slice(e - p + 1, e + 1).reduce((a, b) => a + b, 0);
  const j = vmP.length - 1, viP = sum(vmP, j) / sum(tr, j), viM = sum(vmM, j) / sum(tr, j);
  const i = c.length - 1, a = atr(c, 14);
  if (viP > 1.1 && viP > viM) return mk(c, i, "long", a, 0.7, `Strong vortex uptrend (VI+ ${viP.toFixed(2)})`);
  if (viM > 1.1 && viM > viP) return mk(c, i, "short", a, 0.7, `Strong vortex downtrend (VI- ${viM.toFixed(2)})`);
  return makeSignal({ reason: "Weak vortex trend" });
}

// 4. Random Walk Index
export function randomWalk(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14, a = atr(c, p), i = c.length - 1;
  const denom = a[i] * Math.sqrt(p);
  const rwiHigh = denom ? (c[i].high - c[i - p].low) / denom : 0;
  const rwiLow = denom ? (c[i].low - c[i - p].high) / -denom : 0;
  if (rwiHigh > 1 && rwiHigh > rwiLow) return mk(c, i, "long", atr(c, 14), 0.69, `Random Walk uptrend (${rwiHigh.toFixed(2)})`);
  if (rwiLow > 1 && rwiLow > rwiHigh) return mk(c, i, "short", atr(c, 14), 0.69, `Random Walk downtrend (${rwiLow.toFixed(2)})`);
  return makeSignal({ reason: "Random walk (no trend)" });
}

// 5. Trend Intensity Index
export function trendIntensity(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 30, mid = sma(closes, p), i = c.length - 1, a = atr(c, 14);
  let posSum = 0, negSum = 0;
  for (let k = i - Math.floor(p / 2) + 1; k <= i; k++) { const dev = closes[k] - mid[k]; if (dev > 0) posSum += dev; else negSum += -dev; }
  const tii = posSum + negSum === 0 ? 50 : (100 * posSum) / (posSum + negSum);
  if (tii > 80) return mk(c, i, "long", a, 0.69, `Trend Intensity strong up (${tii.toFixed(0)})`);
  if (tii < 20) return mk(c, i, "short", a, 0.69, `Trend Intensity strong down (${tii.toFixed(0)})`);
  return makeSignal({ reason: `Trend Intensity ${tii.toFixed(0)}` });
}

// 6. Qstick
export function qstick(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const oc = c.map((x) => x.close - x.open), q = sma(oc, 14), i = c.length - 1, a = atr(c, 14);
  if (q[i - 1] <= 0 && q[i] > 0) return mk(c, i, "long", a, 0.68, "Qstick turned positive (buying pressure)");
  if (q[i - 1] >= 0 && q[i] < 0) return mk(c, i, "short", a, 0.68, "Qstick turned negative (selling pressure)");
  return makeSignal({ reason: `Qstick ${q[i].toFixed(2)}` });
}

// 7. Chande Momentum Oscillator
export function chandeMomentum(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 14, i = c.length - 1, a = atr(c, 14);
  const calc = (end: number) => {
    let up = 0, dn = 0;
    for (let k = end - p + 1; k <= end; k++) { const d = closes[k] - closes[k - 1]; if (d > 0) up += d; else dn += -d; }
    return up + dn === 0 ? 0 : (100 * (up - dn)) / (up + dn);
  };
  const now = calc(i), prev = calc(i - 1);
  if (prev < -50 && now >= -50) return mk(c, i, "long", a, 0.69, `CMO exit oversold (${now.toFixed(0)})`);
  if (prev > 50 && now <= 50) return mk(c, i, "short", a, 0.69, `CMO exit overbought (${now.toFixed(0)})`);
  return makeSignal({ reason: `CMO ${now.toFixed(0)}` });
}

// 8. DPO - Detrended Price Oscillator
export function dpo(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 20, shift = Math.floor(p / 2) + 1, ma = sma(closes, p), i = c.length - 1, a = atr(c, 14);
  const dpoNow = closes[i - shift] - ma[i], dpoPrev = closes[i - 1 - shift] - ma[i - 1];
  if (dpoPrev <= 0 && dpoNow > 0) return mk(c, i, "long", a, 0.67, "DPO crossed above zero");
  if (dpoPrev >= 0 && dpoNow < 0) return mk(c, i, "short", a, 0.67, "DPO crossed below zero");
  return makeSignal({ reason: `DPO ${dpoNow.toFixed(2)}` });
}

// 9. Elder Ray (Bull/Bear Power)
export function elderRay(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), e = ema(closes, 13), i = c.length - 1, a = atr(c, 14);
  const bull = c[i].high - e[i], bear = c[i].low - e[i];
  const bullPrev = c[i - 1].high - e[i - 1], bearPrev = c[i - 1].low - e[i - 1];
  // Uptrend (EMA yukarı) + bear power negatiften artıyor = long
  if (e[i] > e[i - 1] && bear < 0 && bear > bearPrev) return mk(c, i, "long", a, 0.7, "Elder Ray: bear power rising in uptrend");
  if (e[i] < e[i - 1] && bull > 0 && bull < bullPrev) return mk(c, i, "short", a, 0.7, "Elder Ray: bull power falling in downtrend");
  return makeSignal({ reason: "Elder Ray neutral" });
}

// 10. TTM Trend (Heikin-Ashi style consecutive)
export function ttmTrend(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // son 6 mumun ortalaması referans
  const ref = c.slice(i - 5, i + 1).reduce((s, x) => s + (x.high + x.low) / 2, 0) / 6;
  const closesUp = c.slice(i - 2, i + 1).every((x) => x.close > ref);
  const closesDn = c.slice(i - 2, i + 1).every((x) => x.close < ref);
  const prevRef = c.slice(i - 6, i).reduce((s, x) => s + (x.high + x.low) / 2, 0) / 6;
  const prevUp = c[i - 1].close > prevRef;
  if (closesUp && !prevUp) return mk(c, i, "long", a, 0.69, "TTM Trend flipped up");
  if (closesDn && prevUp) return mk(c, i, "short", a, 0.69, "TTM Trend flipped down");
  return makeSignal({ reason: "TTM Trend unchanged" });
}
