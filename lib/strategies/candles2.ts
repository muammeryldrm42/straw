import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

// 1. Doji Reversal - kararsızlık mumu + extreme
export function dojiReversal(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 14);
  const rng = range(cur);
  if (rng === 0) return makeSignal({ reason: "Zero range" });
  // Doji: gövde range'in %10'undan küçük
  const isDoji = body(cur) < rng * 0.1;
  if (!isDoji) return makeSignal({ reason: "Not a doji" });
  // Oversold doji -> long beklentisi (teyit: sonraki mum yok, doji'nin konumu)
  if (rs[i] < 35) {
    const sl = cur.low - 0.5 * a[i], r = cur.close - sl;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.66, reason: `Doji at oversold (RSI ${rs[i].toFixed(0)})` });
  }
  if (rs[i] > 65) {
    const sl = cur.high + 0.5 * a[i], r = sl - cur.close;
    if (r > 0) return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.66, reason: `Doji at overbought (RSI ${rs[i].toFixed(0)})` });
  }
  return makeSignal({ reason: "Doji in mid-range (no edge)" });
}

// 2. Harami - inside bar reversal
export function harami(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 14);
  // Bullish harami: büyük kırmızı + içine sığan küçük yeşil
  const bullHarami = isRed(prev) && body(prev) > range(prev) * 0.6 &&
    isGreen(cur) && cur.high < prev.open && cur.low > prev.close && body(cur) < body(prev) * 0.6;
  const bearHarami = isGreen(prev) && body(prev) > range(prev) * 0.6 &&
    isRed(cur) && cur.high < prev.close && cur.low > prev.open && body(cur) < body(prev) * 0.6;
  if (bullHarami && rs[i] < 45) {
    const sl = prev.low - 0.3 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "Bullish harami reversal" });
  }
  if (bearHarami && rs[i] > 55) {
    const sl = prev.high + 0.3 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "Bearish harami reversal" });
  }
  return makeSignal({ reason: "No harami" });
}

// 3. Tweezer Top/Bottom
export function tweezer(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const recent = c.slice(-20);
  const recentLow = Math.min(...recent.map((x) => x.low)), recentHigh = Math.max(...recent.map((x) => x.high));
  // Tweezer bottom: iki mum dipleri eşit, dip bölgede
  const eqLows = Math.abs(cur.low - prev.low) / (prev.low || 1) < 0.003;
  const eqHighs = Math.abs(cur.high - prev.high) / (prev.high || 1) < 0.003;
  const nearLow = cur.low <= recentLow + (recentHigh - recentLow) * 0.2;
  const nearHigh = cur.high >= recentHigh - (recentHigh - recentLow) * 0.2;
  if (eqLows && nearLow && isRed(prev) && isGreen(cur)) {
    const sl = cur.low - 0.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: "Tweezer bottom at support" });
  }
  if (eqHighs && nearHigh && isGreen(prev) && isRed(cur)) {
    const sl = cur.high + 0.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: "Tweezer top at resistance" });
  }
  return makeSignal({ reason: "No tweezer" });
}

// 4. Marubozu - fitilsiz güçlü momentum mumu
export function marubozu(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const rng = range(cur);
  if (rng < a[i] * 1.2) return makeSignal({ reason: "Candle too small" });
  const upWick = cur.high - Math.max(cur.open, cur.close);
  const dnWick = Math.min(cur.open, cur.close) - cur.low;
  // Marubozu: fitiller range'in %5'inden küçük
  const noWicks = upWick < rng * 0.05 && dnWick < rng * 0.05;
  if (!noWicks) return makeSignal({ reason: "Not a marubozu (has wicks)" });
  if (isGreen(cur)) {
    const sl = cur.low - 0.3 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 1.8, cur.close + r * 3], confidence: 0.7, reason: "Bullish marubozu (full-body momentum)" });
  }
  const sl = cur.high + 0.3 * a[i], r = sl - cur.close;
  return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1, cur.close - r * 1.8, cur.close - r * 3], confidence: 0.7, reason: "Bearish marubozu (full-body momentum)" });
}

// 5. Dark Cloud Cover
export function darkCloudCover(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 14);
  // Dark cloud: büyük yeşil + sonraki kırmızı prev'in tepesinin üstünde açılıp ortasının altında kapanır
  const midPrev = (prev.open + prev.close) / 2;
  const darkCloud = isGreen(prev) && body(prev) > range(prev) * 0.5 &&
    isRed(cur) && cur.open > prev.high && cur.close < midPrev && cur.close > prev.open;
  if (darkCloud && rs[i] > 55) {
    const sl = cur.high + 0.3 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.72, reason: "Dark cloud cover (bearish)" });
  }
  return makeSignal({ reason: "No dark cloud cover" });
}

// 6. Piercing Line
export function piercingLine(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 14);
  // Piercing: büyük kırmızı + sonraki yeşil prev'in dibinin altında açılıp ortasının üstünde kapanır
  const midPrev = (prev.open + prev.close) / 2;
  const piercing = isRed(prev) && body(prev) > range(prev) * 0.5 &&
    isGreen(cur) && cur.open < prev.low && cur.close > midPrev && cur.close < prev.open;
  if (piercing && rs[i] < 45) {
    const sl = cur.low - 0.3 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.72, reason: "Piercing line (bullish)" });
  }
  return makeSignal({ reason: "No piercing line" });
}
