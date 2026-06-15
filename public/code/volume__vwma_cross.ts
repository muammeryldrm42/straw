import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function vwmaCross(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 20;
  const vwma = (end: number) => {
    let num = 0, den = 0;
    for (let k = end - p + 1; k <= end; k++) { num += c[k].close * c[k].volume; den += c[k].volume; }
    return den === 0 ? c[end].close : num / den;
  };
  const closes = c.map((x) => x.close);
  const smaArr = sma(closes, p);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const vNow = vwma(i), vPrev = vwma(i - 1);
  // VWMA, SMA üstüne çıkarsa = hacim fiyatı destekliyor
  if (vPrev <= smaArr[i - 1] && vNow > smaArr[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "VWMA crossed above SMA (volume-backed)" });
  }
  if (vPrev >= smaArr[i - 1] && vNow < smaArr[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "VWMA crossed below SMA (volume-backed)" });
  }
  return makeSignal({ reason: "No VWMA/SMA cross" });
}
