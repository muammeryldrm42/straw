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

export function matchingLow(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1], cur = c[i];
  const closes = c.map((x) => x.close), r = rsi(closes, 14);
  // İki kırmızı mum aynı close (destek), oversold
  if (red(prev) && red(cur) && Math.abs(prev.close - cur.close) / cur.close < 0.003 && r[i] < 40) return mkR(c, i, "long", cur.low - 0.5 * a[i], 0.68, "Matching low (support confirmed)");
  return makeSignal({ reason: "No matching low" });
}
