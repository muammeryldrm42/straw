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

export function upthrust(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo, hi } = range(c, i - 25, i - 1);
  if (c[i].high > hi && c[i].close < hi && c[i].close < c[i].open) return mk(c, i, "short", c[i].high + a[i] * 0.5, [(lo + hi) / 2, lo], 0.73, "Wyckoff Upthrust (false break above resistance, rejected)");
  return makeSignal({ reason: "No upthrust" });
}
