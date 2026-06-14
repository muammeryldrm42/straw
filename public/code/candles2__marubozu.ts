import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

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
