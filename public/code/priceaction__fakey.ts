import { Candle, Signal, makeSignal, atr, ema } from "../indicators";

const body = (c: Candle) => Math.abs(c.close - c.open);
const rng = (c: Candle) => c.high - c.low;
const green = (c: Candle) => c.close > c.open;
const red = (c: Candle) => c.close < c.open;
const mkPA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long") { const r = cur.close - slPrice; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "long", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const r = slPrice - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "short", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

export function fakey(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), mother = c[i - 3], inside = c[i - 2], fake = c[i - 1], cur = c[i];
  const isInside = inside.high < mother.high && inside.low > mother.low;
  // Fakey long: inside bar, aşağı sahte kırılım, sonra yukarı dönüş
  if (isInside && fake.low < mother.low && cur.close > mother.low && cur.close > cur.open) return mkPA(c, i, "long", fake.low - 0.3 * a[i], 0.71, "Bullish fakey (false breakdown)");
  if (isInside && fake.high > mother.high && cur.close < mother.high && cur.close < cur.open) return mkPA(c, i, "short", fake.high + 0.3 * a[i], 0.71, "Bearish fakey (false breakout)");
  return makeSignal({ reason: "No fakey" });
}
