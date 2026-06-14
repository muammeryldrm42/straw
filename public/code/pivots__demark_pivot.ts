import { Candle, Signal, makeSignal, atr } from "../indicators";

const mkP = (c: Candle[], i: number, side: "long" | "short", sl: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - sl <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && sl - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: sl, take_profit: tps, confidence: conf, reason });
};
function prevHLC(c: Candle[], window = 24) {
  const w = c.slice(-window - 1, -1);
  return { high: Math.max(...w.map((x) => x.high)), low: Math.min(...w.map((x) => x.low)), close: w[w.length - 1].close };
}

export function demarkPivot(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, prev = c[i - 1], cur = c[i];
  const { high, low, close } = prevHLC(c);
  let x: number;
  if (close < cur.open) x = high + 2 * low + close;
  else if (close > cur.open) x = 2 * high + low + close;
  else x = high + low + 2 * close;
  const pp = x / 4, r1 = x / 2 - low, s1 = x / 2 - high;
  if (cur.close > r1 && prev.close <= r1) return mkP(c, i, "long", pp, [r1 + (high - low) * 0.5], 0.68, "DeMark R1 breakout");
  if (cur.close < s1 && prev.close >= s1) return mkP(c, i, "short", pp, [s1 - (high - low) * 0.5], 0.68, "DeMark S1 breakdown");
  return makeSignal({ reason: "Between DeMark levels" });
}
