import { Candle, Signal, makeSignal, atr, sma, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function upperWick(c: Candle) { return c.high - Math.max(c.open, c.close); }
function lowerWick(c: Candle) { return Math.min(c.open, c.close) - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

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
