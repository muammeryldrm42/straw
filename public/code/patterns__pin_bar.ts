import { Candle, Signal, makeSignal, atr, sma, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function upperWick(c: Candle) { return c.high - Math.max(c.open, c.close); }
function lowerWick(c: Candle) { return Math.min(c.open, c.close) - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

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
