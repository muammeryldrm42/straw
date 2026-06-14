import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

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
