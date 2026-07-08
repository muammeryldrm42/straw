import { Candle, Signal, makeSignal, ema, sma, macd, atr } from "../indicators";

export function emaRibbon(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const e8 = ema(closes, 8), e13 = ema(closes, 13), e21 = ema(closes, 21), e34 = ema(closes, 34), e55 = ema(closes, 55);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const up = e8[i] > e13[i] && e13[i] > e21[i] && e21[i] > e34[i] && e34[i] > e55[i];
  const down = e8[i] < e13[i] && e13[i] < e21[i] && e21[i] < e34[i] && e34[i] < e55[i];
  // Yeni hizalanma mı? (önceki mumda tam hizalı değildi)
  const upPrev = e8[i-1] > e13[i-1] && e13[i-1] > e21[i-1] && e21[i-1] > e34[i-1] && e34[i-1] > e55[i-1];
  const downPrev = e8[i-1] < e13[i-1] && e13[i-1] < e21[i-1] && e21[i-1] < e34[i-1] && e34[i-1] < e55[i-1];
  if (up && cur.close > e8[i]) {
    const sl = e34[i] - 0.5 * a[i], r = cur.close - sl;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: upPrev ? 0.72 : 0.78, reason: upPrev ? "EMA ribbon bullish (aligned)" : "EMA ribbon NEW bullish alignment" });
  }
  if (down && cur.close < e8[i]) {
    const sl = e34[i] + 0.5 * a[i], r = sl - cur.close;
    if (r > 0) return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: downPrev ? 0.72 : 0.78, reason: downPrev ? "EMA ribbon bearish (aligned)" : "EMA ribbon NEW bearish alignment" });
  }
  return makeSignal({ reason: "EMA ribbon not aligned (chop)" });
}
