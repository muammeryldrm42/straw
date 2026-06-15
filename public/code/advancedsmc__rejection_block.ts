import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function rejectionBlock(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const lowerWick = Math.min(cur.open, cur.close) - cur.low, upperWick = cur.high - Math.max(cur.open, cur.close);
  const bodyS = Math.abs(cur.close - cur.open);
  if (lowerWick > bodyS * 2 && lowerWick > a[i] && cur.close > cur.open) return mkA(c, i, "long", cur.low - a[i] * 0.3, [cur.close + lowerWick, cur.close + lowerWick * 2], 0.69, "Bullish rejection block (long lower wick)");
  if (upperWick > bodyS * 2 && upperWick > a[i] && cur.close < cur.open) return mkA(c, i, "short", cur.high + a[i] * 0.3, [cur.close - upperWick, cur.close - upperWick * 2], 0.69, "Bearish rejection block (long upper wick)");
  return makeSignal({ reason: "No rejection block" });
}
