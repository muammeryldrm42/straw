import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function fvgInversion(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  for (let k = i - 2; k >= i - 10 && k >= 2; k--) {
    // bullish FVG: c[k-2].high < c[k].low
    if (c[k - 2].high < c[k].low) {
      const top = c[k].low, bot = c[k - 2].high;
      // fiyat aşağı kırıp FVG'yi geçti -> inversion -> şimdi direnç -> short retest
      const broke = c.slice(k + 1, i).some((x) => x.close < bot);
      if (broke && c[i].high >= bot && c[i].high <= top && c[i].close < c[i].open) return mkA(c, i, "short", top + a[i], [c[i].close - (top - c[i].close) * 2], 0.7, "Bullish FVG inverted to resistance");
    }
    if (c[k - 2].low > c[k].high) {
      const bot = c[k].high, top = c[k - 2].low;
      const broke = c.slice(k + 1, i).some((x) => x.close > top);
      if (broke && c[i].low <= top && c[i].low >= bot && c[i].close > c[i].open) return mkA(c, i, "long", bot - a[i], [c[i].close + (c[i].close - bot) * 2], 0.7, "Bearish FVG inverted to support");
    }
  }
  return makeSignal({ reason: "No FVG inversion" });
}
