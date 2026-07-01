import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function eqSweep(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const a = atr(c, 14), tol = a[a.length - 1] * 0.15;
  const rh = swingHighs(c, 5).filter((v): v is number => v !== null).slice(-10);
  const rl = swingLows(c, 5).filter((v): v is number => v !== null).slice(-10);
  let eqh: number | null = null, eql: number | null = null;
  for (let i = 0; i < rh.length - 1; i++) for (let j = i + 1; j < rh.length; j++) if (Math.abs(rh[i] - rh[j]) <= tol) eqh = Math.max(rh[i], rh[j]);
  for (let i = 0; i < rl.length - 1; i++) for (let j = i + 1; j < rl.length; j++) if (Math.abs(rl[i] - rl[j]) <= tol) eql = Math.min(rl[i], rl[j]);
  const cur = c[c.length - 1], prev = c[c.length - 2];
  if (eql !== null && prev.low < eql && prev.close > eql && cur.close > cur.open) {
    const slv = prev.low - 0.3 * a[a.length - 1], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.76, reason: `EQL sweep @ ${eql.toFixed(2)}` });
  }
  if (eqh !== null && prev.high > eqh && prev.close < eqh && cur.close < cur.open) {
    const slv = prev.high + 0.3 * a[a.length - 1], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.76, reason: `EQH sweep @ ${eqh.toFixed(2)}` });
  }
  return makeSignal({ reason: "EQH/EQL sweep yok" });
}
