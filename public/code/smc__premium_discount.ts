import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function premiumDiscount(c: Candle[]): Signal {
  if (c.length < 80) return makeSignal({ reason: "Insufficient data" });
  const rng = c.slice(-50);
  const rH = Math.max(...rng.map((x) => x.high)), rL = Math.min(...rng.map((x) => x.low));
  const mid = (rH + rL) / 2, cur = c[c.length - 1], a = atr(c, 14);
  const ai = a.length - 1;
  const pct = (cur.close - rL) / (rH - rL); // 0..1
  // Discount zone (0-0.5): long
  if (pct < 0.3 && cur.close > cur.open) {
    const slv = rL - 0.3 * a[ai], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [mid, mid + (rH - mid) * 0.5, rH], confidence: 0.74, reason: `Discount zone @ ${(pct*100).toFixed(0)}%` });
  }
  // Premium zone (0.7-1): short
  if (pct > 0.7 && cur.close < cur.open) {
    const slv = rH + 0.3 * a[ai], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [mid, mid - (mid - rL) * 0.5, rL], confidence: 0.74, reason: `Premium zone @ ${(pct*100).toFixed(0)}%` });
  }
  return makeSignal({ reason: `Equilibrium zone @ ${(pct*100).toFixed(0)}%` });
}
