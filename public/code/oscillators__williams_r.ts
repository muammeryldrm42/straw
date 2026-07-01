import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function williamsR(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14;
  const wr = (idx: number) => {
    const win = c.slice(idx - p + 1, idx + 1);
    const hh = Math.max(...win.map((x) => x.high)), ll = Math.min(...win.map((x) => x.low));
    return hh === ll ? -50 : ((hh - c[idx].close) / (hh - ll)) * -100;
  };
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const now = wr(i), prev = wr(i - 1);
  if (prev < -80 && now > -80) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: `Williams %R exit oversold (${now.toFixed(0)})` });
  }
  if (prev > -20 && now < -20) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: `Williams %R exit overbought (${now.toFixed(0)})` });
  }
  return makeSignal({ reason: `Williams %R ${now.toFixed(0)}` });
}
