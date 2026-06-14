import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function supplyZone(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // Konsolidasyon sonrası güçlü düşüş = supply zone
  for (let k = i - 3; k >= i - 14 && k >= 2; k--) {
    const drop = c[k + 1].close - c[k].close;
    if (drop < -a[i] * 1.5) {
      const top = Math.max(c[k].high, c[k - 1].high), bot = Math.min(c[k].open, c[k].close);
      if (c[i].high >= bot && c[i].high <= top && c[i].close < c[i].open) return mkA(c, i, "short", top + a[i] * 0.5, [c[i].close - (top - bot) * 2, c[i].close - (top - bot) * 4], 0.71, "Supply zone retest rejection");
    }
  }
  return makeSignal({ reason: "No supply zone retest" });
}
