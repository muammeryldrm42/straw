import { Candle, Signal, makeSignal, atr, sma, rsi } from "../indicators";

// Yardımcı: mum metrikleri
function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function upperWick(c: Candle) { return c.high - Math.max(c.open, c.close); }
function lowerWick(c: Candle) { return Math.min(c.open, c.close) - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

// 1. Engulfing - bullish/bearish engulfing pattern (S/R yakınında)
export function engulfing(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 14);
  // Bullish engulfing: önceki kırmızı, mevcut yeşil ve önceki gövdeyi tam sarar
  const bullEngulf = isRed(prev) && isGreen(cur) && cur.close > prev.open && cur.open < prev.close && body(cur) > body(prev);
  // Bearish engulfing
  const bearEngulf = isGreen(prev) && isRed(cur) && cur.close < prev.open && cur.open > prev.close && body(cur) > body(prev);
  // Bağlam: oversold'da bullish, overbought'ta bearish daha güvenilir
  if (bullEngulf && rs[i] < 45) {
    const sl = cur.low - 0.3 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.73, reason: `Bullish engulfing (RSI ${rs[i].toFixed(0)})` });
  }
  if (bearEngulf && rs[i] > 55) {
    const sl = cur.high + 0.3 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.73, reason: `Bearish engulfing (RSI ${rs[i].toFixed(0)})` });
  }
  return makeSignal({ reason: "No engulfing pattern" });
}

// 2. Pin Bar - Hammer (bullish) / Shooting Star (bearish)
export function pinBar(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const rng = range(cur);
  if (rng === 0) return makeSignal({ reason: "Doji range" });
  const b = body(cur), uw = upperWick(cur), lw = lowerWick(cur);
  // Trend bağlamı: son 20 mum
  const recent = c.slice(-20);
  const recentLow = Math.min(...recent.map((x) => x.low));
  const recentHigh = Math.max(...recent.map((x) => x.high));
  // Hammer: uzun alt fitil (range %60+), küçük gövde, dip yakınında
  const isHammer = lw > rng * 0.6 && b < rng * 0.3 && uw < rng * 0.15;
  const nearLow = cur.low <= recentLow + (recentHigh - recentLow) * 0.2;
  if (isHammer && nearLow) {
    const sl = cur.low - 0.2 * a[i], r = cur.close - sl;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.71, reason: "Hammer pin bar at support" });
  }
  // Shooting star: uzun üst fitil, küçük gövde, tepe yakınında
  const isStar = uw > rng * 0.6 && b < rng * 0.3 && lw < rng * 0.15;
  const nearHigh = cur.high >= recentHigh - (recentHigh - recentLow) * 0.2;
  if (isStar && nearHigh) {
    const sl = cur.high + 0.2 * a[i], r = sl - cur.close;
    if (r > 0) return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.71, reason: "Shooting star pin bar at resistance" });
  }
  return makeSignal({ reason: "No pin bar" });
}

// 3. Star Pattern - Morning Star (bullish) / Evening Star (bearish)
export function starPattern(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, c1 = c[i - 2], c2 = c[i - 1], c3 = c[i], a = atr(c, 14);
  const r1 = range(c1), r3 = range(c3);
  // Morning star: büyük kırmızı + küçük gövde (yıldız) + büyük yeşil (1. mumun ortasını geçen)
  const morningStar =
    isRed(c1) && body(c1) > r1 * 0.5 &&
    body(c2) < range(c2) * 0.4 &&
    isGreen(c3) && body(c3) > r3 * 0.5 &&
    c3.close > (c1.open + c1.close) / 2;
  if (morningStar) {
    const sl = Math.min(c2.low, c3.low) - 0.3 * a[i], r = c3.close - sl;
    return makeSignal({ signal: "long", entry: c3.close, stop_loss: sl, take_profit: [c3.close + r * 1.5, c3.close + r * 2.5, c3.close + r * 4], confidence: 0.76, reason: "Morning star reversal" });
  }
  // Evening star: büyük yeşil + küçük gövde + büyük kırmızı
  const eveningStar =
    isGreen(c1) && body(c1) > r1 * 0.5 &&
    body(c2) < range(c2) * 0.4 &&
    isRed(c3) && body(c3) > r3 * 0.5 &&
    c3.close < (c1.open + c1.close) / 2;
  if (eveningStar) {
    const sl = Math.max(c2.high, c3.high) + 0.3 * a[i], r = sl - c3.close;
    return makeSignal({ signal: "short", entry: c3.close, stop_loss: sl, take_profit: [c3.close - r * 1.5, c3.close - r * 2.5, c3.close - r * 4], confidence: 0.76, reason: "Evening star reversal" });
  }
  return makeSignal({ reason: "No star pattern" });
}

// 4. Three Soldiers / Three Crows
export function threeSoldiers(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const s = [c[i - 2], c[i - 1], c[i]];
  // Three white soldiers: 3 ardışık yeşil, her biri öncekinin gövdesinde açılıp daha yüksek kapanır, güçlü gövde
  const soldiers =
    s.every((x) => isGreen(x) && body(x) > range(x) * 0.6) &&
    s[1].close > s[0].close && s[2].close > s[1].close &&
    s[1].open > s[0].open && s[2].open > s[1].open;
  if (soldiers) {
    const sl = s[0].low - 0.3 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 1.8, cur.close + r * 3], confidence: 0.74, reason: "Three white soldiers" });
  }
  // Three black crows
  const crows =
    s.every((x) => isRed(x) && body(x) > range(x) * 0.6) &&
    s[1].close < s[0].close && s[2].close < s[1].close &&
    s[1].open < s[0].open && s[2].open < s[1].open;
  if (crows) {
    const sl = s[0].high + 0.3 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1, cur.close - r * 1.8, cur.close - r * 3], confidence: 0.74, reason: "Three black crows" });
  }
  return makeSignal({ reason: "No three-candle pattern" });
}
