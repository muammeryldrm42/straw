import { Candle, Signal, makeSignal, atr, sma, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function upperWick(c: Candle) { return c.high - Math.max(c.open, c.close); }
function lowerWick(c: Candle) { return Math.min(c.open, c.close) - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

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
