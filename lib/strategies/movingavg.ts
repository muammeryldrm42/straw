import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

// Hull MA helper
function hma(values: number[], period: number): number[] {
  const wma = (arr: number[], p: number, end: number) => {
    if (end < p - 1) return NaN;
    let num = 0, den = 0;
    for (let k = 0; k < p; k++) { num += arr[end - k] * (p - k); den += (p - k); }
    return num / den;
  };
  const half = Math.floor(period / 2), sq = Math.floor(Math.sqrt(period));
  const raw: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const w1 = wma(values, half, i), w2 = wma(values, period, i);
    raw.push(isNaN(w1) || isNaN(w2) ? NaN : 2 * w1 - w2);
  }
  const out: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (i < period + sq) { out.push(NaN); continue; }
    let num = 0, den = 0;
    for (let k = 0; k < sq; k++) { const v = raw[i - k]; if (!isNaN(v)) { num += v * (sq - k); den += (sq - k); } }
    out.push(den ? num / den : NaN);
  }
  return out;
}

// 1. Golden/Death Cross - 50/200 SMA
export function goldenCross(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const fastP = 50, slowP = Math.min(200, Math.floor(c.length / 2));
  const fast = sma(closes, fastP), slow = sma(closes, slowP);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (fast[i - 1] <= slow[i - 1] && fast[i] > slow[i]) {
    const sl = cur.close - 2.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.75, reason: "Golden Cross (50 over 200)" });
  }
  if (fast[i - 1] >= slow[i - 1] && fast[i] < slow[i]) {
    const sl = cur.close + 2.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.75, reason: "Death Cross (50 under 200)" });
  }
  return makeSignal({ reason: "No MA cross" });
}

// 2. Hull MA Cross
export function hmaCross(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const h = hma(closes, 21);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (isNaN(h[i]) || isNaN(h[i - 1])) return makeSignal({ reason: "HMA warming up" });
  // HMA eğim dönüşü
  if (h[i - 1] <= h[i - 2] && h[i] > h[i - 1] && cur.close > h[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.72, reason: "Hull MA turned up" });
  }
  if (h[i - 1] >= h[i - 2] && h[i] < h[i - 1] && cur.close < h[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.72, reason: "Hull MA turned down" });
  }
  return makeSignal({ reason: "No HMA turn" });
}

// 3. TEMA Cross - Triple EMA
export function temaCross(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const temaCalc = (p: number) => {
    const e1 = ema(closes, p), e2 = ema(e1, p), e3 = ema(e2, p);
    return e1.map((v, i) => 3 * v - 3 * e2[i] + e3[i]);
  };
  const fast = temaCalc(9), slow = temaCalc(21);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (fast[i - 1] <= slow[i - 1] && fast[i] > slow[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.72, reason: "TEMA bullish cross (low lag)" });
  }
  if (fast[i - 1] >= slow[i - 1] && fast[i] < slow[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.72, reason: "TEMA bearish cross (low lag)" });
  }
  return makeSignal({ reason: "No TEMA cross" });
}

// 4. KAMA - Kaufman Adaptive MA
export function kama(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const n = 10, fast = 2 / (2 + 1), slow = 2 / (30 + 1);
  const kamaArr: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < n) { kamaArr.push(closes[i]); continue; }
    const change = Math.abs(closes[i] - closes[i - n]);
    let vol = 0;
    for (let k = i - n + 1; k <= i; k++) vol += Math.abs(closes[k] - closes[k - 1]);
    const er = vol === 0 ? 0 : change / vol;
    const sc = (er * (fast - slow) + slow) ** 2;
    kamaArr.push(kamaArr[i - 1] + sc * (closes[i] - kamaArr[i - 1]));
  }
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (closes[i - 1] <= kamaArr[i - 1] && closes[i] > kamaArr[i] && kamaArr[i] > kamaArr[i - 1]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.71, reason: "Price crossed above rising KAMA" });
  }
  if (closes[i - 1] >= kamaArr[i - 1] && closes[i] < kamaArr[i] && kamaArr[i] < kamaArr[i - 1]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.71, reason: "Price crossed below falling KAMA" });
  }
  return makeSignal({ reason: "No KAMA cross" });
}

