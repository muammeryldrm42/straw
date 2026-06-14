import { Candle, Signal, makeSignal, atr, sma } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};
const range = (c: Candle[], s: number, e: number) => {
  const w = c.slice(s, e + 1);
  return { hi: Math.max(...w.map((x) => x.high)), lo: Math.min(...w.map((x) => x.low)) };
};

export function accumulation(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo, hi } = range(c, i - 30, i - 1);
  const tight = (hi - lo) < a[i] * 6; // dar konsolidasyon = birikim
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  if (tight && c[i].close > hi && c[i].volume > avgV * 1.3) return mk(c, i, "long", lo, [c[i].close + (hi - lo), c[i].close + (hi - lo) * 2], 0.71, "Accumulation range breakout (markup phase)");
  return makeSignal({ reason: "No accumulation breakout" });
}
