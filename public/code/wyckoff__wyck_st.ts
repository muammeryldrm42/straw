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

export function secondaryTest(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo, hi } = range(c, i - 25, i - 1);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  // Destek bölgesini düşük hacimle test edip tutması = ikincil test
  if (Math.abs(c[i].low - lo) < a[i] * 0.6 && c[i].low >= lo - a[i] * 0.3 && c[i].volume < avgV * 0.8 && c[i].close > c[i].open) return mk(c, i, "long", lo - a[i], [(lo + hi) / 2, hi], 0.7, "Secondary Test (low-volume support retest)");
  if (Math.abs(c[i].high - hi) < a[i] * 0.6 && c[i].high <= hi + a[i] * 0.3 && c[i].volume < avgV * 0.8 && c[i].close < c[i].open) return mk(c, i, "short", hi + a[i], [(lo + hi) / 2, lo], 0.7, "Secondary Test (low-volume resistance retest)");
  return makeSignal({ reason: "No secondary test" });
}
