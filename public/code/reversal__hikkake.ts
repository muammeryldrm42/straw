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

export function hikkake(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), inside = c[i - 2], bar = c[i - 1], cur = c[i];
  // inside bar, sonra aşağı sahte kırılım, sonra yukarı dönüş = bullish hikkake
  const wasInside = inside.high < c[i - 3]?.high && inside.low > c[i - 3]?.low;
  if (wasInside && bar.low < inside.low && cur.close > inside.high) return mkR(c, i, "long", bar.low - 0.3 * a[i], 0.7, "Bullish hikkake (failed breakdown)");
  if (wasInside && bar.high > inside.high && cur.close < inside.low) return mkR(c, i, "short", bar.high + 0.3 * a[i], 0.7, "Bearish hikkake (failed breakout)");
  return makeSignal({ reason: "No hikkake" });
}
