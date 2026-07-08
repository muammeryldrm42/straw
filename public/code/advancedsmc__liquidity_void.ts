import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function liquidityVoid(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // Geniş gövdeli mum sonrası boşluk: c[i-2].high < c[i].low (bullish void)
  for (let k = i - 1; k >= i - 8 && k >= 2; k--) {
    if (c[k - 2].high < c[k].low) { // bullish void
      const voidMid = (c[k - 2].high + c[k].low) / 2;
      if (c[i].low <= voidMid && c[i].close > c[i].open) return mkA(c, i, "long", c[k - 2].high - a[i], [c[i].close + (c[i].close - c[k - 2].high), c[k].high], 0.71, "Bullish liquidity void fill");
    }
    if (c[k - 2].low > c[k].high) { // bearish void
      const voidMid = (c[k - 2].low + c[k].high) / 2;
      if (c[i].high >= voidMid && c[i].close < c[i].open) return mkA(c, i, "short", c[k - 2].low + a[i], [c[i].close - (c[k - 2].low - c[i].close), c[k].low], 0.71, "Bearish liquidity void fill");
    }
  }
  return makeSignal({ reason: "No liquidity void" });
}
