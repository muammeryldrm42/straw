import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

// 1. CCI - Commodity Channel Index, ±100 extremes
export function cci(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 20;
  const tp = c.map((x) => (x.high + x.low + x.close) / 3);
  const smaTP = sma(tp, p);
  const i = c.length - 1, a = atr(c, 14);
  const slice = tp.slice(i - p + 1, i + 1);
  const mean = smaTP[i];
  const md = slice.reduce((s, v) => s + Math.abs(v - mean), 0) / p;
  if (md === 0) return makeSignal({ reason: "Flat" });
  const cciNow = (tp[i] - mean) / (0.015 * md);
  const prevSlice = tp.slice(i - p, i);
  const prevMean = smaTP[i - 1];
  const prevMd = prevSlice.reduce((s, v) => s + Math.abs(v - prevMean), 0) / p;
  const cciPrev = prevMd ? (tp[i - 1] - prevMean) / (0.015 * prevMd) : 0;
  const cur = c[i];
  if (cciPrev < -100 && cciNow > -100) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.71, reason: `CCI back above -100 (${cciNow.toFixed(0)})` });
  }
  if (cciPrev > 100 && cciNow < 100) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.71, reason: `CCI back below +100 (${cciNow.toFixed(0)})` });
  }
  return makeSignal({ reason: `CCI ${cciNow.toFixed(0)} (no cross)` });
}

// 2. Williams %R
export function williamsR(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14;
  const wr = (idx: number) => {
    const win = c.slice(idx - p + 1, idx + 1);
    const hh = Math.max(...win.map((x) => x.high)), ll = Math.min(...win.map((x) => x.low));
    return hh === ll ? -50 : ((hh - c[idx].close) / (hh - ll)) * -100;
  };
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const now = wr(i), prev = wr(i - 1);
  if (prev < -80 && now > -80) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: `Williams %R exit oversold (${now.toFixed(0)})` });
  }
  if (prev > -20 && now < -20) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: `Williams %R exit overbought (${now.toFixed(0)})` });
  }
  return makeSignal({ reason: `Williams %R ${now.toFixed(0)}` });
}

// 3. MFI - Money Flow Index (volume-weighted RSI)
export function mfi(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14;
  const tp = c.map((x) => (x.high + x.low + x.close) / 3);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const calc = (end: number) => {
    let pos = 0, neg = 0;
    for (let k = end - p + 1; k <= end; k++) {
      const mf = tp[k] * c[k].volume;
      if (tp[k] > tp[k - 1]) pos += mf; else neg += mf;
    }
    return neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
  };
  const now = calc(i), prev = calc(i - 1);
  if (prev < 20 && now >= 20) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.73, reason: `MFI exit oversold (${now.toFixed(0)})` });
  }
  if (prev > 80 && now <= 80) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.73, reason: `MFI exit overbought (${now.toFixed(0)})` });
  }
  return makeSignal({ reason: `MFI ${now.toFixed(0)}` });
}

// 4. ROC - Rate of Change momentum
export function roc(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 12;
  const closes = c.map((x) => x.close);
  const rocAt = (idx: number) => ((closes[idx] - closes[idx - p]) / closes[idx - p]) * 100;
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const now = rocAt(i), prev = rocAt(i - 1);
  const e = ema(closes, 50);
  if (prev <= 0 && now > 0 && cur.close > e[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: "ROC crossed above zero + uptrend" });
  }
  if (prev >= 0 && now < 0 && cur.close < e[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: "ROC crossed below zero + downtrend" });
  }
  return makeSignal({ reason: `ROC ${now.toFixed(2)}%` });
}

// 5. Awesome Oscillator - zero-line cross
export function awesomeOscillator(c: Candle[]): Signal {
  if (c.length < 45) return makeSignal({ reason: "Insufficient data" });
  const median = c.map((x) => (x.high + x.low) / 2);
  const ao = sma(median, 5).map((v, i) => v - sma(median, 34)[i]);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (ao[i - 1] <= 0 && ao[i] > 0) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "Awesome Oscillator zero cross up" });
  }
  if (ao[i - 1] >= 0 && ao[i] < 0) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "Awesome Oscillator zero cross down" });
  }
  return makeSignal({ reason: "No AO zero cross" });
}

// 6. Ultimate Oscillator - multi-timeframe (7/14/28)
export function ultimateOscillator(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const bp: number[] = [], tr: number[] = [];
  for (let k = 1; k < c.length; k++) {
    const lowMin = Math.min(c[k].low, c[k - 1].close);
    bp.push(c[k].close - lowMin);
    tr.push(Math.max(c[k].high, c[k - 1].close) - lowMin);
  }
  const sum = (arr: number[], end: number, n: number) => arr.slice(end - n + 1, end + 1).reduce((a, b) => a + b, 0);
  const j = bp.length - 1;
  const avg7 = sum(bp, j, 7) / sum(tr, j, 7);
  const avg14 = sum(bp, j, 14) / sum(tr, j, 14);
  const avg28 = sum(bp, j, 28) / sum(tr, j, 28);
  const uo = (100 * (4 * avg7 + 2 * avg14 + avg28)) / 7;
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (uo < 30) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.71, reason: `Ultimate Oscillator oversold (${uo.toFixed(0)})` });
  }
  if (uo > 70) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.71, reason: `Ultimate Oscillator overbought (${uo.toFixed(0)})` });
  }
  return makeSignal({ reason: `Ultimate Oscillator ${uo.toFixed(0)}` });
}

// 7. TRIX - triple-smoothed EMA rate of change
export function trix(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const e1 = ema(closes, 15), e2 = ema(e1, 15), e3 = ema(e2, 15);
  const trixLine = e3.map((v, i) => (i > 0 && e3[i - 1] ? ((v - e3[i - 1]) / e3[i - 1]) * 100 : 0));
  const sig = ema(trixLine, 9);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (trixLine[i - 1] <= sig[i - 1] && trixLine[i] > sig[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "TRIX bullish signal cross" });
  }
  if (trixLine[i - 1] >= sig[i - 1] && trixLine[i] < sig[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "TRIX bearish signal cross" });
  }
  return makeSignal({ reason: "No TRIX cross" });
}

// 8. Coppock Curve - long-term momentum
export function coppock(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const rocN = (n: number, idx: number) => ((closes[idx] - closes[idx - n]) / closes[idx - n]) * 100;
  const raw: number[] = [];
  for (let k = 0; k < closes.length; k++) {
    if (k < 14) { raw.push(0); continue; }
    raw.push(rocN(11, k) + rocN(14, k));
  }
  // WMA(10) of raw
  const wma = raw.map((_, idx) => {
    if (idx < 10) return 0;
    let num = 0, den = 0;
    for (let w = 0; w < 10; w++) { num += raw[idx - w] * (10 - w); den += (10 - w); }
    return num / den;
  });
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (wma[i - 1] <= 0 && wma[i] > 0) {
    const sl = cur.close - 2.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.72, reason: "Coppock curve turned up (long-term buy)" });
  }
  return makeSignal({ reason: `Coppock ${wma[i].toFixed(1)}` });
}
