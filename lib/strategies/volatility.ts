import { Candle, Signal, makeSignal, sma, ema, atr, bollingerBands } from "../indicators";

// 1. ATR Channel Breakout - EMA ± ATR×mult
export function atrChannel(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const mid = ema(closes, 20), a = atr(c, 14);
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  const upper = mid[i] + 2 * a[i], lower = mid[i] - 2 * a[i];
  const upperPrev = mid[i - 1] + 2 * a[i - 1], lowerPrev = mid[i - 1] - 2 * a[i - 1];
  if (cur.close > upper && prev.close <= upperPrev) {
    const sl = mid[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 2, cur.close + r * 3], confidence: 0.71, reason: "ATR channel breakout up" });
  }
  if (cur.close < lower && prev.close >= lowerPrev) {
    const sl = mid[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1, cur.close - r * 2, cur.close - r * 3], confidence: 0.71, reason: "ATR channel breakdown down" });
  }
  return makeSignal({ reason: "Inside ATR channel" });
}

// 2. Choppiness Index - trend vs range (filter + breakout)
export function choppiness(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 14;
  const a = atr(c, 1); // 1-period TR
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  const win = c.slice(i - p + 1, i + 1);
  const hh = Math.max(...win.map((x) => x.high)), ll = Math.min(...win.map((x) => x.low));
  const atrSum = a.slice(i - p + 1, i + 1).reduce((s, v) => s + v, 0);
  const ci = (100 * Math.log10(atrSum / (hh - ll || 1e-9))) / Math.log10(p);
  const a14 = atr(c, 14);
  // CI < 38.2 = güçlü trend; yön için kırılım
  if (ci < 38.2) {
    if (cur.close > hh * 0.999 && cur.close > cur.open) {
      const sl = cur.close - 2 * a14[i], r = cur.close - sl;
      return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: `Low choppiness (${ci.toFixed(0)}) + breakout up` });
    }
    if (cur.close < ll * 1.001 && cur.close < cur.open) {
      const sl = cur.close + 2 * a14[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: `Low choppiness (${ci.toFixed(0)}) + breakdown` });
    }
  }
  return makeSignal({ reason: `Choppiness ${ci.toFixed(0)} (${ci > 61.8 ? "ranging" : "neutral"})` });
}

// 3. Mass Index - reversal bulge
export function massIndex(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const range = c.map((x) => x.high - x.low);
  const ema9 = ema(range, 9);
  const ema9of9 = ema(ema9, 9);
  const ratio = ema9.map((v, i) => (ema9of9[i] ? v / ema9of9[i] : 1));
  const sumMI = (end: number) => ratio.slice(end - 24, end + 1).reduce((a, b) => a + b, 0);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const mi = sumMI(i), miPrev = sumMI(i - 1);
  const ema9c = ema(c.map((x) => x.close), 9);
  // Reversal bulge: MI 27 üstüne çıkıp 26.5 altına dönerse
  if (miPrev >= 27 && mi < 26.5) {
    // yön EMA9 eğimiyle
    if (ema9c[i] < ema9c[i - 3]) {
      const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.68, reason: "Mass Index reversal bulge (down)" });
    }
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.68, reason: "Mass Index reversal bulge (up)" });
  }
  return makeSignal({ reason: `Mass Index ${mi.toFixed(1)}` });
}

// 4. RVI - Relative Volatility Index
export function rvi(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 10;
  const closes = c.map((x) => x.close);
  const std: number[] = [];
  for (let k = 0; k < closes.length; k++) {
    if (k < p) { std.push(0); continue; }
    const win = closes.slice(k - p + 1, k + 1);
    const m = win.reduce((a, b) => a + b, 0) / p;
    std.push(Math.sqrt(win.reduce((s, v) => s + (v - m) ** 2, 0) / p));
  }
  const up: number[] = [0], down: number[] = [0];
  for (let k = 1; k < closes.length; k++) {
    up.push(closes[k] > closes[k - 1] ? std[k] : 0);
    down.push(closes[k] < closes[k - 1] ? std[k] : 0);
  }
  const upEma = ema(up, 14), downEma = ema(down, 14);
  const rviCalc = (idx: number) => (upEma[idx] + downEma[idx] === 0 ? 50 : (100 * upEma[idx]) / (upEma[idx] + downEma[idx]));
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const now = rviCalc(i), prev = rviCalc(i - 1);
  if (prev < 50 && now >= 50) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.68, reason: `RVI crossed above 50 (${now.toFixed(0)})` });
  }
  if (prev > 50 && now <= 50) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.68, reason: `RVI crossed below 50 (${now.toFixed(0)})` });
  }
  return makeSignal({ reason: `RVI ${now.toFixed(0)}` });
}

// 5. Standard Deviation Breakout - volatility expansion
export function stdDevBreakout(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 20;
  const closes = c.map((x) => x.close);
  const stdAt = (end: number) => {
    const win = closes.slice(end - p + 1, end + 1);
    const m = win.reduce((a, b) => a + b, 0) / p;
    return Math.sqrt(win.reduce((s, v) => s + (v - m) ** 2, 0) / p);
  };
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const sNow = stdAt(i), sAvg = (stdAt(i - 1) + stdAt(i - 2) + stdAt(i - 3)) / 3;
  // Volatilite patlaması + yön
  if (sNow > sAvg * 1.5) {
    if (cur.close > cur.open && cur.close > c[i - 1].close) {
      const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
      return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: "Std-dev volatility expansion (up)" });
    }
    if (cur.close < cur.open && cur.close < c[i - 1].close) {
      const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: "Std-dev volatility expansion (down)" });
    }
  }
  return makeSignal({ reason: "No volatility expansion" });
}

// 6. Bollinger Bandwidth Expansion
export function bollingerBandwidth(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const bb = bollingerBands(closes, 20, 2);
  const bw = (idx: number) => (bb.middle[idx] ? (bb.upper[idx] - bb.lower[idx]) / bb.middle[idx] : 0);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const bwNow = bw(i);
  // Son 20 mumun en düşük bandwidth'i (squeeze) sonrası genişleme
  let minBw = Infinity;
  for (let k = i - 20; k < i; k++) minBw = Math.min(minBw, bw(k));
  const wasSqueeze = bw(i - 1) <= minBw * 1.05;
  if (wasSqueeze && bwNow > bw(i - 1)) {
    if (cur.close > bb.upper[i - 1]) {
      const sl = bb.middle[i], r = cur.close - sl;
      return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.73, reason: "BB bandwidth expanding up (post-squeeze)" });
    }
    if (cur.close < bb.lower[i - 1]) {
      const sl = bb.middle[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.73, reason: "BB bandwidth expanding down (post-squeeze)" });
    }
  }
  return makeSignal({ reason: "No bandwidth expansion" });
}
