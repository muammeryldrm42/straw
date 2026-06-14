import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

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
