import { Candle, Signal, makeSignal, rsi, atr, sma } from "../indicators";

export function rangeBounce(c: Candle[]): Signal {
  if (c.length < 35) return makeSignal({ reason: "Insufficient data" });
  const rng = c.slice(-30);
  const rH = Math.max(...rng.map((x) => x.high)), rL = Math.min(...rng.map((x) => x.low));
  const size = rH - rL;
  const a = atr(c, 14), ai = a.length - 1;
  // Dar range olmalı (ATR'nin 6 katından az)
  if (size / a[ai] > 6) return makeSignal({ reason: "Range too wide (trend exists)" });
  const cur = c[c.length - 1], prev = c[c.length - 2];
  const tol = size * 0.1;
  // Alt sınırdan bounce - long
  if (cur.low <= rL + tol && cur.close > cur.open && prev.low <= rL + tol * 2) {
    const sl = rL - 0.5 * a[ai], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [(rH + rL) / 2, rH - tol], confidence: 0.68, reason: `Range lower bounce @ ${rL.toFixed(2)}` });
  }
  // Üst sınırdan rejection - short
  if (cur.high >= rH - tol && cur.close < cur.open && prev.high >= rH - tol * 2) {
    const sl = rH + 0.5 * a[ai], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [(rH + rL) / 2, rL + tol], confidence: 0.68, reason: `Range upper rejection @ ${rH.toFixed(2)}` });
  }
  return makeSignal({ reason: "Not at range edge" });
}
