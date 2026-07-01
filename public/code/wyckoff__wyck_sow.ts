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

export function signOfWeakness(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo } = range(c, i - 25, i - 1);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  if (c[i].close < lo && c[i].close < c[i].open && (c[i].open - c[i].close) > a[i] && c[i].volume > avgV * 1.5) return mk(c, i, "short", lo + a[i], [c[i].close - a[i] * 2, c[i].close - a[i] * 4], 0.72, "Sign of Weakness (range breakdown + volume)");
  return makeSignal({ reason: "No SOW" });
}
