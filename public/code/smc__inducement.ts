import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function inducement(c: Candle[]): Signal {
  if (c.length < 24) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 8).filter((v): v is number => v !== null);
  const sl = swingLows(c, 8).filter((v): v is number => v !== null);
  if (sh.length < 2 || sl.length < 2) return makeSignal({ reason: "No structure" });
  const a = atr(c, 14), cur = c[c.length - 1], last3 = c.slice(-4, -1);
  const lastL = sl[sl.length - 1], lastH = sh[sh.length - 1];
  const wickBelow = last3.some((x) => x.low < lastL && x.close > lastL);
  const max3 = Math.max(...last3.map((x) => x.high));
  if (wickBelow && cur.close > cur.open && cur.close > max3) {
    const min3 = Math.min(...last3.map((x) => x.low)), slv = min3 - 0.3 * a[a.length - 1], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.7, reason: "Bullish inducement" });
  }
  const wickAbove = last3.some((x) => x.high > lastH && x.close < lastH);
  const min3 = Math.min(...last3.map((x) => x.low));
  if (wickAbove && cur.close < cur.open && cur.close < min3) {
    const max3b = Math.max(...last3.map((x) => x.high)), slv = max3b + 0.3 * a[a.length - 1], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.7, reason: "Bearish inducement" });
  }
  return makeSignal({ reason: "Inducement kurulumu yok" });
}
