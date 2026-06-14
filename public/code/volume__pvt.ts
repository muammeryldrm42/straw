import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function pvt(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const pvtArr: number[] = [0];
  for (let k = 1; k < c.length; k++) {
    const chg = (c[k].close - c[k - 1].close) / c[k - 1].close;
    pvtArr.push(pvtArr[k - 1] + chg * c[k].volume);
  }
  const pvtEma = ema(pvtArr, 14);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (pvtArr[i - 1] <= pvtEma[i - 1] && pvtArr[i] > pvtEma[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: "PVT crossed above its EMA" });
  }
  if (pvtArr[i - 1] >= pvtEma[i - 1] && pvtArr[i] < pvtEma[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: "PVT crossed below its EMA" });
  }
  return makeSignal({ reason: "No PVT cross" });
}
