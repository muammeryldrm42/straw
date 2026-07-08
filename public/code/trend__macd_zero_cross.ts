import { Candle, Signal, makeSignal, ema, sma, macd, atr } from "../indicators";

export function macdZeroCross(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const m = macd(closes, 12, 26, 9);
  const e200 = ema(closes, 200 > c.length ? Math.floor(c.length / 2) : 200);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  // MACD line önceki mumda <0, şimdi >0 = bullish zero cross
  const bullCross = m.macd[i - 1] <= 0 && m.macd[i] > 0;
  const bearCross = m.macd[i - 1] >= 0 && m.macd[i] < 0;
  if (bullCross && cur.close > e200[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.74, reason: "MACD zero-line cross UP + above EMA200" });
  }
  if (bearCross && cur.close < e200[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.74, reason: "MACD zero-line cross DOWN + below EMA200" });
  }
  return makeSignal({ reason: "No MACD zero-line cross" });
}
