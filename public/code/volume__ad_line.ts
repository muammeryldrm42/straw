import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function adLine(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const ad: number[] = [];
  let cum = 0;
  for (let k = 0; k < c.length; k++) {
    const rng = c[k].high - c[k].low;
    const mfm = rng === 0 ? 0 : ((c[k].close - c[k].low) - (c[k].high - c[k].close)) / rng;
    cum += mfm * c[k].volume;
    ad.push(cum);
  }
  const adEma = ema(ad, 21);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (ad[i - 1] <= adEma[i - 1] && ad[i] > adEma[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "A/D line turned up (accumulation)" });
  }
  if (ad[i - 1] >= adEma[i - 1] && ad[i] < adEma[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "A/D line turned down (distribution)" });
  }
  return makeSignal({ reason: "No A/D cross" });
}
