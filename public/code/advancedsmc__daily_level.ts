import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function dailyLevel(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  // Önceki 24-mum bloğunun H/L = günlük seviye
  const prevDay = c.slice(i - 48, i - 24), pdh = Math.max(...prevDay.map((x) => x.high)), pdl = Math.min(...prevDay.map((x) => x.low));
  if (Math.abs(cur.low - pdl) < a[i] * 0.6 && cur.close > cur.open) return mkA(c, i, "long", pdl - a[i] * 0.5, [cur.close + a[i] * 2, cur.close + a[i] * 4], 0.69, "Bounce off previous-day low (PDL)");
  if (Math.abs(cur.high - pdh) < a[i] * 0.6 && cur.close < cur.open) return mkA(c, i, "short", pdh + a[i] * 0.5, [cur.close - a[i] * 2, cur.close - a[i] * 4], 0.69, "Rejection at previous-day high (PDH)");
  return makeSignal({ reason: "Not at daily level" });
}
