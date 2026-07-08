import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function ladderEntry(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i], win = c.slice(i - 40, i);
  const lo = Math.min(...win.map((x) => x.low)), hi = Math.max(...win.map((x) => x.high));
  const support = lo + (hi - lo) * 0.236; // alt ladder seviyesi
  if (Math.abs(cur.low - support) < a[i] * 0.7 && cur.close > cur.open) return mk(c, i, "long", a, 0.69, "Ladder entry at lower support tier", 2.5, [1.5, 3, 5]);
  const resistance = hi - (hi - lo) * 0.236;
  if (Math.abs(cur.high - resistance) < a[i] * 0.7 && cur.close < cur.open) return mk(c, i, "short", a, 0.69, "Ladder entry at upper resistance tier", 2.5, [1.5, 3, 5]);
  return makeSignal({ reason: "Not at a ladder tier" });
}
