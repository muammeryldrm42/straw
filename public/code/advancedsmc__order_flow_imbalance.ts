import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function orderFlowImbalance(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // 3 ardışık güçlü tek-yön mum (delta proxy: gövde/range + hacim)
  const last3 = c.slice(i - 2, i + 1);
  const allGreen = last3.every((x) => x.close > x.open && Math.abs(x.close - x.open) > (x.high - x.low) * 0.6);
  const allRed = last3.every((x) => x.close < x.open && Math.abs(x.close - x.open) > (x.high - x.low) * 0.6);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  const volRising = last3.every((x) => x.volume > avgV);
  if (allGreen && volRising) return mkA(c, i, "long", Math.min(...last3.map((x) => x.low)) - a[i] * 0.5, [c[i].close + a[i] * 2, c[i].close + a[i] * 3.5], 0.7, "Bullish order-flow imbalance (3 strong green + volume)");
  if (allRed && volRising) return mkA(c, i, "short", Math.max(...last3.map((x) => x.high)) + a[i] * 0.5, [c[i].close - a[i] * 2, c[i].close - a[i] * 3.5], 0.7, "Bearish order-flow imbalance (3 strong red + volume)");
  return makeSignal({ reason: "Balanced order flow" });
}
