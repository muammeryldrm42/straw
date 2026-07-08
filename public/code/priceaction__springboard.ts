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

export function springboard(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), closes = c.map((x) => x.close), e = ema(closes, 21), cur = c[i];
  // Uptrend + EMA'ya geri çekilme + dönüş mumu
  if (e[i] > e[i - 10] && cur.low <= e[i] && cur.close > e[i] && green(cur)) return mkPA(c, i, "long", cur.low - 0.5 * a[i], 0.71, "Springboard: pullback to EMA in uptrend");
  if (e[i] < e[i - 10] && cur.high >= e[i] && cur.close < e[i] && red(cur)) return mkPA(c, i, "short", cur.high + 0.5 * a[i], 0.71, "Springboard: bounce to EMA in downtrend");
  return makeSignal({ reason: "No springboard setup" });
}
