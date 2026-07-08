import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function demandZone(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  for (let k = i - 3; k >= i - 14 && k >= 2; k--) {
    const rise = c[k + 1].close - c[k].close;
    if (rise > a[i] * 1.5) {
      const bot = Math.min(c[k].low, c[k - 1].low), top = Math.max(c[k].open, c[k].close);
      if (c[i].low <= top && c[i].low >= bot && c[i].close > c[i].open) return mkA(c, i, "long", bot - a[i] * 0.5, [c[i].close + (top - bot) * 2, c[i].close + (top - bot) * 4], 0.71, "Demand zone retest bounce");
    }
  }
  return makeSignal({ reason: "No demand zone retest" });
}
