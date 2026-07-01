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

export function trapBar(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const win = c.slice(i - 10, i), recentHigh = Math.max(...win.map((x) => x.high)), recentLow = Math.min(...win.map((x) => x.low));
  // Recent low'u kırıp güçlü geri kapanış = bear trap (long)
  if (cur.low < recentLow && cur.close > recentLow && body(cur) > a[i] && green(cur)) return mkPA(c, i, "long", cur.low - 0.3 * a[i], 0.71, "Bear trap (stop-run below support)");
  if (cur.high > recentHigh && cur.close < recentHigh && body(cur) > a[i] && red(cur)) return mkPA(c, i, "short", cur.high + 0.3 * a[i], 0.71, "Bull trap (stop-run above resistance)");
  return makeSignal({ reason: "No trap bar" });
}
