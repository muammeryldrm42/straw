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

export function abandonedBaby(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), c1 = c[i - 2], c2 = c[i - 1], c3 = c[i];
  const isDoji = body(c2) < rng(c2) * 0.1;
  // Bullish: kırmızı + gap-down doji + gap-up yeşil
  if (red(c1) && isDoji && c2.high < c1.low && green(c3) && c3.low > c2.high) return mkR(c, i, "long", c2.low - 0.3 * a[i], 0.71, "Bullish abandoned baby");
  if (green(c1) && isDoji && c2.low > c1.high && red(c3) && c3.high < c2.low) return mkR(c, i, "short", c2.high + 0.3 * a[i], 0.71, "Bearish abandoned baby");
  return makeSignal({ reason: "No abandoned baby" });
}
