import { Candle, Signal, makeSignal, rsi, sma, atr, bollingerBands } from "../indicators";

export function rsiExtreme(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 14);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  // RSI <20 + dönüş mumu
  if (rs[i] < 20 && cur.close > cur.open && cur.close > c[i - 1].close) {
    const sl = cur.low - 0.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.74, reason: `RSI extreme ${rs[i].toFixed(0)} + bullish reversal` });
  }
  // RSI >80 + dönüş mumu
  if (rs[i] > 80 && cur.close < cur.open && cur.close < c[i - 1].close) {
    const sl = cur.high + 0.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.74, reason: `RSI extreme ${rs[i].toFixed(0)} + bearish reversal` });
  }
  return makeSignal({ reason: `RSI ${rs[i]?.toFixed(0)} - not extreme` });
}
