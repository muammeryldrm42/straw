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

export function nr7(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1];
  const last7 = c.slice(i - 7, i);
  const isNR7 = rng(prev) === Math.min(...last7.map(rng));
  if (isNR7 && c[i].close > prev.high) return mkPA(c, i, "long", prev.low - 0.3 * a[i], 0.71, "NR7 breakout up (strong contraction)");
  if (isNR7 && c[i].close < prev.low) return mkPA(c, i, "short", prev.high + 0.3 * a[i], 0.71, "NR7 breakdown (strong contraction)");
  return makeSignal({ reason: "No NR7 break" });
}
