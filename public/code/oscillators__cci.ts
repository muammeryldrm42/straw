import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function cci(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 20;
  const tp = c.map((x) => (x.high + x.low + x.close) / 3);
  const smaTP = sma(tp, p);
  const i = c.length - 1, a = atr(c, 14);
  const slice = tp.slice(i - p + 1, i + 1);
  const mean = smaTP[i];
  const md = slice.reduce((s, v) => s + Math.abs(v - mean), 0) / p;
  if (md === 0) return makeSignal({ reason: "Flat" });
  const cciNow = (tp[i] - mean) / (0.015 * md);
  const prevSlice = tp.slice(i - p, i);
  const prevMean = smaTP[i - 1];
  const prevMd = prevSlice.reduce((s, v) => s + Math.abs(v - prevMean), 0) / p;
  const cciPrev = prevMd ? (tp[i - 1] - prevMean) / (0.015 * prevMd) : 0;
  const cur = c[i];
  if (cciPrev < -100 && cciNow > -100) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.71, reason: `CCI back above -100 (${cciNow.toFixed(0)})` });
  }
  if (cciPrev > 100 && cciNow < 100) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.71, reason: `CCI back below +100 (${cciNow.toFixed(0)})` });
  }
  return makeSignal({ reason: `CCI ${cciNow.toFixed(0)} (no cross)` });
}
