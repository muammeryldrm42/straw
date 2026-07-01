import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function turtleSoup(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const win = c.slice(i - 20, i), hi20 = Math.max(...win.map((x) => x.high)), lo20 = Math.min(...win.map((x) => x.low));
  // 20-bar low'un altına kırıp aynı mumda geri kapanır = turtle soup long
  if (cur.low < lo20 && cur.close > lo20 && cur.close > cur.open) return mkA(c, i, "long", cur.low - a[i] * 0.5, [hi20 * 0.5 + cur.close * 0.5, hi20], 0.71, "Turtle Soup: failed 20-bar low breakout");
  if (cur.high > hi20 && cur.close < hi20 && cur.close < cur.open) return mkA(c, i, "short", cur.high + a[i] * 0.5, [lo20 * 0.5 + cur.close * 0.5, lo20], 0.71, "Turtle Soup: failed 20-bar high breakout");
  return makeSignal({ reason: "No turtle soup setup" });
}
