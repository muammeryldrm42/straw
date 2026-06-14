import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function liquidityGrabBos(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 10).filter((v): v is number => v !== null);
  const sl = swingLows(c, 10).filter((v): v is number => v !== null);
  if (sh.length < 2 || sl.length < 2) return makeSignal({ reason: "No clean structure" });
  const a = atr(c, 14);
  const cur = c[c.length - 1], prev = c[c.length - 2];
  const lastH = sh[sh.length - 1], lastL = sl[sl.length - 1];
  if (prev.low < lastL && prev.close > lastL && cur.close > lastH) {
    const slv = prev.low - 0.3 * a[a.length - 1], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.82, reason: "Liquidity grab + BOS up" });
  }
  if (prev.high > lastH && prev.close < lastH && cur.close < lastL) {
    const slv = prev.high + 0.3 * a[a.length - 1], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.82, reason: "Liquidity grab + BOS down" });
  }
  return makeSignal({ reason: "LG+BOS kurulumu yok" });
}
