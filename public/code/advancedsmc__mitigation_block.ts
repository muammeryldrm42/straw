import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function mitigationBlock(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  for (let k = i - 2; k >= i - 12 && k >= 1; k--) {
    const impulse = c[k + 1].close - c[k + 1].open;
    if (c[k].close < c[k].open && impulse > a[i] * 1.2) { // bullish mitigation block (down candle before up impulse)
      const top = c[k].high, bot = c[k].low;
      if (c[i].low <= top && c[i].low >= bot && c[i].close > c[i].open) return mkA(c, i, "long", bot - a[i] * 0.5, [c[i].close + (top - bot) * 2, c[i].close + (top - bot) * 3], 0.71, "Bullish mitigation block retest");
    }
    if (c[k].close > c[k].open && impulse < -a[i] * 1.2) {
      const top = c[k].high, bot = c[k].low;
      if (c[i].high >= bot && c[i].high <= top && c[i].close < c[i].open) return mkA(c, i, "short", top + a[i] * 0.5, [c[i].close - (top - bot) * 2, c[i].close - (top - bot) * 3], 0.71, "Bearish mitigation block retest");
    }
  }
  return makeSignal({ reason: "No mitigation block" });
}
