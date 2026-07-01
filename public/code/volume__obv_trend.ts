import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function obvTrend(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const obv: number[] = [0];
  for (let k = 1; k < c.length; k++) {
    if (c[k].close > c[k - 1].close) obv.push(obv[k - 1] + c[k].volume);
    else if (c[k].close < c[k - 1].close) obv.push(obv[k - 1] - c[k].volume);
    else obv.push(obv[k - 1]);
  }
  const obvEma = ema(obv, 20);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const closeEma = ema(c.map((x) => x.close), 20);
  if (obv[i - 1] <= obvEma[i - 1] && obv[i] > obvEma[i] && cur.close > closeEma[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.72, reason: "OBV crossed above its EMA + uptrend" });
  }
  if (obv[i - 1] >= obvEma[i - 1] && obv[i] < obvEma[i] && cur.close < closeEma[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.72, reason: "OBV crossed below its EMA + downtrend" });
  }
  return makeSignal({ reason: "No OBV cross" });
}
