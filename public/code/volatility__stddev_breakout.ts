import { Candle, Signal, makeSignal, sma, ema, atr, bollingerBands } from "../indicators";

export function stdDevBreakout(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 20;
  const closes = c.map((x) => x.close);
  const stdAt = (end: number) => {
    const win = closes.slice(end - p + 1, end + 1);
    const m = win.reduce((a, b) => a + b, 0) / p;
    return Math.sqrt(win.reduce((s, v) => s + (v - m) ** 2, 0) / p);
  };
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const sNow = stdAt(i), sAvg = (stdAt(i - 1) + stdAt(i - 2) + stdAt(i - 3)) / 3;
  // Volatilite patlaması + yön
  if (sNow > sAvg * 1.5) {
    if (cur.close > cur.open && cur.close > c[i - 1].close) {
      const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
      return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: "Std-dev volatility expansion (up)" });
    }
    if (cur.close < cur.open && cur.close < c[i - 1].close) {
      const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: "Std-dev volatility expansion (down)" });
    }
  }
  return makeSignal({ reason: "No volatility expansion" });
}
