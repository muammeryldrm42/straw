import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

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
