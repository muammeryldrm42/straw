import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

const body = (c: Candle) => Math.abs(c.close - c.open);
const rng = (c: Candle) => c.high - c.low;
const green = (c: Candle) => c.close > c.open;
const red = (c: Candle) => c.close < c.open;
const mkR = (c: Candle[], i: number, side: "long" | "short", slPrice: number, conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long") { const r = cur.close - slPrice; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "long", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const r = slPrice - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "short", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

export function counterattack(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1], cur = c[i];
  // Bullish: büyük kırmızı + yeşil aynı close'a kapanır (counterattack)
  if (red(prev) && body(prev) > a[i] && green(cur) && Math.abs(cur.close - prev.close) / prev.close < 0.004 && cur.open < prev.close) return mkR(c, i, "long", cur.low - 0.4 * a[i], 0.67, "Bullish counterattack line");
  if (green(prev) && body(prev) > a[i] && red(cur) && Math.abs(cur.close - prev.close) / prev.close < 0.004 && cur.open > prev.close) return mkR(c, i, "short", cur.high + 0.4 * a[i], 0.67, "Bearish counterattack line");
  return makeSignal({ reason: "No counterattack" });
}
