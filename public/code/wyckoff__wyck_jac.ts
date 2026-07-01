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

export function jumpAcrossCreek(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { hi, lo } = range(c, i - 30, i - 2);
  // Önceki bar dirençi kırdı, bu bar geri test edip tutuyor (backup to the creek)
  const brokeRecently = c.slice(i - 4, i).some((x) => x.close > hi);
  if (brokeRecently && c[i].low <= hi + a[i] && c[i].close > hi && c[i].close > c[i].open) return mk(c, i, "long", hi - a[i] * 1.5, [c[i].close + (hi - lo) * 0.5, c[i].close + (hi - lo)], 0.71, "Jump Across the Creek (breakout + backup hold)");
  return makeSignal({ reason: "No creek jump" });
}
