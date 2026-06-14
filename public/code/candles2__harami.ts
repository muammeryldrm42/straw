import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

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
