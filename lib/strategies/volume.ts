import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

// 1. OBV Trend - On-Balance Volume + slope
export function obvTrend(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const obv: number[] = [0];
  for (let k = 1; k < c.length; k++) {
    if (c[k].close > c[k - 1].close) obv.push(obv[k - 1] + c[k].volume);
    else if (c[k].close < c[k - 1].close) obv.push(obv[k - 1] - c[k].volume);
    else obv.push(obv[k - 1]);
  }
  const obvEma = ema(obv, 20);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const closeEma = ema(c.map((x) => x.close), 20);
  if (obv[i - 1] <= obvEma[i - 1] && obv[i] > obvEma[i] && cur.close > closeEma[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.72, reason: "OBV crossed above its EMA + uptrend" });
  }
  if (obv[i - 1] >= obvEma[i - 1] && obv[i] < obvEma[i] && cur.close < closeEma[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.72, reason: "OBV crossed below its EMA + downtrend" });
  }
  return makeSignal({ reason: "No OBV cross" });
}

// 2. A/D Line - Accumulation/Distribution
export function adLine(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const ad: number[] = [];
  let cum = 0;
  for (let k = 0; k < c.length; k++) {
    const rng = c[k].high - c[k].low;
    const mfm = rng === 0 ? 0 : ((c[k].close - c[k].low) - (c[k].high - c[k].close)) / rng;
    cum += mfm * c[k].volume;
    ad.push(cum);
  }
  const adEma = ema(ad, 21);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (ad[i - 1] <= adEma[i - 1] && ad[i] > adEma[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "A/D line turned up (accumulation)" });
  }
  if (ad[i - 1] >= adEma[i - 1] && ad[i] < adEma[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "A/D line turned down (distribution)" });
  }
  return makeSignal({ reason: "No A/D cross" });
}

// 3. Chaikin Money Flow
export function cmf(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 20;
  const calc = (end: number) => {
    let mfv = 0, vol = 0;
    for (let k = end - p + 1; k <= end; k++) {
      const rng = c[k].high - c[k].low;
      const mfm = rng === 0 ? 0 : ((c[k].close - c[k].low) - (c[k].high - c[k].close)) / rng;
      mfv += mfm * c[k].volume; vol += c[k].volume;
    }
    return vol === 0 ? 0 : mfv / vol;
  };
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const now = calc(i), prev = calc(i - 1);
  if (prev <= 0.05 && now > 0.05) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.71, reason: `CMF turned positive (${now.toFixed(2)})` });
  }
  if (prev >= -0.05 && now < -0.05) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.71, reason: `CMF turned negative (${now.toFixed(2)})` });
  }
  return makeSignal({ reason: `CMF ${now.toFixed(2)}` });
}

// 4. Force Index (Elder)
export function forceIndex(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const fi: number[] = [0];
  for (let k = 1; k < c.length; k++) fi.push((c[k].close - c[k - 1].close) * c[k].volume);
  const fiEma = ema(fi, 13);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (fiEma[i - 1] <= 0 && fiEma[i] > 0) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: "Force Index turned positive" });
  }
  if (fiEma[i - 1] >= 0 && fiEma[i] < 0) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: "Force Index turned negative" });
  }
  return makeSignal({ reason: "No Force Index cross" });
}

// 5. Ease of Movement
export function easeOfMovement(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const eom: number[] = [0];
  for (let k = 1; k < c.length; k++) {
    const dm = (c[k].high + c[k].low) / 2 - (c[k - 1].high + c[k - 1].low) / 2;
    const boxRatio = c[k].volume / 1e6 / ((c[k].high - c[k].low) || 1e-9);
    eom.push(boxRatio === 0 ? 0 : dm / boxRatio);
  }
  const eomSma = sma(eom, 14);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (eomSma[i - 1] <= 0 && eomSma[i] > 0) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.68, reason: "Ease of Movement turned positive" });
  }
  if (eomSma[i - 1] >= 0 && eomSma[i] < 0) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.68, reason: "Ease of Movement turned negative" });
  }
  return makeSignal({ reason: "EOM neutral" });
}

// 6. Volume Oscillator - fast/slow volume MA
export function volumeOscillator(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const vols = c.map((x) => x.volume);
  const fast = sma(vols, 5), slow = sma(vols, 20);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const vo = ((fast[i] - slow[i]) / slow[i]) * 100;
  // Yüksek hacim + yön = trend onayı
  if (vo > 40 && cur.close > cur.open && cur.close > c[i - 1].close) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: `Volume Oscillator spike +${vo.toFixed(0)}% + green` });
  }
  if (vo > 40 && cur.close < cur.open && cur.close < c[i - 1].close) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: `Volume Oscillator spike +${vo.toFixed(0)}% + red` });
  }
  return makeSignal({ reason: `Volume Oscillator ${vo.toFixed(0)}%` });
}

// 7. PVT - Price Volume Trend
export function pvt(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const pvtArr: number[] = [0];
  for (let k = 1; k < c.length; k++) {
    const chg = (c[k].close - c[k - 1].close) / c[k - 1].close;
    pvtArr.push(pvtArr[k - 1] + chg * c[k].volume);
  }
  const pvtEma = ema(pvtArr, 14);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (pvtArr[i - 1] <= pvtEma[i - 1] && pvtArr[i] > pvtEma[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: "PVT crossed above its EMA" });
  }
  if (pvtArr[i - 1] >= pvtEma[i - 1] && pvtArr[i] < pvtEma[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: "PVT crossed below its EMA" });
  }
  return makeSignal({ reason: "No PVT cross" });
}

// 8. VWMA Cross - Volume Weighted MA vs SMA
export function vwmaCross(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 20;
  const vwma = (end: number) => {
    let num = 0, den = 0;
    for (let k = end - p + 1; k <= end; k++) { num += c[k].close * c[k].volume; den += c[k].volume; }
    return den === 0 ? c[end].close : num / den;
  };
  const closes = c.map((x) => x.close);
  const smaArr = sma(closes, p);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const vNow = vwma(i), vPrev = vwma(i - 1);
  // VWMA, SMA üstüne çıkarsa = hacim fiyatı destekliyor
  if (vPrev <= smaArr[i - 1] && vNow > smaArr[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "VWMA crossed above SMA (volume-backed)" });
  }
  if (vPrev >= smaArr[i - 1] && vNow < smaArr[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "VWMA crossed below SMA (volume-backed)" });
  }
  return makeSignal({ reason: "No VWMA/SMA cross" });
}
