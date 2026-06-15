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

export function ladderBottom(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // 3 ardışık alçalan kırmızı, sonra üst fitilli kırmızı, sonra güçlü yeşil
  const r1 = c[i - 4], r2 = c[i - 3], r3 = c[i - 2], r4 = c[i - 1], g = c[i];
  if (red(r1) && red(r2) && red(r3) && r3.close < r2.close && r2.close < r1.close &&
      red(r4) && (r4.high - Math.max(r4.open, r4.close)) > body(r4) && green(g) && g.close > r4.open)
    return mkR(c, i, "long", r3.low - 0.4 * a[i], 0.69, "Ladder bottom reversal");
  return makeSignal({ reason: "No ladder bottom" });
}
