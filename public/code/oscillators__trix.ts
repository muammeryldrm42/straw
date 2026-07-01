import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function trix(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const e1 = ema(closes, 15), e2 = ema(e1, 15), e3 = ema(e2, 15);
  const trixLine = e3.map((v, i) => (i > 0 && e3[i - 1] ? ((v - e3[i - 1]) / e3[i - 1]) * 100 : 0));
  const sig = ema(trixLine, 9);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (trixLine[i - 1] <= sig[i - 1] && trixLine[i] > sig[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "TRIX bullish signal cross" });
  }
  if (trixLine[i - 1] >= sig[i - 1] && trixLine[i] < sig[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "TRIX bearish signal cross" });
  }
  return makeSignal({ reason: "No TRIX cross" });
}
