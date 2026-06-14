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

export function beltHold(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const closes = c.map((x) => x.close), r = rsi(closes, 14);
  const lowerWick = Math.min(cur.open, cur.close) - cur.low, upperWick = cur.high - Math.max(cur.open, cur.close);
  // Bullish belt: açılış = low (fitilsiz alt), uzun yeşil gövde, oversold
  if (green(cur) && lowerWick < rng(cur) * 0.05 && body(cur) > a[i] && r[i] < 40) return mkR(c, i, "long", cur.low - 0.3 * a[i], 0.69, "Bullish belt hold at oversold");
  if (red(cur) && upperWick < rng(cur) * 0.05 && body(cur) > a[i] && r[i] > 60) return mkR(c, i, "short", cur.high + 0.3 * a[i], 0.69, "Bearish belt hold at overbought");
  return makeSignal({ reason: "No belt hold" });
}
