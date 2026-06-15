import { Candle, Signal, makeSignal, sma, atr, swingHighs, swingLows } from "../indicators";

export function channelBreakout(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 5), sl = swingLows(c, 5);
  const highs: number[] = [], lows: number[] = [];
  for (let k = c.length - 50; k < c.length; k++) {
    if (sh[k] !== null) highs.push(sh[k] as number);
    if (sl[k] !== null) lows.push(sl[k] as number);
  }
  if (highs.length < 2 || lows.length < 2) return makeSignal({ reason: "No clear channel" });
  const upper = Math.max(...highs), lower = Math.min(...lows);
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  // Kanal genişliği makul mü (en az 2 ATR)
  if (upper - lower < a[i] * 2) return makeSignal({ reason: "Channel too tight" });
  if (cur.close > upper && prev.close <= upper && cur.volume > avgV * 1.3) {
    const sl2 = upper - a[i], r = cur.close - sl2;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl2, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.73, reason: "Channel breakout UP + volume" });
  }
  if (cur.close < lower && prev.close >= lower && cur.volume > avgV * 1.3) {
    const sl2 = lower + a[i], r = sl2 - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl2, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.73, reason: "Channel breakdown DOWN + volume" });
  }
  return makeSignal({ reason: "Price inside channel" });
}
