import { Candle, Signal, makeSignal, atr, sma, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function upperWick(c: Candle) { return c.high - Math.max(c.open, c.close); }
function lowerWick(c: Candle) { return Math.min(c.open, c.close) - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

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
