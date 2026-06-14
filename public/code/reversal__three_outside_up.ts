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

export function threeOutsideUp(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), c1 = c[i - 2], c2 = c[i - 1], c3 = c[i];
  const bullEngulf = red(c1) && green(c2) && c2.close > c1.open && c2.open < c1.close;
  if (bullEngulf && green(c3) && c3.close > c2.close) return mkR(c, i, "long", c2.low - 0.3 * a[i], 0.73, "Three Outside Up confirmed");
  const bearEngulf = green(c1) && red(c2) && c2.close < c1.open && c2.open > c1.close;
  if (bearEngulf && red(c3) && c3.close < c2.close) return mkR(c, i, "short", c2.high + 0.3 * a[i], 0.73, "Three Outside Down confirmed");
  return makeSignal({ reason: "No three-outside pattern" });
}