// 5. Guppy MMA - Multiple MA ribbon (short vs long groups)
export function guppyMMA(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const shortP = [3, 5, 8, 10, 12, 15], longP = [30, 35, 40, 45, 50, 60];
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const shortMAs = shortP.map((p) => ema(closes, p)[i]);
  const longMAs = longP.map((p) => ema(closes, Math.min(p, Math.floor(c.length / 2)))[i]);
  const shortMin = Math.min(...shortMAs), shortMax = Math.max(...shortMAs);
  const longMax = Math.max(...longMAs), longMin = Math.min(...longMAs);
  // Kısa grup tamamen uzun grubun üstünde = güçlü uptrend
  if (shortMin > longMax) {
    const prevShortMin = Math.min(...shortP.map((p) => ema(closes, p)[i - 3]));
    const prevLongMax = Math.max(...longP.map((p) => ema(closes, Math.min(p, Math.floor(c.length / 2)))[i - 3]));
    if (prevShortMin <= prevLongMax) {
      const sl = cur.close - 2.5 * a[i], r = cur.close - sl;
      return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.74, reason: "Guppy ribbon flipped bullish (short group over long)" });
    }
  }
  if (shortMax < longMin) {
    const prevShortMax = Math.max(...shortP.map((p) => ema(closes, p)[i - 3]));
    const prevLongMin = Math.min(...longP.map((p) => ema(closes, Math.min(p, Math.floor(c.length / 2)))[i - 3]));
    if (prevShortMax >= prevLongMin) {
      const sl = cur.close + 2.5 * a[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.74, reason: "Guppy ribbon flipped bearish (short group under long)" });
    }
  }
  return makeSignal({ reason: "Guppy ribbon not aligned" });
}

// 6. MA Envelope bounce
export function maEnvelope(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const mid = sma(closes, 20), a = atr(c, 14);
  const pct = 0.025;
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  const upper = mid[i] * (1 + pct), lower = mid[i] * (1 - pct);
  // Alt zarftan dönüş = long
  if (prev.low <= mid[i - 1] * (1 - pct) && cur.close > cur.open && cur.close > prev.close) {
    const sl = prev.low - 0.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [mid[i], upper], confidence: 0.69, reason: "MA envelope lower bounce" });
  }
  if (prev.high >= mid[i - 1] * (1 + pct) && cur.close < cur.open && cur.close < prev.close) {
    const sl = prev.high + 0.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [mid[i], lower], confidence: 0.69, reason: "MA envelope upper rejection" });
  }
  return makeSignal({ reason: "Inside MA envelope" });
}

// 7. DEMA Cross - Double EMA
export function demaCross(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const demaCalc = (p: number) => { const e1 = ema(closes, p), e2 = ema(e1, p); return e1.map((v, i) => 2 * v - e2[i]); };
  const fast = demaCalc(10), slow = demaCalc(26);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (fast[i - 1] <= slow[i - 1] && fast[i] > slow[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.71, reason: "DEMA bullish cross" });
  }
  if (fast[i - 1] >= slow[i - 1] && fast[i] < slow[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.71, reason: "DEMA bearish cross" });
  }
  return makeSignal({ reason: "No DEMA cross" });
}

// 8. MA Slope momentum - EMA slope acceleration
export function maSlope(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const e = ema(closes, 21), a = atr(c, 14);
  const i = c.length - 1, cur = c[i];
  const slopeNow = (e[i] - e[i - 3]) / e[i - 3];
  const slopePrev = (e[i - 1] - e[i - 4]) / e[i - 4];
  // Eğim sıfırdan pozitife döndü + ivme
  if (slopePrev <= 0 && slopeNow > 0 && cur.close > e[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.68, reason: "EMA slope turned positive" });
  }
  if (slopePrev >= 0 && slopeNow < 0 && cur.close < e[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.68, reason: "EMA slope turned negative" });
  }
  return makeSignal({ reason: "EMA slope flat" });
}
